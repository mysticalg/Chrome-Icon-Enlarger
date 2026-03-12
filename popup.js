const statusEl = document.getElementById('status');
const listEl = document.getElementById('bookmarkList');

/**
 * Build the favicon URL using Chrome's favicon service.
 * This keeps icon loading fast and avoids external requests.
 */
function faviconUrl(pageUrl) {
  return `chrome://favicon2/?size=64&scaleFactor=1x&pageUrl=${encodeURIComponent(pageUrl)}`;
}

/**
 * Render one bookmark tile with large icon and tooltip text.
 */
function renderBookmark(bookmark) {
  const li = document.createElement('li');
  li.className = 'bookmark-item';

  const a = document.createElement('a');
  a.className = 'bookmark-link';
  a.href = bookmark.url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.title = `${bookmark.title || bookmark.url}\n${bookmark.url}`;

  const img = document.createElement('img');
  img.className = 'bookmark-icon';
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.src = faviconUrl(bookmark.url);

  const title = document.createElement('span');
  title.className = 'bookmark-title';
  title.textContent = bookmark.title || bookmark.url;

  a.append(img, title);
  li.append(a);
  return li;
}

/**
 * Reads only top-level bookmarks from the bookmarks toolbar folder.
 */
async function loadToolbarBookmarks() {
  const toolbarItems = await chrome.bookmarks.getChildren('1');
  return toolbarItems.filter((item) => Boolean(item.url));
}

function showStatus(message) {
  statusEl.textContent = message;
}

async function init() {
  try {
    // Demo fallback helps local preview/screenshot in non-extension environments.
    if (!globalThis.chrome?.bookmarks) {
      const demo = [
        { title: 'GitHub', url: 'https://github.com' },
        { title: 'YouTube', url: 'https://youtube.com' },
      ];
      showStatus('Demo mode: load as a Chrome extension to read your real bookmarks.');
      listEl.replaceChildren(...demo.map(renderBookmark));
      return;
    }

    showStatus('Loading bookmarks…');
    const bookmarks = await loadToolbarBookmarks();

    if (bookmarks.length === 0) {
      showStatus('No bookmarks found on your bookmarks toolbar yet.');
      return;
    }

    listEl.replaceChildren(...bookmarks.map(renderBookmark));
    showStatus(`Showing ${bookmarks.length} bookmark${bookmarks.length === 1 ? '' : 's'} with 2× icons.`);
  } catch (error) {
    console.error(error);
    showStatus('Could not load bookmarks. Check extension permissions and try again.');
  }
}

init();
