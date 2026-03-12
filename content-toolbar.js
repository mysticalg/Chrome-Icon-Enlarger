/**
 * Lightweight in-page favorites toolbar.
 *
 * This appears at the top of web pages, which makes it effectively sit
 * right under Chrome's native toolbar/bookmarks bar area.
 */
(() => {
  if (window.top !== window) {
    return;
  }

  const ROOT_ID = 'big-favorites-inline-toolbar';

  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const root = document.createElement('aside');
  root.id = ROOT_ID;
  root.className = 'bf-toolbar';
  root.setAttribute('aria-label', 'Big Favorites in-page toolbar');

  const header = document.createElement('div');
  header.className = 'bf-toolbar__header';

  const title = document.createElement('strong');
  title.className = 'bf-toolbar__title';
  title.textContent = '⭐ Big Favorites';
  title.title = 'Fast bookmark launcher pinned to top of page';

  const help = document.createElement('span');
  help.className = 'bf-toolbar__help';
  help.textContent = 'Top-of-page launcher';
  help.title = 'Chrome cannot draw custom controls in native toolbar rows, so this is rendered inside each page.';

  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'bf-toolbar__toggle';
  collapseBtn.type = 'button';
  collapseBtn.textContent = 'Hide';
  collapseBtn.title = 'Collapse toolbar';

  header.append(title, help, collapseBtn);

  const status = document.createElement('p');
  status.className = 'bf-toolbar__status';
  status.textContent = 'Loading bookmarks…';

  const list = document.createElement('nav');
  list.className = 'bf-toolbar__list';
  list.setAttribute('aria-label', 'Bookmark shortcuts');

  root.append(header, status, list);
  document.documentElement.append(root);

  collapseBtn.addEventListener('click', () => {
    const collapsed = root.classList.toggle('is-collapsed');
    collapseBtn.textContent = collapsed ? 'Show' : 'Hide';
    collapseBtn.title = collapsed ? 'Expand toolbar' : 'Collapse toolbar';
  });

  function faviconUrl(pageUrl, size = 32) {
    const favicon = new URL(chrome.runtime.getURL('/_favicon/'));
    favicon.searchParams.set('pageUrl', pageUrl);
    favicon.searchParams.set('size', String(size));
    return favicon.toString();
  }

  function fallbackIconDataUrl() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#1f2a37" stroke="#40536e"/>
        <path d="M6 8.5h12M6 12h12M6 15.5h8" stroke="#abc4e2" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function renderBookmark(bookmark) {
    const link = document.createElement('a');
    link.className = 'bf-toolbar__item';
    link.href = bookmark.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const label = bookmark.title || new URL(bookmark.url).hostname;
    link.title = `${label}\n${bookmark.url}`;

    const img = document.createElement('img');
    img.className = 'bf-toolbar__icon';
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = faviconUrl(bookmark.url, 32);
    img.addEventListener('error', () => {
      img.src = fallbackIconDataUrl();
    }, { once: true });

    const text = document.createElement('span');
    text.className = 'bf-toolbar__text';
    text.textContent = label;

    link.append(img, text);
    return link;
  }

  async function init() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TOOLBAR_BOOKMARKS' });

      if (!response?.ok) {
        throw new Error(response?.error || 'Unknown bookmark loading error');
      }

      const bookmarks = response.bookmarks || [];

      if (bookmarks.length === 0) {
        status.textContent = 'No toolbar bookmarks found.';
        return;
      }

      const maxItems = 40;
      const visible = bookmarks.slice(0, maxItems);
      list.replaceChildren(...visible.map(renderBookmark));

      status.textContent = `Showing ${visible.length} of ${bookmarks.length} toolbar bookmarks.`;
      if (bookmarks.length > maxItems) {
        status.textContent += ' Scroll horizontally for quick access; open popup for full list.';
      }
    } catch (error) {
      console.error(error);
      status.textContent = 'Could not load toolbar bookmarks in page.';
    }
  }

  init();
})();
