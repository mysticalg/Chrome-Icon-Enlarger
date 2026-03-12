const statusEl = document.getElementById('status');
const scaleSelectEl = document.getElementById('scaleSelect');
const iconOnlyToggleEl = document.getElementById('iconOnlyToggle');
const autoHideTopToggleEl = document.getElementById('autoHideTopToggle');
const keepSpacerOnAutoHideToggleEl = document.getElementById('keepSpacerOnAutoHideToggle');
const noTopSpacerToggleEl = document.getElementById('noTopSpacerToggle');
const hoverGrowIconsToggleEl = document.getElementById('hoverGrowIconsToggle');
const barBackgroundOpacityRangeEl = document.getElementById('barBackgroundOpacityRange');
const barBackgroundOpacityValueEl = document.getElementById('barBackgroundOpacityValue');
const barBackgroundColorInputEl = document.getElementById('barBackgroundColorInput');
const barWidthPercentRangeEl = document.getElementById('barWidthPercentRange');
const barWidthPercentValueEl = document.getElementById('barWidthPercentValue');
const barAlignSelectEl = document.getElementById('barAlignSelect');
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
  // Default on: keeps top spacing stable when toolbar is hidden.
  keepSpacerOnAutoHide: true,
  // Optional mode: remove spacer completely so toolbar overlays content.
  noTopSpacer: false,
  hoverGrowIcons: false,
  hoverGrowScale: 1.2,
  hoverGrowSpeed: 240,
  // Default shell visuals match existing dark launcher look.
  barBackgroundOpacity: 95,
  barBackgroundColor: '#0f172a',
  // Top/bottom launcher width (% of page width).
  barWidthPercent: 100,
  // Anchor position when width is less than 100% for top/bottom bars.
  barAlign: 'left',
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

function normalizeBarBackgroundOpacity(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_TOOLBAR_SETTINGS.barBackgroundOpacity;
  }
  return Math.min(100, Math.max(0, numeric));
}

function normalizeHexColor(value) {
  const text = String(value || '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(text) ? text.toLowerCase() : DEFAULT_TOOLBAR_SETTINGS.barBackgroundColor;
}


function normalizeBarWidthPercent(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_TOOLBAR_SETTINGS.barWidthPercent;
  }
  return Math.min(100, Math.max(25, numeric));
}


function normalizeBarAlign(value) {
  const align = String(value || '').toLowerCase();
  return ['left', 'center', 'right'].includes(align) ? align : DEFAULT_TOOLBAR_SETTINGS.barAlign;
}

function updateBarBackgroundPreview() {
  const opacity = normalizeBarBackgroundOpacity(barBackgroundOpacityRangeEl.value);
  barBackgroundOpacityValueEl.textContent = `${opacity}%`;

  const widthPercent = normalizeBarWidthPercent(barWidthPercentRangeEl.value);
  barWidthPercentValueEl.textContent = `${widthPercent}%`;

  // Keep color input value normalized for stable storage values.
  const color = normalizeHexColor(barBackgroundColorInputEl.value);
  barBackgroundColorInputEl.value = color;
}


function updateBarGeometryControlState() {
  // Width/alignment controls apply only to top/bottom launcher modes.
  const supportsHorizontalBarSizing = ['top', 'bottom'].includes(positionSelectEl.value);
  barWidthPercentRangeEl.disabled = !supportsHorizontalBarSizing;
  barAlignSelectEl.disabled = !supportsHorizontalBarSizing;

  const hint = supportsHorizontalBarSizing
    ? ''
    : 'Only available for top/bottom launcher positions.';

  barWidthPercentRangeEl.title = hint || 'Set top/bottom launcher width from 25% to 100% of the page width.';
  barAlignSelectEl.title = hint || 'Align top/bottom bar to left, center, or right.';
}

function updateSpacerControlState() {
  // In overlay mode, keep-spacer behavior is irrelevant, so disable that toggle.
  const overlayModeEnabled = noTopSpacerToggleEl.checked;
  keepSpacerOnAutoHideToggleEl.disabled = overlayModeEnabled;
  keepSpacerOnAutoHideToggleEl.title = overlayModeEnabled
    ? 'Disabled because No top spacer is on.'
    : 'Keep the top spacer height while the toolbar auto-hides so page content does not move.';
}

function applySettingsToForm(settings) {
  scaleSelectEl.value = String(settings.scale);
  iconOnlyToggleEl.checked = Boolean(settings.iconOnly);
  autoHideTopToggleEl.checked = Boolean(settings.autoHideTop);
  keepSpacerOnAutoHideToggleEl.checked = Boolean(settings.keepSpacerOnAutoHide);
  noTopSpacerToggleEl.checked = Boolean(settings.noTopSpacer);
  hoverGrowIconsToggleEl.checked = Boolean(settings.hoverGrowIcons);
  barBackgroundOpacityRangeEl.value = String(settings.barBackgroundOpacity);
  barBackgroundColorInputEl.value = settings.barBackgroundColor;
  barWidthPercentRangeEl.value = String(settings.barWidthPercent);
  barAlignSelectEl.value = normalizeBarAlign(settings.barAlign);
  hoverGrowScaleSelectEl.value = Number(settings.hoverGrowScale).toFixed(2);
  hoverGrowSpeedSelectEl.value = String(settings.hoverGrowSpeed);
  positionSelectEl.value = settings.position;
  openModeSelectEl.value = settings.openMode || 'current';
  updateBarBackgroundPreview();
  updateBarGeometryControlState();
  updateSpacerControlState();
}

async function readToolbarSettings() {
  const storage = await chrome.storage.sync.get(TOOLBAR_SETTINGS_KEY);
  const rawSettings = storage?.[TOOLBAR_SETTINGS_KEY] || {};
  const merged = {
    ...DEFAULT_TOOLBAR_SETTINGS,
    ...rawSettings,
  };

  if (!['current', 'new'].includes(merged.openMode)) {
    merged.openMode = DEFAULT_TOOLBAR_SETTINGS.openMode;
  }

  merged.autoHideTop = Boolean(merged.autoHideTop);
  merged.keepSpacerOnAutoHide = Boolean(merged.keepSpacerOnAutoHide);
  merged.noTopSpacer = Boolean(merged.noTopSpacer);
  merged.hoverGrowIcons = Boolean(merged.hoverGrowIcons);
  merged.hoverGrowScale = normalizeHoverGrowScale(merged.hoverGrowScale);
  merged.hoverGrowSpeed = normalizeHoverGrowSpeed(merged.hoverGrowSpeed);
  merged.barBackgroundColor = normalizeHexColor(merged.barBackgroundColor);
  merged.barBackgroundOpacity = normalizeBarBackgroundOpacity(merged.barBackgroundOpacity);
  merged.barWidthPercent = normalizeBarWidthPercent(merged.barWidthPercent);
  merged.barAlign = normalizeBarAlign(merged.barAlign);

  // Backward compatibility: old "transparentBackground" becomes 0% opacity
  // if no explicit opacity was saved yet.
  if (rawSettings.transparentBackground === true && rawSettings.barBackgroundOpacity == null) {
    merged.barBackgroundOpacity = 0;
  }

  return merged;
}

async function persistToolbarSettings() {
  const settings = {
    scale: scaleSelectEl.value,
    iconOnly: iconOnlyToggleEl.checked,
    autoHideTop: autoHideTopToggleEl.checked,
    keepSpacerOnAutoHide: keepSpacerOnAutoHideToggleEl.checked,
    // Optional spacer mode for users who prefer overlay behavior.
    noTopSpacer: noTopSpacerToggleEl.checked,
    hoverGrowIcons: hoverGrowIconsToggleEl.checked,
    hoverGrowScale: normalizeHoverGrowScale(hoverGrowScaleSelectEl.value),
    hoverGrowSpeed: normalizeHoverGrowSpeed(hoverGrowSpeedSelectEl.value),
    // User-tunable shell look.
    barBackgroundOpacity: normalizeBarBackgroundOpacity(barBackgroundOpacityRangeEl.value),
    barBackgroundColor: normalizeHexColor(barBackgroundColorInputEl.value),
    barWidthPercent: normalizeBarWidthPercent(barWidthPercentRangeEl.value),
    barAlign: normalizeBarAlign(barAlignSelectEl.value),
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
    updateSpacerControlState();
    updateBarGeometryControlState();
    updateBarBackgroundPreview();
    persistToolbarSettings().catch((error) => {
      console.error(error);
      showSettingsStatus('Could not save settings.');
    });
  };

  scaleSelectEl.addEventListener('change', onChange);
  iconOnlyToggleEl.addEventListener('change', onChange);
  autoHideTopToggleEl.addEventListener('change', onChange);
  keepSpacerOnAutoHideToggleEl.addEventListener('change', onChange);
  noTopSpacerToggleEl.addEventListener('change', onChange);
  hoverGrowIconsToggleEl.addEventListener('change', onChange);
  barBackgroundOpacityRangeEl.addEventListener('input', onChange);
  barBackgroundOpacityRangeEl.addEventListener('change', onChange);
  barBackgroundColorInputEl.addEventListener('input', onChange);
  barBackgroundColorInputEl.addEventListener('change', onChange);
  barWidthPercentRangeEl.addEventListener('input', onChange);
  barWidthPercentRangeEl.addEventListener('change', onChange);
  barAlignSelectEl.addEventListener('change', onChange);
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
