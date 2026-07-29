import { nextTick, ref, watch } from 'vue';
import api from '../api';

const SCHEMA_VERSION = 1;
const LEGACY_OWNER_KEY = 'desktop_legacy_state_owner_user_id';
const getStorageKey = (userId) => `desktop_state_v1_user_${userId}`;
const LEGACY_DESKTOP_KEYS = [
  'desktop_modules',
  'app_card_opacity',
  'app_cards_fully_transparent',
  'navbar_opacity',
  'navbar_fully_transparent',
  'navbar_hidden',
  'footer_opacity',
  'footer_fully_transparent',
  'footer_hidden',
  'site_language',
];

const defaultState = {
  desktopModules: [],
  folderLayouts: {},
  appCardOpacity: 88,
  appCardsFullyTransparent: false,
  navbarOpacity: 78,
  navbarFullyTransparent: false,
  navbarHidden: false,
  footerOpacity: 72,
  footerFullyTransparent: false,
  footerHidden: false,
  siteLanguage: 'zh-CN',
};

const guestDefaultState = {
  ...defaultState,
  appCardOpacity: 0,
  appCardsFullyTransparent: true,
  navbarOpacity: 0,
  navbarFullyTransparent: false,
  navbarHidden: false,
  footerOpacity: 50,
  footerFullyTransparent: false,
  footerHidden: false,
  siteLanguage: 'zh-CN',
};

const desktopModules = ref([]);
const folderLayouts = ref({});
const appCardOpacity = ref(defaultState.appCardOpacity);
const appCardsFullyTransparent = ref(defaultState.appCardsFullyTransparent);
const navbarOpacity = ref(defaultState.navbarOpacity);
const navbarFullyTransparent = ref(defaultState.navbarFullyTransparent);
const navbarHidden = ref(defaultState.navbarHidden);
const footerOpacity = ref(defaultState.footerOpacity);
const footerFullyTransparent = ref(defaultState.footerFullyTransparent);
const footerHidden = ref(defaultState.footerHidden);
const siteLanguage = ref(defaultState.siteLanguage);
const desktopHydrated = ref(false);
const desktopLoading = ref(true);
const desktopSaveError = ref('');
const desktopReadOnly = ref(false);

let hydratePromise = null;
let desktopSaveTimer = null;
let desktopSaveInProgress = false;
let desktopSaveQueued = false;
let desktopSaveSuppressed = false;
let currentUserId = null;
let desktopSessionVersion = 0;

const cloneDefaultState = () => structuredClone(defaultState);
const cloneGuestDefaultState = () => structuredClone(guestDefaultState);

const clampOpacity = (value, fallback) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue)
    ? Math.min(100, Math.max(0, numberValue))
    : fallback;
};

const normalizeFolderLayouts = (layouts) => {
  if (!layouts || typeof layouts !== 'object' || Array.isArray(layouts)) return {};

  return Object.fromEntries(
    Object.entries(layouts)
      .map(([folderType, items]) => [folderType, normalizeLayoutArray(items, { convertLegacyPos: true })])
      .filter(([, items]) => items.length > 0)
  );
};

const normalizeSavedLayoutKey = (item) => {
  const key = item?.module_key ?? item?.id;
  return key === null || key === undefined ? '' : String(key);
};

const readIntegerField = (value) => {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : null;
};

const normalizeLayoutArray = (items, { convertLegacyPos = false } = {}) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;

      const layoutKey = normalizeSavedLayoutKey(item);
      if (!layoutKey) return null;

      const cleanItem = {
        id: layoutKey,
        module_key: layoutKey,
      };

      let x = readIntegerField(item.x);
      let y = readIntegerField(item.y);
      const legacyPos = readIntegerField(item.pos);

      if (convertLegacyPos && (x === null || y === null) && legacyPos !== null) {
        x = legacyPos % 3;
        y = Math.floor(legacyPos / 3);
      }

      if (x !== null) cleanItem.x = x;
      if (y !== null) cleanItem.y = y;

      const width = readIntegerField(item.width);
      const height = readIntegerField(item.height);
      const order = readIntegerField(item.order);

      if (width !== null && width > 0) cleanItem.width = width;
      if (height !== null && height > 0) cleanItem.height = height;
      if (order !== null) cleanItem.order = order;
      if (typeof item.visible === 'boolean') cleanItem.visible = item.visible;

      return cleanItem;
    })
    .filter(Boolean);
};

const normalizeState = (state) => {
  const base = cloneDefaultState();

  return {
    ...base,
    ...(state && typeof state === 'object' && !Array.isArray(state) ? state : {}),
    desktopModules: normalizeLayoutArray(state?.desktopModules),
    folderLayouts: normalizeFolderLayouts(state?.folderLayouts),
    appCardOpacity: clampOpacity(state?.appCardOpacity, base.appCardOpacity),
    appCardsFullyTransparent: Boolean(state?.appCardsFullyTransparent),
    navbarOpacity: clampOpacity(state?.navbarOpacity, base.navbarOpacity),
    navbarFullyTransparent: Boolean(state?.navbarFullyTransparent),
    navbarHidden: Boolean(state?.navbarHidden),
    footerOpacity: clampOpacity(state?.footerOpacity, base.footerOpacity),
    footerFullyTransparent: Boolean(state?.footerFullyTransparent),
    footerHidden: Boolean(state?.footerHidden),
    siteLanguage: typeof state?.siteLanguage === 'string' && state.siteLanguage
      ? state.siteLanguage
      : base.siteLanguage,
  };
};

const collectDesktopState = () => ({
  desktopModules: desktopModules.value,
  folderLayouts: folderLayouts.value,
  appCardOpacity: appCardOpacity.value,
  appCardsFullyTransparent: appCardsFullyTransparent.value,
  navbarOpacity: navbarOpacity.value,
  navbarFullyTransparent: navbarFullyTransparent.value,
  navbarHidden: navbarHidden.value,
  footerOpacity: footerOpacity.value,
  footerFullyTransparent: footerFullyTransparent.value,
  footerHidden: footerHidden.value,
  siteLanguage: siteLanguage.value,
});

const applyDesktopState = (rawState) => {
  const state = normalizeState(rawState);

  desktopModules.value = state.desktopModules;
  folderLayouts.value = state.folderLayouts;
  appCardOpacity.value = state.appCardOpacity;
  appCardsFullyTransparent.value = state.appCardsFullyTransparent;
  navbarOpacity.value = state.navbarOpacity;
  navbarFullyTransparent.value = state.navbarFullyTransparent;
  navbarHidden.value = state.navbarHidden;
  footerOpacity.value = state.footerOpacity;
  footerFullyTransparent.value = state.footerFullyTransparent;
  footerHidden.value = state.footerHidden;
  siteLanguage.value = state.siteLanguage;
};

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch (error) {
    return null;
  }
};

const readBoolean = (key, target) => {
  const value = localStorage.getItem(key);
  if (value === null) return false;
  target.value = value === 'true';
  return true;
};

const readNumber = (key, target) => {
  const value = localStorage.getItem(key);
  if (value === null) return false;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return false;
  target.value = numberValue;
  return true;
};

const normalizeUserId = (userId) => (userId === null || userId === undefined ? null : String(userId));

const readLocalDesktopState = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return null;

  const cached = readJson(getStorageKey(normalizedUserId));
  if (cached && typeof cached === 'object' && !Array.isArray(cached)) return cached;

  const legacyOwnerId = localStorage.getItem(LEGACY_OWNER_KEY);
  if (legacyOwnerId && legacyOwnerId !== normalizedUserId) return null;

  const state = {};
  let hasLocalState = false;

  const savedModules = readJson('desktop_modules');
  if (Array.isArray(savedModules)) {
    state.desktopModules = savedModules;
    hasLocalState = true;
  }

  const savedFolderLayouts = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith('folder_layout_') || key === 'folder_layout_fixed_v1') continue;

    const layout = readJson(key);
    if (Array.isArray(layout)) {
      savedFolderLayouts[key.replace('folder_layout_', '')] = layout;
      hasLocalState = true;
    }
  }
  if (Object.keys(savedFolderLayouts).length) state.folderLayouts = savedFolderLayouts;

  const numberFields = [
    ['app_card_opacity', 'appCardOpacity'],
    ['navbar_opacity', 'navbarOpacity'],
    ['footer_opacity', 'footerOpacity'],
  ];
  numberFields.forEach(([key, field]) => {
    const target = { value: null };
    if (readNumber(key, target)) {
      state[field] = target.value;
      hasLocalState = true;
    }
  });

  const booleanFields = [
    ['app_cards_fully_transparent', 'appCardsFullyTransparent'],
    ['navbar_fully_transparent', 'navbarFullyTransparent'],
    ['navbar_hidden', 'navbarHidden'],
    ['footer_fully_transparent', 'footerFullyTransparent'],
    ['footer_hidden', 'footerHidden'],
  ];
  booleanFields.forEach(([key, field]) => {
    const target = { value: false };
    if (readBoolean(key, target)) {
      state[field] = target.value;
      hasLocalState = true;
    }
  });

  const language = localStorage.getItem('site_language');
  if (language) {
    state.siteLanguage = language;
    hasLocalState = true;
  }

  return hasLocalState ? state : null;
};

const markLegacyDesktopStateOwner = (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return;

  try {
    localStorage.setItem(LEGACY_OWNER_KEY, normalizedUserId);
    localStorage.setItem(`desktop_database_migrated_v1_user_${normalizedUserId}`, 'true');
  } catch (error) {
    console.warn('Unable to mark desktop legacy state owner', error);
  }
};

const clearLegacyDesktopStateCache = () => {
  try {
    LEGACY_DESKTOP_KEYS.forEach(key => localStorage.removeItem(key));

    const folderKeys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('folder_layout_') && key !== 'folder_layout_fixed_v1') {
        folderKeys.push(key);
      }
    }
    folderKeys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Unable to clear legacy desktop state cache', error);
  }
};

const writeLocalDesktopCache = (state, userId = currentUserId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return;

  try {
    localStorage.setItem(getStorageKey(normalizedUserId), JSON.stringify(normalizeState(state)));
  } catch (error) {
    console.warn('Unable to write desktop state cache', error);
  }
};

const applyDesktopChromeState = () => {
  const rootStyle = document.documentElement.style;

  rootStyle.setProperty('--navbar-height', '80px');
  if (navbarFullyTransparent.value || navbarHidden.value) {
    rootStyle.setProperty('--navbar-opacity', '0');
    rootStyle.setProperty('--navbar-backdrop-filter', 'none');
    rootStyle.setProperty('--navbar-border-color', 'transparent');
  } else {
    rootStyle.setProperty('--navbar-opacity', String(navbarOpacity.value / 100));
    rootStyle.setProperty('--navbar-backdrop-filter', 'blur(12px)');
    rootStyle.setProperty('--navbar-border-color', 'var(--border-color)');
  }

  if (footerHidden.value) {
    rootStyle.setProperty('--footer-height', '0px');
  } else {
    rootStyle.setProperty('--footer-height', '100px');
  }

  if (footerFullyTransparent.value || footerHidden.value) {
    rootStyle.setProperty('--footer-badge-opacity', '0');
    rootStyle.setProperty('--footer-badge-backdrop-filter', 'none');
    rootStyle.setProperty('--footer-badge-border-color', 'transparent');
    rootStyle.setProperty('--footer-badge-shadow', 'none');
  } else {
    rootStyle.setProperty('--footer-badge-opacity', String(footerOpacity.value / 100));
    rootStyle.setProperty('--footer-badge-backdrop-filter', 'blur(10px)');
    rootStyle.setProperty('--footer-badge-border-color', 'var(--border-color)');
    rootStyle.setProperty('--footer-badge-shadow', '0 4px 15px rgba(0, 0, 0, 0.05)');
  }

  window.dispatchEvent(new CustomEvent('layout-visibility-change'));
};

const saveDesktopStateNow = async () => {
  if (!desktopHydrated.value || !currentUserId) return;

  if (desktopSaveInProgress) {
    desktopSaveQueued = true;
    return;
  }

  desktopSaveInProgress = true;

  try {
    do {
      desktopSaveQueued = false;

      const snapshot = normalizeState(collectDesktopState());

      await api.put('/desktop-state/', {
        data: snapshot,
        schema_version: SCHEMA_VERSION,
      });

      writeLocalDesktopCache(snapshot, currentUserId);
      desktopSaveError.value = '';
    } while (desktopSaveQueued);
  } catch (error) {
    console.error('Unable to save desktop state', error);
    desktopSaveError.value = '保存失败，请检查网络';
    writeLocalDesktopCache(collectDesktopState(), currentUserId);
  } finally {
    desktopSaveInProgress = false;
  }
};

const scheduleDesktopStateSave = () => {
  if (!desktopHydrated.value || desktopSaveSuppressed || desktopReadOnly.value || !currentUserId) return;

  clearTimeout(desktopSaveTimer);
  desktopSaveTimer = setTimeout(() => {
    desktopSaveTimer = null;
    void saveDesktopStateNow();
  }, 600);
};

const hydrateDesktopState = async ({ userId, force = false } = {}) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    return hydrateGuestDesktopState();
  }

  if (currentUserId && currentUserId !== normalizedUserId) {
    resetDesktopStateSession();
  }

  if (!force && currentUserId === normalizedUserId && desktopHydrated.value) return;

  if (force && hydratePromise) {
    await hydratePromise;
  }

  if (!force && hydratePromise && currentUserId === normalizedUserId) return hydratePromise;

  currentUserId = normalizedUserId;
  desktopReadOnly.value = false;
  desktopHydrated.value = false;
  desktopSessionVersion += 1;
  const sessionVersion = desktopSessionVersion;

  hydratePromise = (async () => {
    desktopLoading.value = true;

    const localState = readLocalDesktopState(normalizedUserId);

    try {
      const response = await api.get('/desktop-state/');
      if (sessionVersion !== desktopSessionVersion || currentUserId !== normalizedUserId) return;

      const remoteData = response.data?.data;
      const remoteIsEmpty = response.data?.is_empty;

      if (!remoteIsEmpty && remoteData) {
        applyDesktopState(remoteData);
        writeLocalDesktopCache(collectDesktopState(), normalizedUserId);
      } else if (localState) {
        applyDesktopState(localState);

        await api.put('/desktop-state/', {
          data: collectDesktopState(),
          schema_version: SCHEMA_VERSION,
        });

        markLegacyDesktopStateOwner(normalizedUserId);
        writeLocalDesktopCache(collectDesktopState(), normalizedUserId);
        clearLegacyDesktopStateCache();
      } else {
        applyDesktopState(cloneDefaultState());
      }

      desktopSaveError.value = '';
    } catch (error) {
      console.error('Unable to load desktop state', error);
      if (sessionVersion !== desktopSessionVersion || currentUserId !== normalizedUserId) return;

      if (localState) {
        applyDesktopState(localState);
      } else {
        applyDesktopState(cloneDefaultState());
      }

      desktopSaveError.value = '无法连接服务器，当前使用本地缓存';
    } finally {
      if (sessionVersion !== desktopSessionVersion || currentUserId !== normalizedUserId) return;

      desktopLoading.value = false;
      await nextTick();
      if (sessionVersion !== desktopSessionVersion || currentUserId !== normalizedUserId) return;

      desktopHydrated.value = true;
      applyDesktopChromeState();
      hydratePromise = null;
    }
  })();

  return hydratePromise;
};

const flushDesktopStateSave = () => {
  if (desktopSaveTimer !== null) {
    clearTimeout(desktopSaveTimer);
    desktopSaveTimer = null;
    void saveDesktopStateNow();
  }
};

const resetDesktopStateSession = () => {
  if (desktopSaveTimer !== null) {
    clearTimeout(desktopSaveTimer);
    desktopSaveTimer = null;
  }

  hydratePromise = null;
  desktopSaveInProgress = false;
  desktopSaveQueued = false;
  desktopHydrated.value = false;
  desktopLoading.value = false;
  desktopSaveError.value = '';
  desktopReadOnly.value = false;
  currentUserId = null;
  desktopSessionVersion += 1;
  desktopSaveSuppressed = true;
  applyDesktopState(cloneGuestDefaultState());
  applyDesktopChromeState();

  void nextTick().then(() => {
    desktopSaveSuppressed = false;
  });
};

const hydrateGuestDesktopState = async () => {
  if (desktopReadOnly.value && desktopHydrated.value && !currentUserId) return;

  if (desktopSaveTimer !== null) {
    clearTimeout(desktopSaveTimer);
    desktopSaveTimer = null;
  }

  hydratePromise = null;
  desktopSaveInProgress = false;
  desktopSaveQueued = false;
  currentUserId = null;
  desktopSessionVersion += 1;
  desktopSaveSuppressed = true;
  desktopReadOnly.value = true;
  desktopHydrated.value = false;
  desktopLoading.value = false;
  desktopSaveError.value = '';
  applyDesktopState(cloneDefaultState());

  await nextTick();

  desktopHydrated.value = true;
  applyDesktopChromeState();
  desktopSaveSuppressed = false;
};

const runWithoutDesktopStateSave = async (callback) => {
  desktopSaveSuppressed = true;

  try {
    callback();
    await nextTick();
  } finally {
    desktopSaveSuppressed = false;
    applyDesktopChromeState();
  }
};

watch(
  [
    desktopModules,
    folderLayouts,
    appCardOpacity,
    appCardsFullyTransparent,
    navbarOpacity,
    navbarFullyTransparent,
    navbarHidden,
    footerOpacity,
    footerFullyTransparent,
    footerHidden,
    siteLanguage,
  ],
  () => {
    applyDesktopChromeState();
    scheduleDesktopStateSave();
  },
  { deep: true }
);

export const useDesktopState = () => ({
  desktopModules,
  folderLayouts,
  appCardOpacity,
  appCardsFullyTransparent,
  navbarOpacity,
  navbarFullyTransparent,
  navbarHidden,
  footerOpacity,
  footerFullyTransparent,
  footerHidden,
  siteLanguage,
  desktopHydrated,
  desktopLoading,
  desktopSaveError,
  desktopReadOnly,
  collectDesktopState,
  applyDesktopChromeState,
  hydrateDesktopState,
  flushDesktopStateSave,
  resetDesktopStateSession,
  runWithoutDesktopStateSave,
});
