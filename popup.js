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
const barCornerRadiusRangeEl = document.getElementById('barCornerRadiusRange');
const barCornerRadiusValueEl = document.getElementById('barCornerRadiusValue');
const barShadowStrengthRangeEl = document.getElementById('barShadowStrengthRange');
const barShadowStrengthValueEl = document.getElementById('barShadowStrengthValue');
const autoHideDelayRangeEl = document.getElementById('autoHideDelayRange');
const autoHideDelayValueEl = document.getElementById('autoHideDelayValue');
const showSpeedRangeEl = document.getElementById('showSpeedRange');
const showSpeedValueEl = document.getElementById('showSpeedValue');
const hideSpeedRangeEl = document.getElementById('hideSpeedRange');
const hideSpeedValueEl = document.getElementById('hideSpeedValue');
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
  // Optional shell polish controls.
  barCornerRadius: 0,
  barShadowStrength: 0,
  // Top auto-hide timing controls.
  autoHideDelayMs: 700,
  showSpeedMs: 180,
  hideSpeedMs: 180,
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

function normalizeBarCornerRadius(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_TOOLBAR_SETTINGS.barCornerRadius;
  }
  return Math.min(24, Math.max(0, numeric));
}

function normalizePercent(value, fallback) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(100, Math.max(0, numeric));
}

function normalizeAnimationMs(value, fallback) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(2000, Math.max(0, numeric));
}

function updateRangeValueLabels() {
  const opacity = normalizeBarBackgroundOpacity(barBackgroundOpacityRangeEl.value);
  barBackgroundOpacityValueEl.textContent = `${opacity}%`;

  const widthPercent = normalizeBarWidthPercent(barWidthPercentRangeEl.value);
  barWidthPercentValueEl.textContent = `${widthPercent}%`;

  const cornerPx = normalizeBarCornerRadius(barCornerRadiusRangeEl.value);
  barCornerRadiusValueEl.textContent = `${cornerPx}px`;

  const shadowStrength = normalizePercent(barShadowStrengthRangeEl.value, DEFAULT_TOOLBAR_SETTINGS.barShadowStrength);
  barShadowStrengthValueEl.textContent = `${shadowStrength}%`;

  const hideDelayMs = normalizeAnimationMs(autoHideDelayRangeEl.value, DEFAULT_TOOLBAR_SETTINGS.autoHideDelayMs);
  autoHideDelayValueEl.textContent = `${hideDelayMs}ms`;

  const showSpeedMs = normalizeAnimationMs(showSpeedRangeEl.value, DEFAULT_TOOLBAR_SETTINGS.showSpeedMs);
  showSpeedValueEl.textContent = `${showSpeedMs}ms`;

  const hideSpeedMs = normalizeAnimationMs(hideSpeedRangeEl.value, DEFAULT_TOOLBAR_SETTINGS.hideSpeedMs);
  hideSpeedValueEl.textContent = `${hideSpeedMs}ms`;

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

function updateAutoHideTimingControlState() {
  // Auto-hide timing controls only matter when top auto-hide behavior is active.
  const autoHideTimingEnabled = positionSelectEl.value === 'top' && autoHideTopToggleEl.checked;
  autoHideDelayRangeEl.disabled = !autoHideTimingEnabled;
  showSpeedRangeEl.disabled = !autoHideTimingEnabled;
  hideSpeedRangeEl.disabled = !autoHideTimingEnabled;

  const hint = autoHideTimingEnabled
    ? ''
    : 'Only available when launcher position is Top and auto-hide is enabled.';

  autoHideDelayRangeEl.title = hint || 'Delay before top auto-hide starts after pointer leaves the launcher.';
  showSpeedRangeEl.title = hint || 'Animation speed when the top launcher reveals.';
  hideSpeedRangeEl.title = hint || 'Animation speed when the top launcher hides.';
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
  barCornerRadiusRangeEl.value = String(settings.barCornerRadius);
  barShadowStrengthRangeEl.value = String(settings.barShadowStrength);
  autoHideDelayRangeEl.value = String(settings.autoHideDelayMs);
  showSpeedRangeEl.value = String(settings.showSpeedMs);
  hideSpeedRangeEl.value = String(settings.hideSpeedMs);
  hoverGrowScaleSelectEl.value = Number(settings.hoverGrowScale).toFixed(2);
  hoverGrowSpeedSelectEl.value = String(settings.hoverGrowSpeed);
  positionSelectEl.value = settings.position;
  openModeSelectEl.value = settings.openMode || 'current';
  updateRangeValueLabels();
  updateBarGeometryControlState();
  updateAutoHideTimingControlState();
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
  merged.barCornerRadius = normalizeBarCornerRadius(merged.barCornerRadius);
  merged.barShadowStrength = normalizePercent(merged.barShadowStrength, DEFAULT_TOOLBAR_SETTINGS.barShadowStrength);
  merged.autoHideDelayMs = normalizeAnimationMs(merged.autoHideDelayMs, DEFAULT_TOOLBAR_SETTINGS.autoHideDelayMs);
  merged.showSpeedMs = normalizeAnimationMs(merged.showSpeedMs, DEFAULT_TOOLBAR_SETTINGS.showSpeedMs);
  merged.hideSpeedMs = normalizeAnimationMs(merged.hideSpeedMs, DEFAULT_TOOLBAR_SETTINGS.hideSpeedMs);

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
    barCornerRadius: normalizeBarCornerRadius(barCornerRadiusRangeEl.value),
    barShadowStrength: normalizePercent(barShadowStrengthRangeEl.value, DEFAULT_TOOLBAR_SETTINGS.barShadowStrength),
    autoHideDelayMs: normalizeAnimationMs(autoHideDelayRangeEl.value, DEFAULT_TOOLBAR_SETTINGS.autoHideDelayMs),
    showSpeedMs: normalizeAnimationMs(showSpeedRangeEl.value, DEFAULT_TOOLBAR_SETTINGS.showSpeedMs),
    hideSpeedMs: normalizeAnimationMs(hideSpeedRangeEl.value, DEFAULT_TOOLBAR_SETTINGS.hideSpeedMs),
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
    updateAutoHideTimingControlState();
    updateRangeValueLabels();
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
  barCornerRadiusRangeEl.addEventListener('input', onChange);
  barCornerRadiusRangeEl.addEventListener('change', onChange);
  barShadowStrengthRangeEl.addEventListener('input', onChange);
  barShadowStrengthRangeEl.addEventListener('change', onChange);
  autoHideDelayRangeEl.addEventListener('input', onChange);
  autoHideDelayRangeEl.addEventListener('change', onChange);
  showSpeedRangeEl.addEventListener('input', onChange);
  showSpeedRangeEl.addEventListener('change', onChange);
  hideSpeedRangeEl.addEventListener('input', onChange);
  hideSpeedRangeEl.addEventListener('change', onChange);
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
