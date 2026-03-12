const statusEl = document.getElementById('status');
const listEl = document.getElementById('bookmarkList');

/**
 * Build a favicon URL that is allowed inside extension pages.
 *
 * Why this endpoint?
 * - chrome://favicon2 cannot be relied on from MV3 extension popups.
 * - /_favicon/ is the supported extension endpoint when "favicon" permission is granted.
 */
function faviconUrl(pageUrl, size = 32) {
  const favicon = new URL(chrome.runtime.getURL('/_favicon/'));
  favicon.searchParams.set('pageUrl', pageUrl);
  favicon.searchParams.set('size', String(size));
  return favicon.toString();
}

/**
 * Local lightweight SVG fallback so users never see broken-image placeholders.
 */
function fallbackIconDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="#243348" stroke="#486283"/>
      <path d="M8 17.5h16M8 12.5h16M8 22.5h10" stroke="#9FB7D6" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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
  img.src = faviconUrl(bookmark.url, 32);

  // If a site has no favicon (or blocks retrieval), switch to a clean local fallback icon.
  img.addEventListener('error', () => {
    img.src = fallbackIconDataUrl();
  }, { once: true });

  const title = document.createElement('span');
  title.className = 'bookmark-title';
  title.textContent = bookmark.title || new URL(bookmark.url).hostname;

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
    if (!globalThis.chrome?.bookmarks || !globalThis.chrome?.runtime) {
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
