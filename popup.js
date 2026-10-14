document.addEventListener("DOMContentLoaded", async () => {
    const $ = id => document.getElementById(id);
    const api = typeof browser !== "undefined" ? browser : null;
    const defaults = {
        version: 2, mode: "theme", colorOne: "#6a5acd", colorTwo: "#352359",
        position: "center center", fit: "cover", shade: 0, themeArtwork: true, image: ""
    };
    const positions = ["center center", "top center", "bottom center", "center left", "center right"];
    const colorPattern = /^#[0-9a-f]{6}$/i;
    const localRead = (key, fallback) => {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    };
    function validateBackground(value) {
        const raw = value && typeof value === "object" ? value : {};
        const next = { ...defaults };
        if (["theme", "solid", "gradient", "image"].includes(raw.mode)) next.mode = raw.mode;
        ["colorOne", "colorTwo"].forEach(key => { if (colorPattern.test(raw[key])) next[key] = raw[key]; });
        if (positions.includes(raw.position)) next.position = raw.position;
        if (["cover", "contain"].includes(raw.fit)) next.fit = raw.fit;
        if (Number.isFinite(Number(raw.shade))) next.shade = Math.max(0, Math.min(80, Number(raw.shade)));
        if (typeof raw.themeArtwork === "boolean") next.themeArtwork = raw.themeArtwork;
        if (typeof raw.image === "string" && /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(raw.image)) next.image = raw.image;
        // Previous builds saved this generated gradient as a default instead of following Firefox.
        if (!raw.version && raw.mode === "gradient" && raw.colorOne === "#152b46" && raw.colorTwo === "#352359") {
            next.mode = "theme";
            next.shade = 0;
        }
        if (!raw.position) {
            try {
                const alignment = localStorage.getItem("backgroundAlignment");
                if (positions.includes(alignment)) next.position = alignment;
            } catch { /* Extension storage can work even when DOM storage is disabled. */ }
        }
        return next;
    }
    function normalize(value) {
        if (typeof value !== "string" || !value.trim() || /\s/.test(value.trim())) throw new Error("Enter a valid website address.");
        const text = value.trim();
        const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : "https://" + text);
        if (!["http:", "https:"].includes(url.protocol) || !url.hostname) throw new Error("Use an http or https website link.");
        return url.href;
    }
    function validLinks(value) {
        return Array.isArray(value) ? [...new Set(value.flatMap(link => {
            try { return [normalize(link)]; } catch { return []; }
        }))] : [];
    }
    let shortcuts = [];
    let persistedShortcuts = [];
    let linkRevision = 0;
    let background = { ...defaults };
    let theme = {};
    let editing = false;
    let windowId;
    let pendingWrites = 0;
    let writeQueue = Promise.resolve();
    let extensionStorage = Boolean(api?.storage?.local);
    const darkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    function status(message, error = false) {
        $("status").textContent = message;
        $("status").classList.toggle("error", error);
    }
    function enqueueWrite(values) {
        pendingWrites++;
        const write = writeQueue.then(async () => {
            if (extensionStorage) await api.storage.local.set(values);
            else {
                Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
                const previous = localRead("shortcutFallbackKeys", []);
                const keys = Array.isArray(previous) ? previous : [];
                localStorage.setItem("shortcutFallbackKeys", JSON.stringify([...new Set([...keys, ...Object.keys(values)])]));
            }
        });
        writeQueue = write.catch(() => {});
        return write.finally(() => { pendingWrites--; });
    }
    async function loadState() {
        const legacy = { shortcuts: localRead("shortcuts", []), shortcutBackground: localRead("shortcutBackground", null) };
        const rawFallbackKeys = localRead("shortcutFallbackKeys", []);
        const fallbackKeys = Array.isArray(rawFallbackKeys) ? rawFallbackKeys : [];
        let stored = legacy;
        if (extensionStorage) {
            try {
                const extensionValues = await api.storage.local.get(["shortcuts", "shortcutBackground"]);
                stored = {
                    shortcuts: extensionValues.shortcuts === undefined || fallbackKeys.includes("shortcuts") ? legacy.shortcuts : extensionValues.shortcuts,
                    shortcutBackground: extensionValues.shortcutBackground === undefined || fallbackKeys.includes("shortcutBackground") ? legacy.shortcutBackground : extensionValues.shortcutBackground
                };
                const migration = {};
                if (extensionValues.shortcuts === undefined || fallbackKeys.includes("shortcuts")) migration.shortcuts = stored.shortcuts;
                if (extensionValues.shortcutBackground === undefined || fallbackKeys.includes("shortcutBackground")) migration.shortcutBackground = validateBackground(stored.shortcutBackground);
                if (Object.keys(migration).length) {
                    await api.storage.local.set(migration);
                    stored = { ...stored, ...migration };
                    try { localStorage.removeItem("shortcutFallbackKeys"); } catch { /* DOM storage is optional. */ }
                }
            } catch {
                extensionStorage = false;
                status("Extension storage is unavailable. Settings will use local browser storage.", true);
            }
        }
        shortcuts = validLinks(stored.shortcuts);
        persistedShortcuts = shortcuts;
        background = validateBackground(stored.shortcutBackground);
    }
    function cssColor(value) {
        const color = Array.isArray(value) ? "rgb(" + value.join(",") + ")" : value;
        return typeof color === "string" && CSS.supports("color", color) ? color : null;
    }
    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = colorCanvas.height = 1;
    const colorContext = colorCanvas.getContext("2d", { willReadFrequently: true });
    const systemPalette = document.createElement("span");
    systemPalette.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;color-scheme:light dark;background-color:Canvas;color:CanvasText";
    systemPalette.setAttribute("aria-hidden", "true");
    document.body.append(systemPalette);
    function rgb(color) {
        colorContext.clearRect(0, 0, 1, 1);
        colorContext.fillStyle = color;
        colorContext.fillRect(0, 0, 1, 1);
        return Array.from(colorContext.getImageData(0, 0, 1, 1).data).slice(0, 3);
    }
    function luminance(color) {
        const channels = rgb(color).map(channel => {
            const value = channel / 255;
            return value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4);
        });
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    }
    function textFor(color) { return luminance(color) > .3 ? "#17212f" : "#f6f7fb"; }
    function imageUrl(value) {
        if (typeof value !== "string") return null;
        try {
            const url = new URL(value);
            return ["https:", "http:", "moz-extension:", "resource:", "chrome:", "data:"].includes(url.protocol) ? "url(" + JSON.stringify(value) + ")" : null;
        } catch { return null; }
    }
    function applyBackground() {
        const colors = theme.colors || {};
        const fallbackBase = darkScheme.matches ? "#202124" : "#f9f9fb";
        const systemColors = getComputedStyle(systemPalette);
        const themeColor = cssColor(colors.popup) || cssColor(colors.toolbar) || cssColor(colors.frame);
        const themeBase = themeColor || cssColor(systemColors.backgroundColor) || fallbackBase;
        let base = background.mode === "theme" ? themeBase : background.colorOne;
        let image = "none";
        let hasArtwork = false;
        if (background.mode === "gradient") {
            image = "linear-gradient(135deg, " + background.colorOne + ", " + background.colorTwo + ")";
        } else if (background.mode === "image" && background.image) {
            image = imageUrl(background.image) || "none";
        } else if (background.mode === "theme" && background.themeArtwork) {
            const images = theme.images || {};
            const layers = [images.theme_frame, ...(images.additional_backgrounds || [])].map(imageUrl).filter(Boolean);
            if (layers.length) { image = layers.join(", "); hasArtwork = true; }
        }
        const wallpaper = $("backgroundLayer");
        wallpaper.style.backgroundColor = base;
        wallpaper.style.backgroundImage = image;
        wallpaper.style.backgroundSize = background.mode === "image" ? background.fit : "cover";
        wallpaper.style.backgroundPosition = background.position;
        $("shadeLayer").style.opacity = background.shade / 100;
        let paletteBase = base;
        if (background.mode === "gradient") {
            const one = rgb(background.colorOne), two = rgb(background.colorTwo);
            paletteBase = "rgb(" + one.map((channel, index) => Math.round((channel + two[index]) / 2)).join(",") + ")";
        }
        if (background.mode === "image" && background.image) paletteBase = "#202124";
        if (background.shade) {
            paletteBase = "rgb(" + rgb(paletteBase).map(channel => Math.round(channel * (1 - background.shade / 100))).join(",") + ")";
        }
        const themeText = cssColor(colors.popup_text) || cssColor(colors.toolbar_text) || cssColor(colors.tab_background_text) || (!themeColor ? cssColor(systemColors.color) : null);
        const ink = background.mode === "theme" && background.shade === 0 ? (themeText || textFor(paletteBase)) : textFor(paletteBase);
        const darkSurface = luminance(ink) > .5;
        const accent = background.mode === "theme" ? (cssColor(colors.popup_highlight) || cssColor(colors.toolbar_field_highlight) || "#6a5acd") : "#6a5acd";
        const vars = {
            "--base": base, "--ink": ink, "--accent": accent, "--accent-ink": textFor(accent),
            "--muted": darkSurface ? "#c5ccda" : "#455468",
            "--panel": darkSurface ? "rgba(22,28,40,.94)" : "rgba(250,251,253,.94)",
            "--field": darkSurface ? "rgba(11,17,29,.85)" : "rgba(255,255,255,.88)",
            "--tile": darkSurface ? "rgba(255,255,255,.14)" : "rgba(40,50,70,.09)",
            "--hover": darkSurface ? "rgba(255,255,255,.25)" : "rgba(100,110,140,.18)",
            "--border": darkSurface ? "rgba(255,255,255,.2)" : "rgba(40,50,70,.22)",
            "--error": darkSurface ? "#ffb4c1" : "#a51e39"
        };
        Object.entries(vars).forEach(([key, value]) => document.documentElement.style.setProperty(key, value));
        document.documentElement.style.colorScheme = darkSurface ? "dark" : "light";
        $("shadeValue").textContent = background.shade + "%";
        const notes = {
            theme: hasArtwork ? "Firefox theme colors and artwork, behind your icons." : "The background behind your icons follows Firefox's theme colors.",
            solid: "Your color fills the background behind the icons.",
            gradient: "Your two colors blend behind the icons.",
            image: background.image ? "Your photo is saved and shown behind the icons." : "Choose a photo to use behind the icons."
        };
        $("backgroundNote").textContent = notes[background.mode];
    }
    function syncBackground() {
        $("backgroundMode").value = background.mode;
        $("colorOneHex").value = background.colorOne;
        $("colorTwoHex").value = background.colorTwo;
        $("colorOnePreview").style.backgroundColor = background.colorOne;
        $("colorTwoPreview").style.backgroundColor = background.colorTwo;
        $("backgroundPosition").value = background.position;
        $("backgroundFit").value = background.fit;
        $("backgroundShade").value = background.shade;
        $("themeArtwork").checked = background.themeArtwork;
        $("themeControls").hidden = background.mode !== "theme";
        $("colorControls").hidden = !["solid", "gradient"].includes(background.mode);
        $("secondColorControls").hidden = background.mode !== "gradient";
        $("photoControls").hidden = background.mode !== "image";
        $("imagePositionControls").hidden = !["theme", "image"].includes(background.mode);
        $("removePhotoButton").hidden = !background.image;
        document.querySelectorAll("[data-color-target]").forEach(button => {
            button.setAttribute("aria-pressed", background[button.dataset.colorTarget].toLowerCase() === button.dataset.color);
        });
        applyBackground();
    }
    async function saveBackground(next, message = "Background saved.") {
        background = validateBackground(next);
        syncBackground();
        try { await enqueueWrite({ shortcutBackground: background }); status(message); return true; }
        catch { status("The background preview could not be saved. Check your browser storage and try again.", true); return false; }
    }
    async function refreshTheme() {
        if (!api?.theme?.getCurrent) { applyBackground(); return; }
        try {
            if (api.windows?.getCurrent) windowId = (await api.windows.getCurrent()).id;
            theme = await api.theme.getCurrent(windowId);
        } catch { theme = {}; }
        applyBackground();
    }
    function render() {
        $("buttonsContainer").replaceChildren();
        const query = editing ? $("searchInput").value.trim().toLowerCase() : "";
        const visible = shortcuts.filter(link => link.toLowerCase().includes(query));
        $("count").textContent = shortcuts.length;
        $("emptyState").hidden = visible.length > 0;
        $("emptyState").textContent = shortcuts.length ? "No shortcuts match your search." : (editing ? "Add a website below." : "Double-click to add shortcuts.");
        visible.forEach(link => {
            const host = new URL(link).hostname.replace(/^www\./, "");
            const wrapper = document.createElement("div");
            wrapper.className = "shortcut";
            const anchor = document.createElement("a");
            anchor.href = link; anchor.target = "_blank"; anchor.rel = "noopener noreferrer";
            anchor.title = link; anchor.setAttribute("aria-label", "Open " + host);
            const icon = document.createElement("img");
            icon.src = "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(host) + "&sz=32";
            icon.alt = "";
            icon.addEventListener("error", () => {
                const fallback = document.createElement("span");
                fallback.className = "fallback-icon"; fallback.textContent = host.slice(0, 1).toUpperCase();
                icon.replaceWith(fallback);
            }, { once: true });
            anchor.append(icon);
            const remove = document.createElement("button");
            remove.className = "remove-btn"; remove.textContent = "\u00d7"; remove.hidden = !editing;
            remove.setAttribute("aria-label", "Remove " + host);
            remove.addEventListener("click", () => persistLinks(shortcuts.filter(item => item !== link), "Shortcut removed."));
            wrapper.append(anchor, remove);
            $("buttonsContainer").append(wrapper);
        });
    }
    async function persistLinks(next, message) {
        const revision = ++linkRevision;
        shortcuts = next;
        render();
        try {
            await enqueueWrite({ shortcuts: next });
            persistedShortcuts = next;
            if (revision === linkRevision) status(message);
            return true;
        } catch {
            if (revision === linkRevision) { shortcuts = persistedShortcuts; render(); }
            status("Could not save links. Your browser storage may be full.", true);
            return false;
        }
    }
    function setEditing(show) {
        editing = show;
        document.body.classList.toggle("editing", editing);
        document.querySelectorAll("[data-editor]").forEach(element => { element.hidden = !editing; });
        render();
    }
    function inToolbarPopup() {
        try { return Boolean(api?.extension?.getViews({ type: "popup" }).includes(window)); } catch { return false; }
    }
    async function openEditor(section) {
        await writeQueue;
        if (api?.tabs?.create && api?.runtime?.getURL) {
            await api.tabs.create({ url: api.runtime.getURL("popup.html") + "#" + section });
        } else window.open("popup.html#" + section, "_blank", "noopener");
    }
    async function chooseFile(section, id) {
        if (inToolbarPopup()) {
            try { await openEditor(section); } catch { status("Could not open the editor tab. Try Keep editor open below.", true); }
        } else $(id).click();
    }
    async function photoData(file) {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error("Choose a PNG, JPEG or WebP photo smaller than 20 MB.");
        const image = await createImageBitmap(file);
        try {
            if (image.width * image.height > 60000000) throw new Error("Choose a photo with fewer than 60 million pixels.");
            const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext("2d");
            context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL("image/jpeg", .85);
        } finally { image.close(); }
    }

    await loadState();
    syncBackground(); render();
    await refreshTheme();
    $("searchInput").addEventListener("input", render);
    $("manageButton").addEventListener("click", () => setEditing(false));
    document.body.addEventListener("dblclick", event => {
        if (event.target.closest("a, button, input, textarea, select, label, summary")) return;
        setEditing(!editing);
    });
    document.body.addEventListener("keydown", event => {
        if (event.key === "Escape" && editing) { setEditing(false); document.body.focus(); }
        else if (event.key === "Enter" && event.target === document.body) { event.preventDefault(); setEditing(!editing); }
    });
    $("addForm").addEventListener("submit", async event => {
        event.preventDefault();
        try {
            const link = normalize($("siteNameInput").value);
            if (shortcuts.includes(link)) return status("That shortcut is already saved.");
            if (await persistLinks([...shortcuts, link], "Shortcut added.")) {
                $("siteNameInput").value = ""; $("searchInput").value = ""; render();
            }
        } catch (error) { status(error.message, true); }
    });
    $("backgroundMode").addEventListener("change", () => saveBackground({ ...background, mode: $("backgroundMode").value }));
    $("themeArtwork").addEventListener("change", () => saveBackground({ ...background, themeArtwork: $("themeArtwork").checked }));
    ["backgroundPosition", "backgroundFit", "backgroundShade"].forEach(id => {
        const key = { backgroundPosition: "position", backgroundFit: "fit", backgroundShade: "shade" }[id];
        $(id).addEventListener("input", () => saveBackground({ ...background, [key]: id === "backgroundShade" ? Number($(id).value) : $(id).value }));
        $(id).addEventListener("change", () => saveBackground({ ...background, [key]: id === "backgroundShade" ? Number($(id).value) : $(id).value }));
    });
    function chooseColor(key, value) {
        const trimmed = value.trim();
        if (!colorPattern.test(trimmed)) return false;
        saveBackground({ ...background, [key]: trimmed, mode: background.mode === "solid" && key === "colorOne" ? "solid" : "gradient" });
        return true;
    }
    document.querySelectorAll("[data-color-target]").forEach(button => {
        button.addEventListener("click", () => chooseColor(button.dataset.colorTarget, button.dataset.color));
    });
    ["colorOne", "colorTwo"].forEach(key => {
        const input = $(key + "Hex");
        input.addEventListener("input", () => { input.setAttribute("aria-invalid", !colorPattern.test(input.value.trim())); chooseColor(key, input.value); });
        input.addEventListener("change", () => {
            if (!chooseColor(key, input.value)) status("Use a six-digit hex color such as #6a5acd.", true);
        });
        input.addEventListener("blur", () => {
            if (!colorPattern.test(input.value.trim())) { input.value = background[key]; input.removeAttribute("aria-invalid"); }
        });
    });
    $("photoPickerButton").addEventListener("click", () => chooseFile("photo", "backgroundFile"));
    $("backgroundFile").addEventListener("change", async event => {
        const file = event.target.files[0];
        if (!file) return;
        $("photoPickerButton").disabled = true;
        status("Preparing your photo...");
        try {
            const image = await photoData(file);
            await saveBackground({ ...background, image, mode: "image" }, "Photo saved. Open the shortcut popup to see it there too.");
        } catch (error) { status(error.message || "This photo could not be read. Try another image.", true); }
        finally { $("photoPickerButton").disabled = false; event.target.value = ""; }
    });
    $("removePhotoButton").addEventListener("click", () => saveBackground({ ...background, image: "", mode: "theme" }, "Photo removed. Following Firefox again."));
    $("resetBackground").addEventListener("click", () => saveBackground({ ...defaults }, "Following Firefox's theme again."));
    $("openEditorButton").addEventListener("click", () => openEditor("edit").catch(() => status("Could not open the editor tab.", true)));
    $("exportButton").addEventListener("click", () => {
        const url = URL.createObjectURL(new Blob([shortcuts.join("\n") + (shortcuts.length ? "\n" : "")], { type: "text/plain;charset=utf-8" }));
        const anchor = document.createElement("a");
        anchor.href = url; anchor.download = "my-shortcuts-backup.txt";
        document.body.append(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        status("Text backup downloaded. One link per line.");
    });
    $("importFileButton").addEventListener("click", () => chooseFile("backup", "importFile"));
    $("importFile").addEventListener("change", async event => {
        const file = event.target.files[0];
        if (!file) return;
        cancelRestore();
        try {
            if (file.size > 1024 * 1024) throw new Error("Choose a text file smaller than 1 MB.");
            $("restoreText").value = await file.text(); $("fileName").textContent = file.name;
            status("File loaded. Choose a restore method, then Restore links.");
        } catch (error) { status(error.message, true); }
        finally { event.target.value = ""; }
    });
    let pendingRestore = null;
    function cancelRestore() { pendingRestore = null; $("replaceConfirmation").hidden = true; }
    async function restoreLinks(next, replacing) {
        cancelRestore();
        const message = replacing ? "Restored " + next.length + " shortcuts." : "Added " + (next.length - shortcuts.length) + " shortcuts. Duplicates skipped.";
        if (await persistLinks(next, message)) { $("searchInput").value = ""; render(); }
    }
    $("cancelRestoreButton").addEventListener("click", cancelRestore);
    $("confirmRestoreButton").addEventListener("click", () => { if (pendingRestore) restoreLinks(pendingRestore, true); });
    $("restoreText").addEventListener("input", cancelRestore);
    $("restoreMode").addEventListener("change", cancelRestore);
    $("restoreButton").addEventListener("click", async () => {
        cancelRestore();
        const lines = $("restoreText").value.split(/\r?\n/);
        const links = [], invalid = [];
        lines.forEach((line, index) => {
            if (!line.trim()) return;
            try { links.push(normalize(line)); } catch { invalid.push(index + 1); }
        });
        if (invalid.length) return status("Nothing restored. Fix link(s) on line: " + invalid.join(", ") + ".", true);
        if (!links.length) return status("Paste links or choose a text backup first.", true);
        const replacing = $("restoreMode").value === "replace";
        const next = [...new Set(replacing ? links : [...shortcuts, ...links])];
        if (replacing && shortcuts.length) {
            pendingRestore = next;
            $("replaceMessage").textContent = "Replace your " + shortcuts.length + " saved shortcuts with " + next.length + " links? Download a backup first to keep the old list.";
            $("replaceConfirmation").hidden = false;
            return;
        }
        await restoreLinks(next, replacing);
    });
    api?.theme?.onUpdated?.addListener(info => {
        if (info.windowId && windowId && info.windowId !== windowId) return;
        theme = info.theme || {};
        applyBackground();
    });
    api?.storage?.onChanged?.addListener((changes, area) => {
        if (area !== "local" || pendingWrites) return;
        if (changes.shortcutBackground) { background = validateBackground(changes.shortcutBackground.newValue); syncBackground(); }
        if (changes.shortcuts) { shortcuts = validLinks(changes.shortcuts.newValue); persistedShortcuts = shortcuts; render(); }
    });
    window.addEventListener("storage", event => {
        if (extensionStorage) return;
        if (event.key === "shortcutBackground") { background = validateBackground(localRead("shortcutBackground", null)); syncBackground(); }
        if (event.key === "shortcuts") { shortcuts = validLinks(localRead("shortcuts", [])); render(); }
    });
    darkScheme.addEventListener("change", () => refreshTheme());
    window.addEventListener("focus", () => refreshTheme());
    const section = location.hash.slice(1);
    if (["edit", "photo", "backup"].includes(section)) {
        document.body.classList.add("standalone");
        setEditing(true);
        if (section === "photo") {
            $("backgroundDetails").open = true;
            await saveBackground({ ...background, mode: "image" }, "Choose a photo below. This editor stays open while you select it.");
        } else if (section === "backup") $("backupDetails").open = true;
    }
    $("photoHint").textContent = inToolbarPopup() ? "Photo selection opens an editor tab so the file picker stays open." : "PNG, JPEG or WebP, up to 20 MB. Large photos are resized for storage.";
    $("openEditorButton").hidden = !inToolbarPopup();
    document.body.dataset.ready = "true";
});
