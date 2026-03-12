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

  const MAX_ITEMS = 40;
  const SLOT_WIDTH = 34;
  const SLOT_GAP = 6;

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

  const overflowBtn = document.createElement('button');
  overflowBtn.className = 'bf-toolbar__overflow-btn';
  overflowBtn.type = 'button';
  overflowBtn.textContent = '»';
  overflowBtn.title = 'Show hidden bookmarks';
  overflowBtn.setAttribute('aria-label', 'Show hidden bookmarks in dropdown');

  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'bf-toolbar__toggle';
  collapseBtn.type = 'button';
  collapseBtn.textContent = '👁';
  collapseBtn.title = 'Hide bookmark icons';
  collapseBtn.setAttribute('aria-label', 'Hide bookmark icons');

  const overflowMenu = document.createElement('div');
  overflowMenu.className = 'bf-toolbar__overflow-menu';
  overflowMenu.hidden = true;
  overflowMenu.setAttribute('role', 'menu');
  overflowMenu.setAttribute('aria-label', 'Hidden bookmarks');

  header.append(title);
  root.append(header, list, overflowMenu);

  let allBookmarks = [];
  let lastHiddenBookmarks = [];

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

  function closeOverflowMenu() {
    overflowMenu.hidden = true;
    overflowBtn.setAttribute('aria-expanded', 'false');
  }

  function refreshToggleButton(collapsed) {
    collapseBtn.textContent = collapsed ? '↺' : '👁';
    collapseBtn.title = collapsed ? 'Show bookmark icons' : 'Hide bookmark icons';
    collapseBtn.setAttribute('aria-label', collapseBtn.title);

    if (collapsed) {
      closeOverflowMenu();
    }
  }

  collapseBtn.addEventListener('click', () => {
    const collapsed = root.classList.toggle('is-collapsed');
    refreshToggleButton(collapsed);
    layoutToolbar();
  });

  overflowBtn.addEventListener('click', () => {
    if (overflowMenu.hidden) {
      populateOverflowMenu(lastHiddenBookmarks);
      overflowMenu.hidden = false;
      overflowBtn.setAttribute('aria-expanded', 'true');
    } else {
      closeOverflowMenu();
    }
  });

  document.addEventListener('click', (event) => {
    if (!root.contains(event.target)) {
      closeOverflowMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeOverflowMenu();
    }
  });

  window.addEventListener('resize', () => {
    closeOverflowMenu();
    layoutToolbar();
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

    // Icon-only row for density, with tooltip/ARIA carrying bookmark details.
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

  function renderOverflowItem(bookmark) {
    const item = document.createElement('a');
    item.className = 'bf-toolbar__overflow-item';
    item.href = bookmark.url;
    item.target = '_blank';
    item.rel = 'noopener noreferrer';

    const label = bookmark.title || new URL(bookmark.url).hostname;
    item.title = `${label}\n${bookmark.url}`;

    const img = document.createElement('img');
    img.className = 'bf-toolbar__overflow-icon';
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    applyFaviconWithFallback(img, bookmark.url);

    const text = document.createElement('span');
    text.className = 'bf-toolbar__overflow-text';
    text.textContent = label;

    item.append(img, text);
    return item;
  }

  function populateOverflowMenu(hiddenBookmarks) {
    overflowMenu.replaceChildren(...hiddenBookmarks.map(renderOverflowItem));
  }

  /**
   * Compute how many fixed-width icon slots fit in the current toolbar width.
   */
  function maxSlotsForWidth(width) {
    return Math.max(0, Math.floor((width + SLOT_GAP) / (SLOT_WIDTH + SLOT_GAP)));
  }

  /**
   * Layout strategy:
   * - Never show scrollbar in the icon row.
   * - Render what fits as fixed-width icons.
   * - Put overflowed bookmarks behind the trailing » dropdown button.
   */
  function layoutToolbar() {
    closeOverflowMenu();

    if (allBookmarks.length === 0) {
      list.replaceChildren(renderEmptyState('No toolbar bookmarks found.'), collapseBtn);
      return;
    }

    if (root.classList.contains('is-collapsed')) {
      list.replaceChildren(collapseBtn);
      return;
    }

    const availableWidth = list.clientWidth;
    const totalSlots = maxSlotsForWidth(availableWidth);

    // First reserve one slot for hide/show.
    let visibleCount = Math.min(allBookmarks.length, Math.max(0, totalSlots - 1));

    // If not all bookmarks fit, reserve one additional slot for the » overflow control.
    const needsOverflow = visibleCount < allBookmarks.length;
    if (needsOverflow) {
      visibleCount = Math.min(allBookmarks.length, Math.max(0, totalSlots - 2));
    }

    const visible = allBookmarks.slice(0, visibleCount);
    const hidden = allBookmarks.slice(visibleCount);
    lastHiddenBookmarks = hidden;

    const children = [...visible.map(renderBookmark)];
    if (hidden.length > 0) {
      children.push(overflowBtn);
    }
    children.push(collapseBtn);

    list.replaceChildren(...children);
  }

  async function init() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TOOLBAR_BOOKMARKS' });

      if (!response?.ok) {
        throw new Error(response?.error || 'Unknown bookmark loading error');
      }

      const bookmarks = response.bookmarks || [];
      allBookmarks = bookmarks.slice(0, MAX_ITEMS);
      layoutToolbar();
    } catch (error) {
      console.error(error);
      list.replaceChildren(renderEmptyState('Could not load toolbar bookmarks in page.'), collapseBtn);
    }
  }

  init();
})();
