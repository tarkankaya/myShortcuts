# My Shortcuts 1.2.0 — Mozilla submission

## Upload

Run `./build-release.ps1` in PowerShell. Upload `release/my-shortcuts-1.2.0.zip` through [Mozilla Developer Hub](https://addons.mozilla.org/en-US/developers/) as a **new version of the existing My Shortcuts add-on**, rather than creating another listing.

- Existing listing: https://addons.mozilla.org/en-US/firefox/addon/my-shortcuts/
- Existing add-on ID: `{919c8338-a3dc-4e14-83cb-7c9632925379}`
- Published version checked before packaging: `1.1`
- New version: `1.2.0`
- Name: `My Shortcuts`
- Compatibility: Firefox Desktop 142 or later.
- License: retain the existing listing's **All Rights Reserved** license.

The ZIP is unsigned. Mozilla signs and distributes it after submission/review. It includes readable HTML, CSS and JavaScript; there is no compilation, minification, bundled framework, or separate build dependency for the extension. A separate source archive is not needed for this uncompiled package.

## Summary — paste into the listing

A compact shortcut launcher with theme-matched backgrounds, optional website icons, photo customization, and easy text-file backup and restore.

## Description — paste into the listing

Keep your favorite websites one click away in a clean, compact Firefox popup. My Shortcuts keeps the interface simple: your shortcut icons are the main view, and a double-click on empty space reveals the controls.

- Add and remove website shortcuts, with search while editing.
- Match Firefox's theme colors and optional artwork, or choose a solid color, gradient, or your own photo.
- Back up links to a plain text file with one URL per line, then restore by pasting text or choosing the file. Merge without duplicates or replace your list after confirmation.
- Use offline letter icons, or enable website icons through Firefox's optional consent prompt.
- Photos and settings stay in local extension storage. Photo selection and file import use an editor tab that stays open while choosing files.

Double-click empty space to edit. Double-click again, click Done, or press Escape to return to the minimal view. You can also open the add-on's Preferences/Options to use the persistent editor.

Website icons are optional and off by default. If enabled, Google receives the domains of displayed shortcuts to return their favicons, together with normal connection information. Full shortcut links, searches, and uploaded photos are not sent to the favicon service. You can revoke permission at any time.

## Release notes — paste into the version submission

Reworked the shortcut background to follow Firefox's colors and theme changes reliably. Added custom colors, gradients, saved photos, photo fitting and positioning, and adjustable darkening. Added plain-text backup/restore with merge, duplicate skipping, validation and inline replacement confirmation. Preserved the compact icon view and double-click editing. Settings now use extension storage with migration from earlier local storage. Website icon lookups now require optional consent and can be turned off.

## Privacy policy — paste into Mozilla's privacy-policy field

My Shortcuts saves shortcut links, background settings and selected photos in local extension storage. Photos are resized locally. The extension does not upload photos or backups, run analytics, or send data to the developer.

Website icons are off by default. Offline letter icons do not send shortcut domains anywhere. If you enable website icons and grant Firefox's optional browsing-activity permission, the extension requests favicons from Google's service using the hostname of each displayed saved shortcut. Full shortcut URLs, paths, query parameters, searches and photos are not included.

Google receives normal connection information, which can include IP address, browser/request information, and cookies allowed by browser settings. Google's handling of these requests is governed by its privacy policy.

Turn website icons off in edit controls or revoke the optional permission in Firefox's add-on settings. No new icon requests are made after permission is revoked. Browser/Google caches can retain previously requested icons.

Remove individual links, reset the background, remove a photo, or export links to a text file you control. Uninstalling removes extension storage; separately downloaded backup files remain where you saved them. Opening a shortcut navigates to that website normally, and that website's privacy policy applies. For questions, use the developer/support contact on the My Shortcuts Mozilla Add-ons listing.

## Reviewer notes — paste into Notes to Reviewers

This is an update to the existing My Shortcuts listing, preserving its add-on ID. The extension uses only the storage API permission and has no content scripts, background tracking, account login, analytics or remote executable code. It reads the Firefox theme but never changes it. All JavaScript and CSS are readable source files included in the package.

Optional data transmission is declared as required `none` plus optional `browsingActivity`. Google favicon requests are guarded by Firefox's granted data-collection permissions, not by a local checkbox alone. With no consent, the launcher renders letter icons without requests. Consent is requested only after the user opens Website icons and clicks Enable website icons in the persistent editor. Requests send only hostnames and suppress the referrer. Revoking permission re-renders offline icons and prevents new requests. The packaged privacy notice is available from Website icons.

To test:
1. Open the toolbar popup. Double-click empty space to enter editing.
2. Add `https://example.com/` and `https://mozilla.org/`. Click Done to check the compact launch view.
3. Double-click and expand Background. Verify Firefox theme colors, solid color swatches/hex input, and a two-color gradient.
4. Choose My photo and Choose photo. The toolbar popup opens an editor tab. Choose a local PNG, JPEG or WebP there, then adjust fit, position and darkening. Reopen the toolbar popup to check saved settings.
5. Expand Backup & restore, download a text backup, paste it back, and test merge and inline-confirmed replace. File import opens the persistent editor from the toolbar popup.
6. Expand Website icons. Initially there are no Google icon requests. Enable the optional feature and accept Firefox's prompt to see favicons. Turn it off, or revoke browsing-activity permission in Firefox settings, to restore offline icons.

No credentials or paid accounts are needed. This release targets Firefox Desktop; Android support is not claimed.

## Validation evidence

Validation output is saved in `release/validation.json`. Browser checks covered theme matching, colors, photos, persisted settings, double-click editing, backup/restore and optional icon consent. A disposable real Firefox profile verified add-on loading, actual theme updates, storage migration, and persisted manual color. Packaging checks verify the exact ZIP entries and SHA256.

## Mozilla references

- [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [Keeping the existing add-on identity when updating](https://extensionworkshop.com/documentation/develop/extensions-and-the-add-on-id/)
- [Data collection consent and declarations](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)
