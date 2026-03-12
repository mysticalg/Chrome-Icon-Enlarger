# Big Favorites (Chrome Extension)

This extension provides a **large-icon launcher** for the bookmarks toolbar (favorites bar): each favicon is shown at **32×32** (about 2× the native 16×16 size).

> Chrome extensions cannot directly resize Chrome's built-in toolbar UI, so this gives you a fast popup alternative with larger icons.

## Install (Developer Mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder (`Chrome-Icon-Enlarger`).
5. Pin **Big Favorites Bar** and click its toolbar button.

## What it does

- Reads top-level items from your **Bookmarks Toolbar**.
- Renders each with a large favicon tile and tooltip using Chrome's supported extension favicon endpoint (`/_favicon/`).
- Falls back to a local icon when a site has no favicon.
- Opens links in a new tab.

## Files

- `manifest.json` – extension metadata and permissions (no host permissions requested).
- `popup.html` – popup UI layout.
- `popup.css` – responsive popup styling with 2× icon sizing.
- `popup.js` – bookmark loading and rendering logic.

## Chrome Web Store review note

This extension intentionally runs only in the action popup and does **not** inject scripts into websites.
That keeps permissions scoped to the extension's single purpose: showing larger bookmark icons.
