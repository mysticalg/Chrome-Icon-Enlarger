const statusEl = document.getElementById('status');
const listEl = document.getElementById('bookmarkList');
const scaleSelectEl = document.getElementById('scaleSelect');
const iconOnlyToggleEl = document.getElementById('iconOnlyToggle');
const positionSelectEl = document.getElementById('positionSelect');
const openModeSelectEl = document.getElementById('openModeSelect');
const settingsStatusEl = document.getElementById('settingsStatus');

const TOOLBAR_SETTINGS_KEY = 'toolbarSettings';
const DEFAULT_TOOLBAR_SETTINGS = {
  scale: '2',
  iconOnly: true,
  position: 'top',
  openMode: 'current',
};

let currentToolbarSettings = { ...DEFAULT_TOOLBAR_SETTINGS };

function faviconUrl(pageUrl, size = 32) {
  const favicon = new URL(chrome.runtime.getURL('/_favicon/'));
  favicon.searchParams.set('pageUrl', pageUrl);
  favicon.searchParams.set('size', String(size));
  return favicon.toString();
}

function fallbackIconDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="#243348" stroke="#486283"/>
      <path d="M8 17.5h16M8 12.5h16M8 22.5h10" stroke="#9FB7D6" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function applyOpenModeToLink(link) {
  if (currentToolbarSettings.openMode === 'new') {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return;
  }

  link.removeAttribute('target');
  link.removeAttribute('rel');
}

function renderBookmark(bookmark) {
  const li = document.createElement('li');
  li.className = 'bookmark-item';

  const a = document.createElement('a');
  a.className = 'bookmark-link';
  a.href = bookmark.url;
  applyOpenModeToLink(a);
  a.title = `${bookmark.title || bookmark.url}\n${bookmark.url}`;

  const img = document.createElement('img');
  img.className = 'bookmark-icon';
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.src = faviconUrl(bookmark.url, 32);
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

async function loadToolbarBookmarks() {
  const toolbarItems = await chrome.bookmarks.getChildren('1');
  return toolbarItems.filter((item) => Boolean(item.url));
}

function showStatus(message) {
  statusEl.textContent = message;
}

function showSettingsStatus(message) {
  settingsStatusEl.textContent = message;
}

function applySettingsToForm(settings) {
  scaleSelectEl.value = String(settings.scale);
  iconOnlyToggleEl.checked = Boolean(settings.iconOnly);
  positionSelectEl.value = settings.position;
  openModeSelectEl.value = settings.openMode || 'current';
}

async function readToolbarSettings() {
  const storage = await chrome.storage.sync.get(TOOLBAR_SETTINGS_KEY);
  const merged = {
    ...DEFAULT_TOOLBAR_SETTINGS,
    ...(storage?.[TOOLBAR_SETTINGS_KEY] || {}),
  };

  if (!['current', 'new'].includes(merged.openMode)) {
    merged.openMode = DEFAULT_TOOLBAR_SETTINGS.openMode;
  }

  return merged;
}

async function persistToolbarSettings() {
  const settings = {
    scale: scaleSelectEl.value,
    iconOnly: iconOnlyToggleEl.checked,
    position: positionSelectEl.value,
    openMode: openModeSelectEl.value,
  };

  currentToolbarSettings = settings;
  await chrome.storage.sync.set({ [TOOLBAR_SETTINGS_KEY]: settings });
  showSettingsStatus('Saved. Open/reload a page to apply launcher changes.');
}

async function initSettings() {
  if (!globalThis.chrome?.storage?.sync) {
    showSettingsStatus('Settings unavailable in demo mode.');
    return;
  }

  const settings = await readToolbarSettings();
  currentToolbarSettings = settings;
  applySettingsToForm(settings);
  showSettingsStatus('Settings saved automatically.');

  const onChange = () => {
    persistToolbarSettings().catch((error) => {
      console.error(error);
      showSettingsStatus('Could not save settings.');
    });
  };

  scaleSelectEl.addEventListener('change', onChange);
  iconOnlyToggleEl.addEventListener('change', onChange);
  positionSelectEl.addEventListener('change', onChange);
  openModeSelectEl.addEventListener('change', onChange);
}

async function init() {
  try {
    if (!globalThis.chrome?.bookmarks || !globalThis.chrome?.runtime) {
      const demo = [
        { title: 'GitHub', url: 'https://github.com' },
        { title: 'YouTube', url: 'https://youtube.com' },
      ];
      showStatus('Demo mode: load as a Chrome extension to read your real bookmarks.');
      listEl.replaceChildren(...demo.map(renderBookmark));
      return;
    }

    await initSettings();

    showStatus('Loading bookmarks…');
    const bookmarks = await loadToolbarBookmarks();

    if (bookmarks.length === 0) {
      showStatus('No bookmarks found on your bookmarks toolbar yet.');
      return;
    }

    listEl.replaceChildren(...bookmarks.map(renderBookmark));
    showStatus(`Showing ${bookmarks.length} bookmark${bookmarks.length === 1 ? '' : 's'} with 2× popup icons.`);
  } catch (error) {
    console.error(error);
    showStatus('Could not load bookmarks. Check extension permissions and try again.');
    showSettingsStatus('Could not load toolbar settings.');
  }
}

init();
