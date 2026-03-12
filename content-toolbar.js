/**
 * Lightweight in-page favorites toolbar.
 *
 * Settings are read from chrome.storage.sync so users can control:
 * - icon scale (2x/4x/8x)
 * - icon-only mode (force no text)
 * - toolbar position (top/bottom/left/right)
 */
(() => {
  if (window.top !== window) {
    return;
  }

  const ROOT_ID = 'big-favorites-inline-toolbar';
  const TOOLBAR_SETTINGS_KEY = 'toolbarSettings';
  const BASE_ICON = 16;
  const SLOT_GAP = 6;
  const DEFAULT_SETTINGS = {
    scale: '2',
    iconOnly: true,
    position: 'top',
  };

  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const root = document.createElement('aside');
  root.id = ROOT_ID;
  root.className = 'bf-toolbar';
  root.setAttribute('aria-label', 'Big Favorites in-page toolbar');

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

  // Intentionally render icon rail only (no title row) for a compact launcher.
  root.append(list, overflowMenu);

  let allBookmarks = [];
  let lastHiddenBookmarks = [];
  let settings = { ...DEFAULT_SETTINGS };

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

  function applyFaviconWithFallback(img, pageUrl) {
    const candidates = [
      faviconUrl(pageUrl, 64),
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

    const text = document.createElement('span');
    text.className = 'bf-toolbar__text';
    text.textContent = label;

    // Keep icon compact while preserving optional label mode.
    link.append(img, text);
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

    // Respect icon-only mode in overflow panel too (no text when disabled in settings).
    if (settings.iconOnly) {
      item.append(img);
    } else {
      item.append(img, text);
    }

    return item;
  }

  function populateOverflowMenu(hiddenBookmarks) {
    overflowMenu.replaceChildren(...hiddenBookmarks.map(renderOverflowItem));
  }

  function normalizeSettings(raw) {
    const normalized = { ...DEFAULT_SETTINGS, ...(raw || {}) };
    if (!['2', '4', '8'].includes(String(normalized.scale))) {
      normalized.scale = DEFAULT_SETTINGS.scale;
    }
    normalized.scale = String(normalized.scale);
    normalized.iconOnly = Boolean(normalized.iconOnly);
    if (!['top', 'bottom', 'left', 'right'].includes(normalized.position)) {
      normalized.position = DEFAULT_SETTINGS.position;
    }
    return normalized;
  }

  async function readSettings() {
    try {
      const storage = await chrome.storage.sync.get(TOOLBAR_SETTINGS_KEY);
      return normalizeSettings(storage?.[TOOLBAR_SETTINGS_KEY]);
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function applySettingsToLayout() {
    const iconPx = BASE_ICON * Number(settings.scale);
    const slotPx = settings.iconOnly ? iconPx + 10 : Math.max(iconPx + 76, 120);

    root.style.setProperty('--bf-icon-size', `${iconPx}px`);
    root.style.setProperty('--bf-slot-size', `${slotPx}px`);
    root.dataset.iconOnly = String(settings.iconOnly);
    root.dataset.position = settings.position;
  }

  function mountToolbar() {
    const mountTarget = document.body || document.documentElement;
    if (!mountTarget) {
      return;
    }

    if (settings.position === 'bottom') {
      mountTarget.append(root);
    } else {
      mountTarget.prepend(root);
    }
  }

  function ensureMountedAtPosition() {
    if (!root.isConnected) {
      mountToolbar();
      return;
    }

    const parent = document.body || document.documentElement;
    if (!parent) {
      return;
    }

    if (settings.position === 'bottom' && root !== parent.lastElementChild) {
      parent.append(root);
    }

    if (settings.position !== 'bottom' && root !== parent.firstElementChild) {
      parent.prepend(root);
    }
  }

  function slotSize() {
    return Number.parseFloat(getComputedStyle(root).getPropertyValue('--bf-slot-size')) || 34;
  }

  function maxSlotsForWidth(width) {
    const tile = slotSize();
    return Math.max(0, Math.floor((width + SLOT_GAP) / (tile + SLOT_GAP)));
  }

  function maxSlotsForHeight(height) {
    const tile = slotSize();
    return Math.max(0, Math.floor((height + SLOT_GAP) / (tile + SLOT_GAP)));
  }

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

    const vertical = settings.position === 'left' || settings.position === 'right';
    const totalSlots = vertical
      ? maxSlotsForHeight(list.clientHeight)
      : maxSlotsForWidth(list.clientWidth);

    let visibleCount = Math.min(allBookmarks.length, Math.max(0, totalSlots - 1));
    if (visibleCount < allBookmarks.length) {
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
    layoutToolbar();
  });

  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !changes[TOOLBAR_SETTINGS_KEY]) {
        return;
      }

      settings = normalizeSettings(changes[TOOLBAR_SETTINGS_KEY].newValue);
      applySettingsToLayout();
      ensureMountedAtPosition();
      layoutToolbar();
    });
  }

  async function init() {
    settings = await readSettings();
    applySettingsToLayout();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountToolbar, { once: true });
    } else {
      mountToolbar();
    }

    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TOOLBAR_BOOKMARKS' });
      if (!response?.ok) {
        throw new Error(response?.error || 'Unknown bookmark loading error');
      }

      const bookmarks = response.bookmarks || [];
      // Show the full bookmarks toolbar list; responsive layout still decides
      // what fits inline and puts remaining items behind the overflow button.
      allBookmarks = bookmarks;
      layoutToolbar();
    } catch (error) {
      console.error(error);
      list.replaceChildren(renderEmptyState('Could not load toolbar bookmarks in page.'), collapseBtn);
    }
  }

  init();
})();
