# Big Favorites (Chrome Extension)

This extension provides a **large-icon launcher** for the bookmarks toolbar (favorites bar): each favicon is shown at **32×32** (about 2× the native 16×16 size).

## Why this avoids Host Permission review delays

The extension now runs fully inside the action popup and does **not** inject scripts into websites.  
That means there are no host permissions such as `<all_urls>`, which helps avoid the "Due to the Host Permission" review warning.

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

## Files

- `manifest.json` – extension metadata and permissions (no host permissions requested).
- `popup.html` – popup UI layout.
- `popup.css` – popup styling and bookmark tile layout.
- `popup.js` – bookmark loading, settings persistence, and open behavior.
- `background.js` – background worker (kept for compatibility with bookmark message APIs).
