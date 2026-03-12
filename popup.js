const statusEl = document.getElementById('status');
const scaleSelectEl = document.getElementById('scaleSelect');
const iconOnlyToggleEl = document.getElementById('iconOnlyToggle');
const autoHideTopToggleEl = document.getElementById('autoHideTopToggle');
const hoverGrowIconsToggleEl = document.getElementById('hoverGrowIconsToggle');
const hoverGrowScaleSelectEl = document.getElementById('hoverGrowScaleSelect');
const hoverGrowSpeedSelectEl = document.getElementById('hoverGrowSpeedSelect');
const positionSelectEl = document.getElementById('positionSelect');
const openModeSelectEl = document.getElementById('openModeSelect');
const settingsStatusEl = document.getElementById('settingsStatus');

const TOOLBAR_SETTINGS_KEY = 'toolbarSettings';
const DEFAULT_TOOLBAR_SETTINGS = {
  scale: '2',
  iconOnly: true,
  position: 'top',
  openMode: 'current',
  autoHideTop: true,
  hoverGrowIcons: false,
  hoverGrowScale: 1.2,
  hoverGrowSpeed: 240,
};

let currentToolbarSettings = { ...DEFAULT_TOOLBAR_SETTINGS };

function showStatus(message) {
  statusEl.textContent = message;
}

function showSettingsStatus(message) {
  settingsStatusEl.textContent = message;
}

function normalizeHoverGrowScale(value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_TOOLBAR_SETTINGS.hoverGrowScale;
  }
  return Math.min(1.5, Math.max(1.05, numeric));
}

function normalizeHoverGrowSpeed(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_TOOLBAR_SETTINGS.hoverGrowSpeed;
  }
  return Math.min(700, Math.max(100, numeric));
}

function applySettingsToForm(settings) {
  scaleSelectEl.value = String(settings.scale);
  iconOnlyToggleEl.checked = Boolean(settings.iconOnly);
  autoHideTopToggleEl.checked = Boolean(settings.autoHideTop);
  hoverGrowIconsToggleEl.checked = Boolean(settings.hoverGrowIcons);
  hoverGrowScaleSelectEl.value = Number(settings.hoverGrowScale).toFixed(2);
  hoverGrowSpeedSelectEl.value = String(settings.hoverGrowSpeed);
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

  merged.autoHideTop = Boolean(merged.autoHideTop);
  merged.hoverGrowIcons = Boolean(merged.hoverGrowIcons);
  merged.hoverGrowScale = normalizeHoverGrowScale(merged.hoverGrowScale);
  merged.hoverGrowSpeed = normalizeHoverGrowSpeed(merged.hoverGrowSpeed);

  return merged;
}

async function persistToolbarSettings() {
  const settings = {
    scale: scaleSelectEl.value,
    iconOnly: iconOnlyToggleEl.checked,
    autoHideTop: autoHideTopToggleEl.checked,
    hoverGrowIcons: hoverGrowIconsToggleEl.checked,
    hoverGrowScale: normalizeHoverGrowScale(hoverGrowScaleSelectEl.value),
    hoverGrowSpeed: normalizeHoverGrowSpeed(hoverGrowSpeedSelectEl.value),
    position: positionSelectEl.value,
    openMode: openModeSelectEl.value,
  };

  currentToolbarSettings = settings;
  await chrome.storage.sync.set({ [TOOLBAR_SETTINGS_KEY]: settings });
  showSettingsStatus('Saved. Settings apply immediately on open pages.');
}

async function initSettings() {
  if (!globalThis.chrome?.storage?.sync) {
    showSettingsStatus('Settings unavailable in demo mode.');
    showStatus('Load as a Chrome extension to save settings.');
    return;
  }

  const settings = await readToolbarSettings();
  currentToolbarSettings = settings;
  applySettingsToForm(settings);
  showSettingsStatus('Settings saved automatically.');
  showStatus('Configure toolbar behavior and hover animation.');

  const onChange = () => {
    persistToolbarSettings().catch((error) => {
      console.error(error);
      showSettingsStatus('Could not save settings.');
    });
  };

  scaleSelectEl.addEventListener('change', onChange);
  iconOnlyToggleEl.addEventListener('change', onChange);
  autoHideTopToggleEl.addEventListener('change', onChange);
  hoverGrowIconsToggleEl.addEventListener('change', onChange);
  hoverGrowScaleSelectEl.addEventListener('change', onChange);
  hoverGrowSpeedSelectEl.addEventListener('change', onChange);
  positionSelectEl.addEventListener('change', onChange);
  openModeSelectEl.addEventListener('change', onChange);
}

async function init() {
  try {
    await initSettings();
  } catch (error) {
    console.error(error);
    showStatus('Could not load toolbar settings.');
    showSettingsStatus('Could not load toolbar settings.');
  }
}

init();
