# My Shortcuts

A compact Firefox launcher: just your link icons, with controls hidden until you double-click empty space. Double-click again, click **Done**, or press **Escape** to hide them. Pressing Enter with the popup background focused also opens editing.

## Background behind your icons

The extension styles its own HTML background. **Follow Firefox theme** is the default: it uses the theme's popup colors, matching text, and optional theme artwork. Built-in light and dark themes use Firefox's system colors. Theme changes update the launcher automatically. The extension reads the theme; it does not change Firefox's theme.

Double-click, expand **Background**, and choose:
- **One color:** select a swatch, enter a six-digit hex color, or click **Random color**.
- **Two-color gradient:** choose both colors independently or click **Random colors** to randomize both.
- **My photo:** click **Choose photo**. From the toolbar popup, an editor tab opens; click **Choose photo** there to select your file without the popup closing. Photos support PNG, JPEG, and WebP up to 20 MB and are resized to a maximum dimension of 1600 pixels for storage. Adjust fill/whole-photo fit, position, and darkening.
- **Follow Firefox theme:** return to automatic theme colors. Toggle artwork independently.

Colors use controls inside the page, avoiding native color dialogs that can dismiss Firefox's toolbar popup. Settings save automatically in extension storage and are shared between the launcher and editor tab. Existing links and backgrounds from older local-storage builds migrate automatically. The opening launcher is 380 pixels wide, at least 110 pixels tall, with the original 48-pixel icon buttons and spacing.

## Links and text backups

In edit mode, enter a website and press **+ Add** or Enter. Remove buttons appear on the shortcuts. Search filters links while editing.

Expand **Backup & restore** and click **Download .txt backup**. Your links are saved in order, one URL per line:
```text
https://youtube.com/
https://github.com/
```

Paste links or click **Choose .txt file** to load a backup in the persistent editor tab. **Add links** merges without duplicates. **Replace existing links** shows an inline confirmation before changing your list. Invalid lines leave your shortcuts untouched. Text backups contain links only; background settings and photos are saved separately in the extension.

## Load or update locally

In Firefox, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `manifest.json`. If this folder is already loaded, click **Reload** on its entry after changing the files. Version 1.2.0 requires Firefox 142 or later and requests the `storage` permission to save settings. Website icons are optional: double-click, expand **Website icons**, and grant Firefox's optional browsing-activity permission to use Google's favicon service. Offline letter icons make no favicon requests.

You can also open **Preferences/Options** for the add-on to use the persistent editor. Normal toolbar use keeps the minimal icon view.

Published listing: https://addons.mozilla.org/en-US/firefox/addon/my-shortcuts/

## Mozilla submission
Run `./build-release.ps1` in PowerShell to create the upload ZIP in `release/`. Upload it as a new version of the existing My Shortcuts listing. See [MOZILLA_SUBMISSION.md](MOZILLA_SUBMISSION.md) for listing copy, privacy text, and reviewer notes.
