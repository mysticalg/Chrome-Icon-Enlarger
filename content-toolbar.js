/**
 * Lightweight in-page favorites toolbar.
 *
 * Settings are read from chrome.storage.sync so users can control:
 * - icon scale (2x/4x/8x)
 * - icon-only mode (force no text)
 * - toolbar position (top/bottom/left/right)
 * - hover-grow icon scale + speed (without resizing toolbar tiles)
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
    openMode: 'current',
    autoHideTop: true,
    hoverGrowIcons: false,
    hoverGrowScale: 1.2,
    hoverGrowSpeed: 240,
    // Default on: keeps page position stable while top toolbar auto-hides.
    keepSpacerOnAutoHide: true,
    // Optional mode: remove top spacer completely so toolbar overlays content.
    noTopSpacer: false,
    // User-adjustable shell look.
    barBackgroundOpacity: 95,
    barBackgroundColor: '#0f172a',
    // Top/bottom launcher width (% of page width).
    barWidthPercent: 100,
    // Anchor position when width is less than 100% for top/bottom bars.
    barAlign: 'left',
  };

  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const root = document.createElement('aside');
  root.id = ROOT_ID;
  root.className = 'bf-toolbar';
  root.setAttribute('aria-label', 'Big Favorites in-page toolbar');

  // Spacer keeps page content from being hidden under the fixed top toolbar.
  const topSpacer = document.createElement('div');
  topSpacer.className = 'bf-toolbar-spacer';
  topSpacer.setAttribute('aria-hidden', 'true');

  const list = document.createElement('nav');
  list.className = 'bf-toolbar__list';
  list.setAttribute('aria-label', 'Bookmark shortcuts');

  const overflowBtn = document.createElement('button');
  overflowBtn.className = 'bf-toolbar__overflow-btn';
  overflowBtn.type = 'button';
  overflowBtn.textContent = '»';
  overflowBtn.title = 'Show hidden bookmarks';
  overflowBtn.setAttribute('aria-label', 'Show hidden bookmarks in dropdown');

  const addCurrentBtn = document.createElement('button');
  addCurrentBtn.className = 'bf-toolbar__add-btn';
  addCurrentBtn.type = 'button';
  addCurrentBtn.textContent = '+';
  addCurrentBtn.title = 'Add this page to the bookmarks toolbar';
  addCurrentBtn.setAttribute('aria-label', 'Add current page to bookmarks toolbar');

  const overflowMenu = document.createElement('div');
  overflowMenu.className = 'bf-toolbar__overflow-menu';
  overflowMenu.hidden = true;
  overflowMenu.setAttribute('role', 'menu');
  overflowMenu.setAttribute('aria-label', 'Hidden bookmarks');

  const bookmarkMenu = document.createElement('div');
  bookmarkMenu.className = 'bf-toolbar__bookmark-menu';
  bookmarkMenu.hidden = true;
  bookmarkMenu.setAttribute('role', 'menu');
  bookmarkMenu.setAttribute('aria-label', 'Bookmark actions');

  const removeActionBtn = document.createElement('button');
  removeActionBtn.className = 'bf-toolbar__menu-action';
  removeActionBtn.type = 'button';
  removeActionBtn.textContent = '🗑 Remove bookmark';
  removeActionBtn.title = 'Remove this bookmark from the bookmarks toolbar';
  removeActionBtn.setAttribute('aria-label', 'Remove bookmark');

  bookmarkMenu.append(removeActionBtn);

  // Intentionally render icon rail only (no title row) for a compact launcher.
  root.append(list, overflowMenu, bookmarkMenu);

  let allBookmarks = [];
  let lastHiddenBookmarks = [];
  let settings = { ...DEFAULT_SETTINGS };
  let selectedBookmarkId = null;
  let draggedBookmarkId = null;
  let topHideTimer = null;

  function closeOverflowMenu() {
    overflowMenu.hidden = true;
    overflowBtn.setAttribute('aria-expanded', 'false');
  }

  function closeBookmarkMenu() {
    bookmarkMenu.hidden = true;
    selectedBookmarkId = null;
  }

  function clearTopHideTimer() {
    if (topHideTimer) {
      clearTimeout(topHideTimer);
      topHideTimer = null;
    }
  }

  function isTopAutoHideEnabled() {
    return settings.position === 'top' && settings.autoHideTop;
  }

  function showToolbarAnimated() {
    if (!isTopAutoHideEnabled()) {
      return;
    }
    clearTopHideTimer();
    root.dataset.collapsed = 'false';
    topSpacer.dataset.collapsed = settings.noTopSpacer ? 'true' : 'false';
  }

  function hideToolbarAnimated() {
    if (!isTopAutoHideEnabled()) {
      return;
    }
    if (root.matches(':hover') || !overflowMenu.hidden || !bookmarkMenu.hidden) {
      return;
    }
    root.dataset.collapsed = 'true';

    // Optional modes: keep spacer for stable layout or hide completely in overlay mode.
    if (settings.noTopSpacer) {
      topSpacer.dataset.collapsed = 'true';
      return;
    }
    topSpacer.dataset.collapsed = settings.keepSpacerOnAutoHide ? 'false' : 'true';
  }

  function scheduleToolbarHide(delayMs = 700) {
    if (!isTopAutoHideEnabled()) {
      return;
    }
    clearTopHideTimer();
    topHideTimer = setTimeout(() => {
      hideToolbarAnimated();
    }, delayMs);
  }

  async function requestBookmarks() {
    let response;

    try {
      response = await chrome.runtime.sendMessage({ type: 'GET_TOOLBAR_BOOKMARKS' });
    } catch (error) {
      // Provide a clearer error when the worker is unavailable so users know
      // a quick extension reload usually restores the message channel.
      const message = String(error?.message || error || 'Unknown runtime error');
      if (message.includes('Receiving end does not exist')) {
        throw new Error('Background worker unavailable. Reload the extension, then refresh this page.');
      }
      throw error;
    }

    if (!response?.ok) {
      throw new Error(response?.error || 'Unknown bookmark loading error');
    }
    return response.bookmarks || [];
  }

  async function refreshBookmarks() {
    const bookmarks = await requestBookmarks();
    // Show the full bookmarks toolbar list; responsive layout still decides
    // what fits inline and puts remaining items behind the overflow button.
    allBookmarks = bookmarks;
    layoutToolbar();
  }

  function parseDroppedUrl(event) {
    const uriList = event.dataTransfer?.getData('text/uri-list') || '';
    const firstUri = uriList
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#'));

    const plain = event.dataTransfer?.getData('text/plain')?.trim() || '';
    const candidate = firstUri || plain;

    if (!candidate) {
      return null;
    }

    try {
      const url = new URL(candidate);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  }

  function clearReorderMarkers() {
    root.querySelectorAll('.is-reorder-target').forEach((element) => {
      element.classList.remove('is-reorder-target');
    });
  }

  function bookmarkIndexById(bookmarkId) {
    return allBookmarks.findIndex((bookmark) => bookmark.id === bookmarkId);
  }

  /**
   * Move bookmark via background worker and then refresh launcher ordering.
   */
  async function reorderBookmark(dragId, targetId) {
    if (!dragId || !targetId || dragId === targetId) {
      return;
    }

    const fromIndex = bookmarkIndexById(dragId);
    const targetIndex = bookmarkIndexById(targetId);
    if (fromIndex < 0 || targetIndex < 0) {
      return;
    }

    let toIndex = targetIndex;
    if (fromIndex < targetIndex) {
      // Account for source removal shift when moving forward.
      toIndex -= 1;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'MOVE_TOOLBAR_BOOKMARK',
      bookmarkId: dragId,
      toIndex,
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Could not reorder bookmark');
    }

    await refreshBookmarks();
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

  /**
   * Apply user-configured open behavior to launcher links.
   * Default is current tab to match requested UX.
   */
  function applyOpenMode(link) {
    if (settings.openMode === 'new') {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      return;
    }

    link.removeAttribute('target');
    link.removeAttribute('rel');
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
    applyOpenMode(link);

    const label = bookmark.title || new URL(bookmark.url).hostname;
    link.title = `${label}\n${bookmark.url}`;
    link.setAttribute('aria-label', label);
    link.dataset.bookmarkId = bookmark.id;
    link.draggable = true;

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
    applyOpenMode(item);

    const label = bookmark.title || new URL(bookmark.url).hostname;
    item.title = `${label}\n${bookmark.url}`;
    item.dataset.bookmarkId = bookmark.id;
    item.draggable = true;

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
    if (!['current', 'new'].includes(normalized.openMode)) {
      normalized.openMode = DEFAULT_SETTINGS.openMode;
    }
    normalized.autoHideTop = Boolean(normalized.autoHideTop);
    normalized.hoverGrowIcons = Boolean(normalized.hoverGrowIcons);
    normalized.keepSpacerOnAutoHide = Boolean(normalized.keepSpacerOnAutoHide);
    normalized.noTopSpacer = Boolean(normalized.noTopSpacer);

    const opacity = Number.parseInt(normalized.barBackgroundOpacity, 10);
    normalized.barBackgroundOpacity = Number.isFinite(opacity)
      ? Math.min(100, Math.max(0, opacity))
      : DEFAULT_SETTINGS.barBackgroundOpacity;

    const color = String(normalized.barBackgroundColor || '').trim();
    normalized.barBackgroundColor = /^#[0-9A-Fa-f]{6}$/.test(color)
      ? color.toLowerCase()
      : DEFAULT_SETTINGS.barBackgroundColor;

    const widthPercent = Number.parseInt(normalized.barWidthPercent, 10);
    normalized.barWidthPercent = Number.isFinite(widthPercent)
      ? Math.min(100, Math.max(25, widthPercent))
      : DEFAULT_SETTINGS.barWidthPercent;

    const barAlign = String(normalized.barAlign || '').toLowerCase();
    normalized.barAlign = ['left', 'center', 'right'].includes(barAlign)
      ? barAlign
      : DEFAULT_SETTINGS.barAlign;

    // Backward compatibility: migrate legacy transparent toggle value to 0% opacity
    // unless explicit opacity was already saved.
    if (raw?.transparentBackground === true && raw?.barBackgroundOpacity == null) {
      normalized.barBackgroundOpacity = 0;
    }

    const hoverGrowScale = Number.parseFloat(normalized.hoverGrowScale);
    normalized.hoverGrowScale = Number.isFinite(hoverGrowScale)
      ? Math.min(1.5, Math.max(1.05, hoverGrowScale))
      : DEFAULT_SETTINGS.hoverGrowScale;

    const hoverGrowSpeed = Number.parseInt(normalized.hoverGrowSpeed, 10);
    normalized.hoverGrowSpeed = Number.isFinite(hoverGrowSpeed)
      ? Math.min(700, Math.max(100, hoverGrowSpeed))
      : DEFAULT_SETTINGS.hoverGrowSpeed;

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

  function hexToRgb(hexColor) {
    const parsed = /^#?([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})$/.exec(hexColor);
    if (!parsed) {
      return { r: 15, g: 23, b: 42 };
    }
    return {
      r: Number.parseInt(parsed[1], 16),
      g: Number.parseInt(parsed[2], 16),
      b: Number.parseInt(parsed[3], 16),
    };
  }

  function applySettingsToLayout() {
    const iconPx = BASE_ICON * Number(settings.scale);
    const slotPx = settings.iconOnly ? iconPx + 10 : Math.max(iconPx + 76, 120);

    root.style.setProperty('--bf-icon-size', `${iconPx}px`);
    root.style.setProperty('--bf-slot-size', `${slotPx}px`);
    root.dataset.iconOnly = String(settings.iconOnly);
    root.dataset.position = settings.position;
    root.dataset.hoverGrowIcons = String(settings.hoverGrowIcons);
    root.style.setProperty('--bf-hover-grow-scale', String(settings.hoverGrowScale));
    root.style.setProperty('--bf-hover-grow-duration', `${settings.hoverGrowSpeed}ms`);

    // Width slider applies to top/bottom bars only. Side rails keep natural width.
    if (settings.position === 'top' || settings.position === 'bottom') {
      // Use !important so host-page CSS cannot force the bar back to full width.
      root.style.setProperty('width', `${settings.barWidthPercent}%`, 'important');
      root.style.setProperty('max-width', '100vw', 'important');

      // Let users choose how reduced-width bars anchor across the page.
      if (settings.barAlign === 'center') {
        root.style.setProperty('left', '0', 'important');
        root.style.setProperty('right', '0', 'important');
        root.style.setProperty('margin-left', 'auto', 'important');
        root.style.setProperty('margin-right', 'auto', 'important');
      } else if (settings.barAlign === 'right') {
        root.style.setProperty('left', 'auto', 'important');
        root.style.setProperty('right', '0', 'important');
        root.style.setProperty('margin-left', '0', 'important');
        root.style.setProperty('margin-right', '0', 'important');
      } else {
        root.style.setProperty('left', '0', 'important');
        root.style.setProperty('right', 'auto', 'important');
        root.style.setProperty('margin-left', '0', 'important');
        root.style.setProperty('margin-right', '0', 'important');
      }
    } else {
      root.style.removeProperty('width');
      root.style.removeProperty('max-width');
      root.style.removeProperty('left');
      root.style.removeProperty('right');
      root.style.removeProperty('margin-left');
      root.style.removeProperty('margin-right');
    }

    // Apply user-tunable shell color + opacity inline so page CSS cannot override.
    const shellRgb = hexToRgb(settings.barBackgroundColor);
    const shellAlpha = settings.barBackgroundOpacity / 100;
    root.style.background = `rgba(${shellRgb.r}, ${shellRgb.g}, ${shellRgb.b}, ${shellAlpha.toFixed(2)})`;
    root.style.borderColor = `rgba(148, 163, 184, ${Math.min(0.45, shellAlpha).toFixed(2)})`;
    root.style.backdropFilter = shellAlpha <= 0.01 ? 'none' : 'blur(8px)';
    root.style.boxShadow = shellAlpha <= 0.01 ? 'none' : '';

    const spacerHeight = settings.noTopSpacer ? 0 : slotPx + 10;
    if (settings.position === 'top') {
      topSpacer.style.setProperty('--bf-spacer-height', `${spacerHeight}px`);
    } else {
      topSpacer.style.setProperty('--bf-spacer-height', '0px');
    }

    if (settings.noTopSpacer) {
      // Overlay mode: keep spacer collapsed at all times.
      topSpacer.dataset.collapsed = 'true';
    } else if (isTopAutoHideEnabled()) {
      topSpacer.dataset.collapsed = settings.keepSpacerOnAutoHide ? 'false' : 'true';
    } else {
      topSpacer.dataset.collapsed = 'false';
    }

    root.dataset.collapsed = isTopAutoHideEnabled() ? 'true' : 'false';
  }

  function mountToolbar() {
    const mountTarget = document.body || document.documentElement;
    if (!mountTarget) {
      return;
    }

    if (settings.position === 'top') {
      mountTarget.prepend(topSpacer);
      topSpacer.before(root);
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
      topSpacer.remove();
      parent.append(root);
    }

    if (settings.position === 'top') {
      if (!topSpacer.isConnected) {
        parent.prepend(topSpacer);
      }
      if (root.previousElementSibling !== topSpacer) {
        topSpacer.after(root);
      }
      return;
    }

    if (settings.position !== 'bottom' && root !== parent.firstElementChild) {
      parent.prepend(root);
    }

    if (topSpacer.isConnected) {
      topSpacer.remove();
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
      list.replaceChildren(renderEmptyState('No toolbar bookmarks found.'));
      return;
    }

    const vertical = settings.position === 'left' || settings.position === 'right';
    const totalSlots = vertical
      ? maxSlotsForHeight(list.clientHeight)
      : maxSlotsForWidth(list.clientWidth);

    // Reserve fixed action space so right-edge buttons never get clipped.
    const addActionSlots = 1;
    const availableForBookmarks = Math.max(0, totalSlots - addActionSlots);

    let visibleCount = Math.min(allBookmarks.length, availableForBookmarks);
    let hiddenCount = allBookmarks.length - visibleCount;

    // If we still need overflow, reserve one more slot for its trigger.
    if (hiddenCount > 0) {
      visibleCount = Math.max(0, availableForBookmarks - 1);
      hiddenCount = allBookmarks.length - visibleCount;
    }

    const visible = allBookmarks.slice(0, visibleCount);
    const hidden = allBookmarks.slice(visibleCount, visibleCount + hiddenCount);
    lastHiddenBookmarks = hidden;

    const children = [...visible.map(renderBookmark)];

    // Keep the add action before overflow as requested, while both stay on the far edge.
    children.push(addCurrentBtn);

    if (hidden.length > 0) {
      children.push(overflowBtn);
    }

    list.replaceChildren(...children);
  }


  overflowBtn.addEventListener('click', () => {
    if (overflowMenu.hidden) {
      populateOverflowMenu(lastHiddenBookmarks);
      overflowMenu.hidden = false;
      overflowBtn.setAttribute('aria-expanded', 'true');
    } else {
      closeOverflowMenu();
    }
  });

  addCurrentBtn.addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_TOOLBAR_BOOKMARK',
        url: window.location.href,
        title: document.title,
      });

      if (!response?.ok) {
        throw new Error(response?.error || 'Could not add current page');
      }

      await refreshBookmarks();
      showToolbarAnimated();
      scheduleToolbarHide();
    } catch (error) {
      console.error(error);
    }
  });

  /**
   * Right-click bookmark tile => lightweight action menu with Remove action.
   */
  root.addEventListener('contextmenu', (event) => {
    const item = event.target.closest('.bf-toolbar__bookmark, .bf-toolbar__overflow-item');
    if (!item) {
      return;
    }

    event.preventDefault();
    selectedBookmarkId = item.dataset.bookmarkId || null;
    if (!selectedBookmarkId) {
      return;
    }

    bookmarkMenu.style.left = `${event.clientX}px`;
    bookmarkMenu.style.top = `${event.clientY}px`;
    bookmarkMenu.hidden = false;
  });

  removeActionBtn.addEventListener('click', async () => {
    if (!selectedBookmarkId) {
      closeBookmarkMenu();
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REMOVE_TOOLBAR_BOOKMARK',
        bookmarkId: selectedBookmarkId,
      });

      if (!response?.ok) {
        throw new Error(response?.error || 'Could not remove bookmark');
      }

      closeBookmarkMenu();
      await refreshBookmarks();
    } catch (error) {
      console.error(error);
      closeBookmarkMenu();
    }
  });

  // Drag source for bookmark reordering.
  root.addEventListener('dragstart', (event) => {
    const item = event.target.closest('.bf-toolbar__bookmark, .bf-toolbar__overflow-item');
    if (!item?.dataset.bookmarkId) {
      return;
    }

    draggedBookmarkId = item.dataset.bookmarkId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-big-favorites-bookmark-id', draggedBookmarkId);
  });

  root.addEventListener('dragend', () => {
    draggedBookmarkId = null;
    root.classList.remove('is-drop-target');
    clearReorderMarkers();
  });

  root.addEventListener('mouseenter', () => {
    showToolbarAnimated();
  });

  root.addEventListener('mouseleave', () => {
    scheduleToolbarHide(800);
  });

  root.addEventListener('dragover', (event) => {
    if (draggedBookmarkId) {
      const target = event.target.closest('.bf-toolbar__bookmark, .bf-toolbar__overflow-item');
      if (!target?.dataset.bookmarkId || target.dataset.bookmarkId === draggedBookmarkId) {
        return;
      }

      event.preventDefault();
      clearReorderMarkers();
      target.classList.add('is-reorder-target');
      event.dataTransfer.dropEffect = 'move';
      return;
    }

    const url = parseDroppedUrl(event);
    if (!url) {
      return;
    }

    event.preventDefault();
    root.classList.add('is-drop-target');
    event.dataTransfer.dropEffect = 'copy';
  });

  root.addEventListener('dragleave', (event) => {
    if (!root.contains(event.relatedTarget)) {
      root.classList.remove('is-drop-target');
      clearReorderMarkers();
    }
  });

  root.addEventListener('drop', async (event) => {
    event.preventDefault();
    root.classList.remove('is-drop-target');

    if (draggedBookmarkId) {
      const target = event.target.closest('.bf-toolbar__bookmark, .bf-toolbar__overflow-item');
      clearReorderMarkers();

      if (!target?.dataset.bookmarkId || target.dataset.bookmarkId === draggedBookmarkId) {
        return;
      }

      try {
        await reorderBookmark(draggedBookmarkId, target.dataset.bookmarkId);
      } catch (error) {
        console.error(error);
      }

      draggedBookmarkId = null;
      return;
    }

    const url = parseDroppedUrl(event);
    if (!url) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_TOOLBAR_BOOKMARK',
        url,
      });

      if (!response?.ok) {
        throw new Error(response?.error || 'Could not add bookmark');
      }

      await refreshBookmarks();
    } catch (error) {
      console.error(error);
    }

    draggedBookmarkId = null;
  });

  document.addEventListener('click', (event) => {
    if (!root.contains(event.target)) {
      closeOverflowMenu();
      closeBookmarkMenu();
      root.classList.remove('is-drop-target');
      clearReorderMarkers();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeOverflowMenu();
      closeBookmarkMenu();
      root.classList.remove('is-drop-target');
      clearReorderMarkers();
    }
  });

  window.addEventListener('resize', () => {
    closeBookmarkMenu();
    root.classList.remove('is-drop-target');
    clearReorderMarkers();
    draggedBookmarkId = null;
    layoutToolbar();
  });

  // Auto-reveal top launcher when pointer nears page top.
  document.addEventListener('mousemove', (event) => {
    if (!isTopAutoHideEnabled()) {
      return;
    }

    if (event.clientY <= 24) {
      showToolbarAnimated();
      return;
    }

    if (!root.matches(':hover')) {
      scheduleToolbarHide(450);
    }
  }, { passive: true });

  window.addEventListener('scroll', () => {
    if (!isTopAutoHideEnabled()) {
      return;
    }

    if (!root.matches(':hover')) {
      scheduleToolbarHide(300);
    }
  }, { passive: true });

  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !changes[TOOLBAR_SETTINGS_KEY]) {
        return;
      }

      settings = normalizeSettings(changes[TOOLBAR_SETTINGS_KEY].newValue);
      applySettingsToLayout();
      ensureMountedAtPosition();
      closeBookmarkMenu();
      layoutToolbar();

      if (isTopAutoHideEnabled()) {
        scheduleToolbarHide(600);
      } else {
        clearTopHideTimer();
      }
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
      await refreshBookmarks();
    } catch (error) {
      console.error(error);
      list.replaceChildren(renderEmptyState('Could not load toolbar bookmarks in page.'));
    }
  }

  init();
})();
