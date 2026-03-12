# Big Favorites (Chrome Extension)

This extension provides a **large-icon launcher** for the bookmarks toolbar (favorites bar): each favicon is shown at **32×32** (about 2× the native 16×16 size).

## Why this avoids Host Permission review delays

The extension no longer auto-injects scripts on `<all_urls>`.  
Instead, it runs in the action popup and can inject the in-page toolbar **only when you click the enable button** on the active tab.

That avoids broad host permissions while still giving you the in-page toolbar experience.

## Install (Developer Mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder (`Chrome-Icon-Enlarger`).
5. Pin **Big Favorites Bar** and click its toolbar button.

## What it does

- Reads top-level links from your **Bookmarks Toolbar**.
- Renders each bookmark as a large icon tile with a label and tooltip.
- Uses Chrome's extension favicon endpoint (`/_favicon/`) for fast icon loading.
- Lets you choose whether bookmark clicks open in the current tab or a new tab.
- Includes an **Enable in-page toolbar on this tab** button using `activeTab` + `scripting`.

## Files

- `manifest.json` – extension metadata and permissions (no host permissions requested).
- `popup.html` – popup UI layout.
- `popup.css` – popup styling and bookmark tile layout.
- `popup.js` – bookmark loading, settings persistence, open behavior, and on-demand toolbar injection.
- `content-toolbar.css` / `content-toolbar.js` – in-page toolbar visuals and logic.
- `background.js` – bookmark data broker for content toolbar operations.
