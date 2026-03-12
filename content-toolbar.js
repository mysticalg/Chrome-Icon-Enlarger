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

  const list = document.createElement('nav');
  list.className = 'bf-toolbar__list';
  list.setAttribute('aria-label', 'Bookmark shortcuts');

  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'bf-toolbar__toggle';
  collapseBtn.type = 'button';
  collapseBtn.textContent = '👁';
  collapseBtn.title = 'Hide bookmark icons';
  collapseBtn.setAttribute('aria-label', 'Hide bookmark icons');

  header.append(title);
  root.append(header, list);

  /**
   * Insert the toolbar into normal page flow so it pushes content down
   * rather than floating over (and obscuring) page headers.
   */
  function mountToolbar() {
    const mountTarget = document.body || document.documentElement;

    if (!mountTarget) {
      return;
    }

    mountTarget.prepend(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountToolbar, { once: true });
  } else {
    mountToolbar();
  }

  /**
   * Keep the control button in the same icon row while still allowing
   * users to un-collapse the toolbar after hiding icons.
   */
  function refreshToggleButton(collapsed) {
    collapseBtn.textContent = collapsed ? '↺' : '👁';
    collapseBtn.title = collapsed ? 'Show bookmark icons' : 'Hide bookmark icons';
    collapseBtn.setAttribute('aria-label', collapseBtn.title);
  }

  collapseBtn.addEventListener('click', () => {
    const collapsed = root.classList.toggle('is-collapsed');
    refreshToggleButton(collapsed);
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

  function secondaryFaviconUrl(pageUrl, size = 64) {
    const favicon = new URL('https://www.google.com/s2/favicons');
    favicon.searchParams.set('domain_url', pageUrl);
    favicon.searchParams.set('sz', String(size));
    return favicon.toString();
  }

  /**
   * Try multiple icon sources so pages with missing `_favicon` results
   * still show their real brand icon whenever possible.
   */
  function applyFaviconWithFallback(img, pageUrl) {
    const candidates = [
      faviconUrl(pageUrl, 32),
      secondaryFaviconUrl(pageUrl, 64),
      fallbackIconDataUrl(),
    ];

    let index = 0;
    img.src = candidates[index];

    img.addEventListener('error', () => {
      index += 1;
      if (index < candidates.length) {
        img.src = candidates[index];
      }
    });
  }

  function renderBookmark(bookmark) {
    const link = document.createElement('a');
    link.className = 'bf-toolbar__item bf-toolbar__bookmark';
    link.href = bookmark.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const label = bookmark.title || new URL(bookmark.url).hostname;
    link.title = `${label}\n${bookmark.url}`;
    link.setAttribute('aria-label', label);

    const img = document.createElement('img');
    img.className = 'bf-toolbar__icon';
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    applyFaviconWithFallback(img, bookmark.url);

    // Keep launcher compact: icon-only tiles with full tooltip/ARIA label for clarity.
    link.append(img);
    return link;
  }

  function renderEmptyState(message) {
    const empty = document.createElement('span');
    empty.className = 'bf-toolbar__empty';
    empty.textContent = message;
    empty.title = message;
    return empty;
  }

  async function init() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TOOLBAR_BOOKMARKS' });

      if (!response?.ok) {
        throw new Error(response?.error || 'Unknown bookmark loading error');
      }

      const bookmarks = response.bookmarks || [];

      if (bookmarks.length === 0) {
        list.replaceChildren(renderEmptyState('No toolbar bookmarks found.'), collapseBtn);
        return;
      }

      const maxItems = 40;
      const visible = bookmarks.slice(0, maxItems);

      // Keep one-row layout compact: icons + title + inline show/hide control.
      list.replaceChildren(...visible.map(renderBookmark), collapseBtn);
    } catch (error) {
      console.error(error);
      list.replaceChildren(renderEmptyState('Could not load toolbar bookmarks in page.'), collapseBtn);
    }
  }

  init();
})();
