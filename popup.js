const statusEl = document.getElementById('status');
const gridEl = document.getElementById('bookmarksGrid');
const refreshButtonEl = document.getElementById('refreshButton');
const openModeSelectEl = document.getElementById('openModeSelect');

const SETTINGS_KEY = 'popupLauncherSettings';
const DEFAULT_SETTINGS = {
  openMode: 'current',
};

/**
 * Build the extension-safe favicon URL for a page.
 */
function getFaviconUrl(pageUrl) {
  return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=32`;
}

function setStatus(message) {
  statusEl.textContent = message;
}

function normalizeOpenMode(value) {
  return value === 'new' ? 'new' : 'current';
}

async function readSettings() {
  const storage = await chrome.storage.sync.get(SETTINGS_KEY);
  const raw = storage?.[SETTINGS_KEY] || {};
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    openMode: normalizeOpenMode(raw.openMode),
  };
}

async function saveSettings() {
  const settings = {
    openMode: normalizeOpenMode(openModeSelectEl.value),
  };
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

async function openBookmark(url) {
  const mode = normalizeOpenMode(openModeSelectEl.value);

  if (mode === 'new') {
    await chrome.tabs.create({ url });
    return;
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id) {
    await chrome.tabs.update(activeTab.id, { url });
    return;
  }

  // Fallback for edge cases where no active tab exists.
  await chrome.tabs.create({ url });
}

function renderBookmarks(bookmarks) {
  gridEl.textContent = '';

  if (!bookmarks.length) {
    setStatus('No bookmarks found in your Bookmarks Toolbar.');
    return;
  }

  for (const bookmark of bookmarks) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile';
    tile.title = `${bookmark.title || bookmark.url}\n${bookmark.url}`;
    tile.setAttribute('aria-label', `Open ${bookmark.title || bookmark.url}`);

    const icon = document.createElement('img');
    icon.className = 'tile__icon';
    icon.src = getFaviconUrl(bookmark.url);
    icon.alt = '';

    const label = document.createElement('span');
    label.className = 'tile__label';
    label.textContent = bookmark.title || new URL(bookmark.url).hostname;

    tile.append(icon, label);
    tile.addEventListener('click', () => {
      openBookmark(bookmark.url).catch((error) => {
        console.error(error);
        setStatus('Could not open bookmark.');
      });
    });

    gridEl.append(tile);
  }

  setStatus(`Loaded ${bookmarks.length} bookmark${bookmarks.length === 1 ? '' : 's'}.`);
}

async function loadBookmarks() {
  setStatus('Loading bookmarks…');

  try {
    const items = await chrome.bookmarks.getChildren('1');
    const bookmarks = items.filter((item) => Boolean(item.url));
    renderBookmarks(bookmarks);
  } catch (error) {
    console.error(error);
    setStatus('Could not load bookmarks.');
  }
}

async function init() {
  const settings = await readSettings();
  openModeSelectEl.value = settings.openMode;

  openModeSelectEl.addEventListener('change', () => {
    saveSettings().catch((error) => {
      console.error(error);
      setStatus('Could not save setting.');
    });
  });

  refreshButtonEl.addEventListener('click', () => {
    loadBookmarks();
  });

  await loadBookmarks();
}

init().catch((error) => {
  console.error(error);
  setStatus('Startup failed.');
});
