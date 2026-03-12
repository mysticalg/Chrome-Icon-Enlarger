# Big Favorites (Chrome Extension)

This extension provides a **large-icon launcher** for the bookmarks toolbar (favorites bar), shown directly on web pages with configurable position and styling.

> Chrome extensions cannot directly resize Chrome's built-in toolbar UI, so this provides an in-page launcher alternative with larger icons.

## Install (Developer Mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder (`Chrome-Icon-Enlarger`).
5. Pin **Big Favorites Bar** and click its toolbar button on any normal website tab.

## What it does

- Reads top-level items from your **Bookmarks Toolbar**.
- Renders bookmark icons with configurable scale and behavior.
- Uses Chrome's supported extension favicon endpoint (`/_favicon/`).
- Supports removing/reordering/adding toolbar bookmarks from the launcher.

## Permissions and review scope

- Uses extension API permissions only: `bookmarks`, `favicon`, `storage`, `activeTab`, and `scripting`.
- Does **not** request `<all_urls>` host permissions.
- Injects launcher code only into the current active tab when the user opens the extension popup.

## Files

- `manifest.json` – extension metadata and permissions.
- `popup.html` – popup UI layout.
- `popup.css` – popup styling.
- `popup.js` – settings UI and on-demand toolbar injection logic.
- `content-toolbar.css` – in-page toolbar styles.
- `content-toolbar.js` – in-page toolbar rendering and interactions.
- `background.js` – bookmark read/write operations via runtime messaging.
