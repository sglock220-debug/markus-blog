<template>
  <div class="theme-overlay" @click="emit('close')">
    <div class="theme-panel" @click.stop @contextmenu.prevent>
      <div class="theme-header">
        <button v-if="view !== 'main'" class="icon-btn" @click="backToMain" title="返回">
          <ChevronLeftIcon size="20" />
        </button>
        <h3>{{ viewTitle }}</h3>
        <div class="header-actions">
          <div class="mode-toggle">
            <button :class="{ active: mode === 'pc' }" @click="setMode('pc')">PC</button>
            <button :class="{ active: mode === 'mobile' }" @click="setMode('mobile')">手机</button>
          </div>
          <button class="icon-btn" @click="emit('close')" title="关闭">
            <XIcon size="20" />
          </button>
        </div>
      </div>

      <div class="theme-content" @click="closeContextMenu">
        <div v-if="view === 'main'" class="theme-grid">
          <button
            v-for="(slot, index) in shortcuts"
            :key="'shortcut-' + index"
            class="theme-slot"
            :class="{ active: isShortcutActive(slot), empty: !slot }"
            @click="handleShortcutClick(index)"
            @contextmenu.prevent.stop="openShortcutMenu($event, index)"
            @mouseenter="scheduleTooltip($event, shortcutName(slot, index))"
            @mousemove="moveTooltip($event)"
            @mouseleave="hideTooltip"
          >
            <div class="slot-preview" :style="previewStyle(slot)">
              <PlusIcon v-if="!slot" size="28" />
              <div v-if="isShortcutActive(slot)" class="active-badge">使用中</div>
            </div>
            <span class="slot-label">{{ compactName(shortcutName(slot, index)) }}</span>
          </button>

          <button class="theme-slot library-slot" @click="view = 'defaults'">
            <div class="slot-preview library-preview">
              <ImagesIcon size="30" />
            </div>
            <span class="slot-label">默认壁纸库</span>
          </button>

          <button class="theme-slot library-slot" @click="view = 'custom'">
            <div class="slot-preview library-preview">
              <FolderIcon size="30" />
              <span v-if="customWallpapers.length" class="count-badge">{{ customWallpapers.length }}</span>
            </div>
            <span class="slot-label">自定义壁纸库</span>
          </button>

          <button class="theme-slot" @click="applyColor" @contextmenu.prevent.stop="openColorPicker">
            <div class="slot-preview color-preview" :style="{ backgroundColor: colorValue }">
              <PaletteIcon size="28" />
              <div v-if="currentBackgroundType === 'color'" class="active-badge">使用中</div>
            </div>
            <span class="slot-label">纯色背景</span>
          </button>
        </div>

        <div v-else-if="view === 'defaults'" class="theme-grid">
          <button
            v-for="item in defaultWallpapers"
            :key="item.id"
            class="theme-slot"
            :class="{ active: currentWallpaper === item.path, empty: !defaultExists[item.id] }"
            @click="defaultExists[item.id] && applyDefault(item)"
            @contextmenu.prevent.stop="defaultExists[item.id] && openDefaultMenu($event, item)"
          >
            <div class="slot-preview" :style="defaultExists[item.id] ? { backgroundImage: `url(${item.path})` } : {}">
              <ImageIcon v-if="!defaultExists[item.id]" size="26" />
              <div v-if="currentWallpaper === item.path" class="active-badge">使用中</div>
            </div>
            <span class="slot-label">{{ item.name }}</span>
          </button>
        </div>

        <div v-else class="theme-grid">
          <button
            v-for="(wp, index) in customSlots"
            :key="wp ? wp.id : `empty-custom-${index}`"
            class="theme-slot"
            :class="{ active: wp && isCustomActive(wp), empty: !wp }"
            @click="wp ? applyCustom(wp) : startUpload()"
            @contextmenu.prevent.stop="wp && openCustomMenu($event, wp)"
            @mouseenter="wp && scheduleTooltip($event, wp.name || '自定义壁纸')"
            @mousemove="moveTooltip($event)"
            @mouseleave="hideTooltip"
          >
            <div
              class="slot-preview"
              :class="{ 'upload-preview': !wp }"
              :style="wp ? { backgroundImage: `url(${wallpaperPreview(wp)})` } : {}"
            >
              <PlusIcon v-if="!wp" size="30" />
              <div v-if="wp && isCustomActive(wp)" class="active-badge">使用中</div>
            </div>
            <span class="slot-label">{{ wp ? compactName(wp.name || '自定义壁纸') : '上传新图' }}</span>
          </button>
        </div>
      </div>

      <div class="theme-footer">
        <p class="hint">{{ footerHint }}</p>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      hidden
      accept="image/jpeg,image/png,image/webp"
      @click.stop
      @change="handleFileSelected"
    />

    <div v-if="contextMenu" class="context-menu" :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }" @click.stop>
      <button v-for="item in contextMenu.items" :key="item.label" @click="runMenuAction(item)">
        {{ item.label }}
      </button>
    </div>

    <div v-if="tooltip.visible" class="wallpaper-tooltip" :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }">
      {{ tooltip.text }}
    </div>

    <div v-if="dialog" class="modal-overlay" @click.stop="closeDialog">
      <div class="modal-card" @click.stop>
        <div class="dialog-header">
          <h4>{{ dialog.title }}</h4>
          <button
            v-if="['source-default', 'source-custom'].includes(dialog.type)"
            class="dialog-back-btn"
            @click="backToShortcutSourceChoice"
          >
            返回
          </button>
        </div>
        <p v-if="dialog.message">{{ dialog.message }}</p>
        <input
          v-if="dialog.type === 'prompt'"
          v-model="dialogInput"
          maxlength="15"
          class="text-input"
          placeholder="1～15字"
          @keyup.enter="confirmDialog"
        />
        <div v-if="dialog.type === 'shortcut'" class="shortcut-picker">
          <button v-for="n in 6" :key="n" @click="confirmShortcut(n - 1)">快捷位 {{ n }}</button>
        </div>
        <div v-if="dialog.type === 'source'" class="source-picker">
          <button @click="chooseShortcutLibrary('default')">默认壁纸库</button>
          <button @click="chooseShortcutLibrary('custom')">自定义壁纸库</button>
        </div>
        <div v-if="dialog.type === 'source-default'" class="source-picker">
          <button
            v-for="item in defaultWallpapers"
            :key="item.id"
            :disabled="!defaultExists[item.id]"
            @click="setShortcutDefaultSource(item)"
          >
            {{ item.name }}
          </button>
        </div>
        <div v-if="dialog.type === 'source-custom'" class="source-picker">
          <button
            v-for="(wp, index) in shortcutCustomSources"
            :key="wp ? wp.id : `empty-source-custom-${index}`"
            :disabled="!wp"
            @click="wp && setShortcutSource(wp)"
          >
            {{ wp ? (wp.name || '自定义壁纸') : `空位 ${index + 1}` }}
          </button>
        </div>
        <div v-if="dialog.type === 'color'" class="color-picker">
          <input v-model="colorDraft" type="color" />
          <input v-model="colorDraft" class="text-input" placeholder="#f5f5f5" />
        </div>
        <div v-if="!['shortcut', 'source', 'source-default', 'source-custom'].includes(dialog.type)" class="modal-actions">
          <button class="btn-cancel" @click="closeDialog">取消</button>
          <button class="btn-primary" @click="confirmDialog">{{ dialog.confirmText || '确定' }}</button>
        </div>
      </div>
    </div>

    <div v-if="cropState.active" class="modal-overlay crop-overlay" @click.stop="cancelCrop">
      <div class="crop-card" @click.stop>
        <h4>{{ cropTitle }}</h4>
        <div class="crop-box">
          <img ref="cropImageRef" :src="cropState.url" alt="crop source" />
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="cancelCrop">取消</button>
          <button class="btn-primary" @click="finishCropStep">使用裁剪</button>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="toast">{{ errorMessage }}</div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import {
  ChevronLeft as ChevronLeftIcon,
  Folder as FolderIcon,
  Image as ImageIcon,
  Images as ImagesIcon,
  Palette as PaletteIcon,
  Plus as PlusIcon,
  X as XIcon,
} from '@lucide/vue';
import api from '../api';

const props = defineProps({
  currentWallpaper: String,
  currentBackgroundType: {
    type: String,
    default: 'image',
  },
  currentColor: {
    type: String,
    default: '#f5f5f5',
  },
  currentMode: {
    type: String,
    default: 'pc',
  },
  user: Object,
});

const emit = defineEmits(['close', 'select-wallpaper']);

const defaultNames = ref({});

// 默认壁纸首次显示的内置名称。
// 用户右键重命名后，defaultNames 中保存的名称优先。
const BUILTIN_DEFAULT_NAMES = Object.freeze({
  1: '教室',
  2: '操场',
  3: '海滨小镇',
  4: '林荫海景',
  5: '晨光卧室',
  6: '夏日泳池',
  7: '校园餐厅',
  8: '图书馆',
  9: '校园全景',
});

const getDefaultWallpaperName = (id) => (
  defaultNames.value[id]
  || BUILTIN_DEFAULT_NAMES[id]
  || `默认 ${id}`
);

const defaultWallpapers = computed(() => (
  Array.from({ length: 9 }, (_, index) => {
    const id = index + 1;

    return {
      id,
      name: getDefaultWallpaperName(id),
      path: `/wallpapers/default${id}.png`,
    };
  })
));

const view = ref('main');
const mode = ref(props.currentMode === 'mobile' ? 'mobile' : 'pc');
const customWallpapers = ref([]);
const shortcuts = ref([null, null, null, null, null, null]);
const colorValue = ref(props.currentColor || '#f5f5f5');
const defaultExists = reactive({});
const fileInput = ref(null);
const pendingShortcutIndex = ref(null);
const pendingUploadReplace = ref(null);
const cropImageRef = ref(null);
const cropper = ref(null);
const contextMenu = ref(null);
const dialog = ref(null);
const dialogInput = ref('');
const colorDraft = ref(colorValue.value);
const errorMessage = ref('');
const tooltip = reactive({ visible: false, x: 0, y: 0, text: '', timer: null });
const cropState = reactive({
  active: false,
  url: '',
  file: null,
  target: 'new',
  step: 'pc',
  pcBlob: null,
  mobileBlob: null,
  wallpaper: null,
});

const viewTitle = computed(() => {
  if (view.value === 'defaults') return '默认壁纸库';
  if (view.value === 'custom') return '自定义壁纸库';
  return '壁纸主题';
});

const footerHint = computed(() => {
  if (view.value === 'defaults') return '左键应用，右键设置到快捷位或重命名。缺少文件的位置会显示为空。';
  if (view.value === 'custom') return '左键应用，右键管理；上传支持 JPG、PNG、WEBP，最大 4MB。';
  return '右键快捷位或壁纸可管理，悬停名称 1 秒显示完整名称。';
});

const cropTitle = computed(() => cropState.step === 'pc' ? '裁剪 PC 壁纸（16:9）' : '裁剪手机壁纸（9:16）');
const customSlots = computed(() => {
  const slots = customWallpapers.value.slice(0, 9);
  while (slots.length < 9) slots.push(null);
  return slots;
});
const shortcutCustomSources = computed(() => {
  const sources = customWallpapers.value.slice(0, 9);
  while (sources.length < 9) sources.push(null);
  return sources;
});

const guestKey = (name) => `theme_${name}`;

const compactName = (name) => {
  const value = name || '';
  return value.length > 6 ? `${value.slice(0, 6)}...` : value;
};

const shortcutName = (slot, index) => slot?.name || `快捷位 ${index + 1}`;

const wallpaperPreview = (wp) => {
  if (!wp) return '';
  if (mode.value === 'mobile') return wp.mobile_image || wp.image || wp.pc_image || wp.original_image;
  return wp.pc_image || wp.image || wp.mobile_image || wp.original_image;
};

const customWallpaperByShortcut = (slot) => {
  if (!slot || slot.type !== 'custom') return null;
  return customWallpapers.value.find((wp) => String(wp.id) === String(slot.id)) || null;
};

const shortcutPreviewValue = (slot) => {
  if (!slot) return '';
  if (slot.type === 'custom') {
    const wp = customWallpaperByShortcut(slot);
    return wallpaperPreview(wp) || slot.value;
  }
  return slot.value;
};

const previewStyle = (slot) => {
  if (!slot) return {};
  if (slot.type === 'color') return { backgroundColor: slot.value, backgroundImage: 'none' };
  return { backgroundImage: `url(${shortcutPreviewValue(slot)})` };
};

const isShortcutActive = (slot) => {
  if (!slot) return false;
  if (slot.type === 'color') return props.currentBackgroundType === 'color' && slot.value === props.currentColor;
  return props.currentBackgroundType !== 'color' && props.currentWallpaper === shortcutPreviewValue(slot);
};

const isCustomActive = (wp) => {
  return props.currentBackgroundType !== 'color' && [
    wp.image,
    wp.pc_image,
    wp.mobile_image,
    wp.original_image,
  ].includes(props.currentWallpaper);
};

const showError = (message) => {
  errorMessage.value = message;
  window.setTimeout(() => {
    if (errorMessage.value === message) errorMessage.value = '';
  }, 2600);
};

const closeContextMenu = () => {
  contextMenu.value = null;
};

const runMenuAction = (item) => {
  closeContextMenu();
  item.action();
};

const menuPosition = (event) => ({
  x: Math.min(event.clientX, window.innerWidth - 180),
  y: Math.min(event.clientY, window.innerHeight - 180),
});

const openShortcutMenu = (event, index) => {
  const slot = shortcuts.value[index];
  const actions = [
    { label: '更换', action: () => chooseForShortcut(index) },
  ];
  if (slot) {
    actions.push(
      { label: '重命名', action: () => promptRenameShortcut(index) },
      { label: '移除快捷位', action: () => confirmRemoveShortcut(index) },
    );
  }
  contextMenu.value = { ...menuPosition(event), items: actions };
};

const openDefaultMenu = (event, item) => {
  contextMenu.value = {
    ...menuPosition(event),
    items: [
      { label: '设置到快捷位', action: () => pickShortcutFor(makeDefaultShortcut(item)) },
      { label: '重命名', action: () => promptRenameDefault(item) },
    ],
  };
};

const openCustomMenu = (event, wp) => {
  contextMenu.value = {
    ...menuPosition(event),
    items: [
      { label: '设为快捷图', action: () => pickShortcutFor(makeCustomShortcut(wp)) },
      { label: '重命名', action: () => promptRenameCustom(wp) },
      { label: '替换', action: () => confirmReplaceCustom(wp) },
      { label: '删除', action: () => confirmDeleteCustom(wp) },
      { label: '当前模式使用原图', action: () => applyCustomOriginal(wp) },
      { label: '重新裁剪当前模式', action: () => recropCurrentMode(wp) },
    ],
  };
};

const openColorPicker = () => {
  colorDraft.value = colorValue.value;
  dialog.value = { type: 'color', title: '纯色背景', confirmText: '保存并应用' };
};

const makeDefaultShortcut = (item) => ({
  type: 'default',
  value: item.path,
  name: item.name,
});

const makeCustomShortcut = (wp) => ({
  type: 'custom',
  id: wp.id,
  value: wallpaperPreview(wp),
  name: wp.name || '自定义壁纸',
});

const saveGuestState = () => {
  localStorage.setItem(guestKey('shortcuts'), JSON.stringify(shortcuts.value));
  localStorage.setItem(guestKey('custom_wallpapers'), JSON.stringify(customWallpapers.value));
  localStorage.setItem(guestKey('color'), colorValue.value);
  localStorage.setItem(guestKey('default_names'), JSON.stringify(defaultNames.value));
};

const syncThemeState = async (extra = {}) => {
  saveGuestState();
  if (!props.user) return;
  try {
    const res = await api.post('/theme/wallpapers/set/', {
      shortcuts: shortcuts.value,
      color: colorValue.value,
      mode: mode.value,
      ...extra,
    });
    hydrateThemeState(res.data);
  } catch (err) {
    showError(err.response?.data?.error || '保存壁纸设置失败');
  }
};

const hydrateThemeState = (data) => {
  customWallpapers.value = data.user_wallpapers || [];
  shortcuts.value = normalizeShortcuts(data.shortcuts);
  colorValue.value = data.current_background_color || colorValue.value;
};

const getDefaultWallpaperIdByPath = (path = '') => {
  const match = String(path).match(
    /\/wallpapers\/default(\d+)\.png(?:[?#].*)?$/i
  );

  return match ? Number(match[1]) : null;
};

const normalizeShortcuts = (value) => {
  const list = Array.isArray(value) ? value.slice(0, 6) : [];

  while (list.length < 6) {
    list.push(null);
  }

  return list.map((slot) => {
    if (!slot || slot.type !== 'default') {
      return slot;
    }

    const defaultId = getDefaultWallpaperIdByPath(slot.value);

    if (!defaultId) {
      return slot;
    }

    // 只迁移系统旧名称。
    // 用户自己给快捷位改过的名称必须保持不变。
    const isOldGeneratedName =
      !slot.name || /^默认\s*\d+$/.test(slot.name);

    if (!isOldGeneratedName) {
      return slot;
    }

    return {
      ...slot,
      name: getDefaultWallpaperName(defaultId),
    };
  });
};

const fetchWallpapers = async () => {
  defaultNames.value = JSON.parse(localStorage.getItem(guestKey('default_names')) || '{}');

  if (!props.user) {
    shortcuts.value = normalizeShortcuts(JSON.parse(localStorage.getItem(guestKey('shortcuts')) || '[]'));
    customWallpapers.value = JSON.parse(localStorage.getItem(guestKey('custom_wallpapers')) || '[]');
    colorValue.value = localStorage.getItem(guestKey('color')) || props.currentColor || '#f5f5f5';
    return;
  }

  try {
    const res = await api.get('/theme/wallpapers/');
    hydrateThemeState(res.data);
  } catch (err) {
    showError('读取壁纸失败');
  }
};

const checkDefaultWallpapers = () => {
  defaultWallpapers.value.forEach((item) => {
    const img = new Image();
    img.onload = () => { defaultExists[item.id] = true; };
    img.onerror = () => { defaultExists[item.id] = false; };
    img.src = item.path;
  });
};

const setMode = (nextMode) => {
  mode.value = nextMode;
};

const applyDefault = async (item) => {
  emit('select-wallpaper', { type: 'image', value: item.path, mode: mode.value });
  await syncThemeState({ selection_type: 'default', wallpaper: item.path });
};

const applyCustom = async (wp) => {
  const value = wallpaperPreview(wp);
  emit('select-wallpaper', { type: 'image', value, mode: mode.value });
  await syncThemeState({ selection_type: 'custom', wallpaper_id: wp.id });
};

const applyCustomOriginal = async (wp) => {
  const value = wp.original_image || wallpaperPreview(wp);
  emit('select-wallpaper', { type: 'image', value, mode: 'original' });
  await syncThemeState({ selection_type: 'custom', wallpaper_id: wp.id, mode: 'original' });
};

const applyColor = async () => {
  emit('select-wallpaper', { type: 'color', value: colorValue.value });
  await syncThemeState({ selection_type: 'color', color: colorValue.value });
};

const handleShortcutClick = (index) => {
  const slot = shortcuts.value[index];
  if (!slot) {
    chooseForShortcut(index);
    return;
  }
  if (slot.type === 'color') {
    colorValue.value = slot.value;
    applyColor();
    return;
  }
  const value = shortcutPreviewValue(slot);
  emit('select-wallpaper', { type: 'image', value, mode: mode.value });
  syncThemeState(slot.type === 'custom'
    ? { selection_type: 'custom', wallpaper_id: slot.id }
    : { selection_type: 'default', wallpaper: value });
};

const chooseForShortcut = (index) => {
  pendingShortcutIndex.value = index;
  dialog.value = {
    type: 'source',
    title: `设置快捷位 ${index + 1}`,
    message: '请选择从默认壁纸库还是自定义壁纸库更换。',
  };
};

const chooseShortcutLibrary = (library) => {
  if (library === 'default') {
    dialog.value = {
      type: 'source-default',
      title: `设置快捷位 ${pendingShortcutIndex.value + 1}`,
      message: '请选择默认壁纸。',
    };
    return;
  }

  dialog.value = {
    type: 'source-custom',
    title: `设置快捷位 ${pendingShortcutIndex.value + 1}`,
    message: '请选择自定义壁纸。',
  };
};

const backToShortcutSourceChoice = () => {
  if (pendingShortcutIndex.value === null) return;
  dialog.value = {
    type: 'source',
    title: `设置快捷位 ${pendingShortcutIndex.value + 1}`,
    message: '请选择从默认壁纸库还是自定义壁纸库更换。',
  };
};

const setShortcutDefaultSource = (item) => {
  if (pendingShortcutIndex.value === null || !defaultExists[item.id]) return;
  const index = pendingShortcutIndex.value;
  closeDialog();
  setShortcutWithConfirm(index, makeDefaultShortcut(item));
};

const setShortcutSource = (wp) => {
  if (pendingShortcutIndex.value === null) return;
  const index = pendingShortcutIndex.value;
  closeDialog();
  setShortcutWithConfirm(index, makeCustomShortcut(wp));
};

const uploadForShortcut = () => {
  const index = pendingShortcutIndex.value;
  closeDialog();
  pendingShortcutIndex.value = index;
  startUpload(index);
};

const pickShortcutFor = (shortcut) => {
  pendingShortcutIndex.value = null;
  dialog.value = {
    type: 'shortcut',
    title: '设置到快捷位',
    message: '请选择目标快捷位。',
    shortcut,
  };
};

const confirmShortcut = (index) => {
  const source = dialog.value?.shortcut;
  if (source) {
    setShortcutWithConfirm(index, source);
    return;
  }
  if (!customWallpapers.value.length) {
    closeDialog();
    pendingShortcutIndex.value = index;
    startUpload(index);
    return;
  }
  closeDialog();
  view.value = 'custom';
  showError('请在自定义壁纸上右键选择“设为快捷图”。');
};

const setShortcutWithConfirm = (index, shortcut) => {
  const apply = () => {
    shortcuts.value[index] = { ...shortcut, name: (shortcut.name || `快捷位 ${index + 1}`).slice(0, 15) };
    syncThemeState();
    closeDialog();
  };

  if (shortcuts.value[index]) {
    dialog.value = {
      type: 'confirm',
      title: '覆盖快捷位',
      message: `快捷位 ${index + 1} 已有内容，确定覆盖吗？`,
      confirmText: '覆盖',
      onConfirm: apply,
    };
    return;
  }
  apply();
};

const promptRenameShortcut = (index) => {
  dialogInput.value = shortcuts.value[index]?.name || '';
  dialog.value = {
    type: 'prompt',
    title: '重命名快捷位',
    confirmText: '保存',
    onConfirm: () => {
      const name = dialogInput.value.trim();
      if (!name || name.length > 15) {
        showError('名称限制 1～15 字');
        return;
      }
      shortcuts.value[index].name = name;
      syncThemeState();
      closeDialog();
    },
  };
};

const promptRenameDefault = (item) => {
  dialogInput.value = item.name || `默认 ${item.id}`;
  dialog.value = {
    type: 'prompt',
    title: '重命名默认壁纸',
    confirmText: '保存',
    onConfirm: () => {
      const name = dialogInput.value.trim();
      if (!name || name.length > 15) {
        showError('名称限制 1～15 字');
        return;
      }
      defaultNames.value = { ...defaultNames.value, [item.id]: name };
      shortcuts.value = shortcuts.value.map((slot) => {
        if (!slot || slot.type !== 'default' || slot.value !== item.path) return slot;
        return { ...slot, name };
      });
      syncThemeState();
      closeDialog();
    },
  };
};

const confirmRemoveShortcut = (index) => {
  dialog.value = {
    type: 'confirm',
    title: '移除快捷位',
    message: '只解除快捷绑定，不会删除原图。',
    confirmText: '移除',
    onConfirm: () => {
      shortcuts.value[index] = null;
      syncThemeState();
      closeDialog();
    },
  };
};

const promptRenameCustom = (wp) => {
  dialogInput.value = wp.name || '';
  dialog.value = {
    type: 'prompt',
    title: '重命名自定义壁纸',
    confirmText: '保存',
    onConfirm: async () => {
      const name = dialogInput.value.trim();
      if (!name || name.length > 15) {
        showError('名称限制 1～15 字');
        return;
      }
      if (!props.user) {
        wp.name = name;
        refreshShortcutsForWallpaper(wp);
        saveGuestState();
        closeDialog();
        return;
      }
      try {
        const res = await api.patch(`/wallpapers/${wp.id}/`, { name });
        Object.assign(wp, res.data);
        refreshShortcutsForWallpaper(wp);
        await syncThemeState();
        closeDialog();
      } catch (err) {
        showError(err.response?.data?.error || '重命名失败');
      }
    },
  };
};

const refreshShortcutsForWallpaper = (wp) => {
  shortcuts.value = shortcuts.value.map((slot) => {
    if (!slot || slot.type !== 'custom' || String(slot.id) !== String(wp.id)) return slot;
    return makeCustomShortcut(wp);
  });
};

const confirmReplaceCustom = (wp) => {
  dialog.value = {
    type: 'confirm',
    title: '替换自定义壁纸',
    message: '替换后会保留名称和快捷绑定，但图片内容会更新。',
    confirmText: '替换',
    onConfirm: () => {
      closeDialog();
      pendingUploadReplace.value = wp;
      startUpload();
    },
  };
};

const confirmDeleteCustom = (wp) => {
  const inUse = isCustomActive(wp);
  const linked = shortcuts.value.some((slot) => slot?.type === 'custom' && String(slot.id) === String(wp.id));
  dialog.value = {
    type: 'confirm',
    title: '删除自定义壁纸',
    message: `${inUse || linked ? '这张图正在使用或已被快捷位引用，删除后会自动回退到 default1。' : ''}确定删除吗？`,
    confirmText: '删除',
    onConfirm: () => deleteCustom(wp),
  };
};

const deleteCustom = async (wp) => {
  if (!props.user) {
    customWallpapers.value = customWallpapers.value.filter((item) => item.id !== wp.id);
    shortcuts.value = shortcuts.value.map((slot) => slot?.type === 'custom' && slot.id === wp.id ? null : slot);
    if (isCustomActive(wp)) emit('select-wallpaper', { type: 'image', value: '/wallpapers/default1.png', mode: mode.value });
    saveGuestState();
    closeDialog();
    return;
  }

  try {
    const res = await api.delete(`/wallpapers/${wp.id}/`);
    customWallpapers.value = customWallpapers.value.filter((item) => item.id !== wp.id);
    shortcuts.value = normalizeShortcuts(res.data.shortcuts);
    if (res.data.fallback_wallpaper) {
      emit('select-wallpaper', { type: 'image', value: res.data.fallback_wallpaper, mode: mode.value });
    }
    closeDialog();
  } catch (err) {
    showError(err.response?.data?.error || '删除失败');
  }
};

const startUpload = (shortcutIndex = null) => {
  pendingShortcutIndex.value = shortcutIndex;
  fileInput.value?.click();
};

const handleFileSelected = (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) {
    showError('图片大小不能超过 4MB');
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showError('仅支持 JPG、PNG、WEBP 格式');
    return;
  }
  openCropper(file, pendingUploadReplace.value ? 'replace' : 'new', pendingUploadReplace.value);
};

const openCropper = async (file, target, wallpaper = null, onlyMode = null) => {
  cropState.active = true;
  cropState.url = URL.createObjectURL(file);
  cropState.file = file;
  cropState.target = target;
  cropState.wallpaper = wallpaper;
  cropState.step = onlyMode || 'pc';
  cropState.pcBlob = null;
  cropState.mobileBlob = null;
  await nextTick();
  createCropper();
};

const createCropper = () => {
  cropper.value?.destroy();
  cropper.value = new Cropper(cropImageRef.value, {
    aspectRatio: cropState.step === 'pc' ? 16 / 9 : 9 / 16,
    viewMode: 1,
    autoCropArea: 1,
    background: false,
  });
};

const canvasToBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));

const finishCropStep = async () => {
  const canvas = cropper.value.getCroppedCanvas({
    width: cropState.step === 'pc' ? 1920 : 1080,
    height: cropState.step === 'pc' ? 1080 : 1920,
  });
  const blob = await canvasToBlob(canvas);

  if (cropState.step === 'pc') {
    cropState.pcBlob = blob;
    if (cropState.target === 'recrop') {
      await saveRecrop('pc', blob);
      return;
    }
    cropState.step = 'mobile';
    await nextTick();
    createCropper();
    return;
  }

  cropState.mobileBlob = blob;
  if (cropState.target === 'recrop') {
    await saveRecrop('mobile', blob);
    return;
  }
  await saveCroppedWallpaper();
};

const blobFile = (blob, name) => new File([blob], name, { type: 'image/webp' });

const saveCroppedWallpaper = async () => {
  const baseName = (cropState.file.name.replace(/\.[^.]+$/, '') || '自定义壁纸').slice(0, 15);

  if (!props.user) {
    const original = await fileToDataUrl(cropState.file);
    const pc = await blobToDataUrl(cropState.pcBlob);
    const mobile = await blobToDataUrl(cropState.mobileBlob);
    const wp = {
      id: `guest-${Date.now()}`,
      name: baseName,
      image: pc,
      original_image: original,
      pc_image: pc,
      mobile_image: mobile,
    };
    if (cropState.target === 'replace' && cropState.wallpaper) {
      Object.assign(cropState.wallpaper, wp, { id: cropState.wallpaper.id, name: cropState.wallpaper.name });
      refreshShortcutsForWallpaper(cropState.wallpaper);
    } else {
      customWallpapers.value.unshift(wp);
      if (pendingShortcutIndex.value !== null) setShortcutWithConfirm(pendingShortcutIndex.value, makeCustomShortcut(wp));
    }
    saveGuestState();
    closeCropper();
    view.value = 'custom';
    return;
  }

  const formData = new FormData();
  formData.append('name', cropState.wallpaper?.name || baseName);
  formData.append('original_image', cropState.file);
  formData.append('pc_image', blobFile(cropState.pcBlob, `${baseName}-pc.webp`));
  formData.append('mobile_image', blobFile(cropState.mobileBlob, `${baseName}-mobile.webp`));
  formData.append('image', blobFile(cropState.pcBlob, `${baseName}.webp`));

  try {
    const res = cropState.target === 'replace' && cropState.wallpaper
      ? await api.patch(`/wallpapers/${cropState.wallpaper.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      : await api.post('/wallpapers/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

    if (cropState.target === 'replace' && cropState.wallpaper) {
      Object.assign(cropState.wallpaper, res.data);
      refreshShortcutsForWallpaper(cropState.wallpaper);
    } else {
      customWallpapers.value.unshift(res.data);
      if (pendingShortcutIndex.value !== null) setShortcutWithConfirm(pendingShortcutIndex.value, makeCustomShortcut(res.data));
    }
    await syncThemeState();
    closeCropper();
    view.value = 'custom';
  } catch (err) {
    showError(err.response?.data?.error || '上传失败');
  } finally {
    pendingUploadReplace.value = null;
  }
};

const recropCurrentMode = async (wp) => {
  if (!wp.original_image) {
    showError('没有可用原图');
    return;
  }
  const response = await fetch(wp.original_image);
  const blob = await response.blob();
  const file = new File([blob], `${wp.name || 'wallpaper'}-original`, { type: blob.type || 'image/png' });
  openCropper(file, 'recrop', wp, mode.value);
};

const saveRecrop = async (targetMode, blob) => {
  const wp = cropState.wallpaper;
  if (!wp) return;
  const field = targetMode === 'mobile' ? 'mobile_image' : 'pc_image';

  if (!props.user) {
    wp[field] = await blobToDataUrl(blob);
    if (targetMode === 'pc') wp.image = wp.pc_image;
    refreshShortcutsForWallpaper(wp);
    saveGuestState();
    closeCropper();
    return;
  }

  const formData = new FormData();
  formData.append(field, blobFile(blob, `${wp.name || 'wallpaper'}-${targetMode}.webp`));
  if (targetMode === 'pc') formData.append('image', blobFile(blob, `${wp.name || 'wallpaper'}.webp`));
  try {
    const res = await api.patch(`/wallpapers/${wp.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    Object.assign(wp, res.data);
    refreshShortcutsForWallpaper(wp);
    await syncThemeState();
    closeCropper();
  } catch (err) {
    showError(err.response?.data?.error || '重新裁剪失败');
  }
};

const fileToDataUrl = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(file);
});

const blobToDataUrl = (blob) => fileToDataUrl(blob);

const cancelCrop = () => {
  closeCropper();
  pendingUploadReplace.value = null;
};

const closeCropper = () => {
  cropper.value?.destroy();
  cropper.value = null;
  if (cropState.url) URL.revokeObjectURL(cropState.url);
  cropState.active = false;
  cropState.url = '';
};

const closeDialog = () => {
  dialog.value = null;
  dialogInput.value = '';
};

const confirmDialog = () => {
  if (dialog.value?.type === 'color') {
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colorDraft.value)) {
      showError('请输入正确的 HEX 颜色');
      return;
    }
    colorValue.value = colorDraft.value;
    closeDialog();
    applyColor();
    return;
  }
  dialog.value?.onConfirm?.();
};

const scheduleTooltip = (event, text) => {
  hideTooltip();
  tooltip.text = text;
  tooltip.x = event.clientX + 14;
  tooltip.y = event.clientY + 14;
  tooltip.timer = window.setTimeout(() => {
    tooltip.visible = true;
  }, 1000);
};

const moveTooltip = (event) => {
  tooltip.x = event.clientX + 14;
  tooltip.y = event.clientY + 14;
};

const hideTooltip = () => {
  if (tooltip.timer) window.clearTimeout(tooltip.timer);
  tooltip.visible = false;
  tooltip.timer = null;
};

const backToMain = () => {
  view.value = 'main';
  closeContextMenu();
};

const handleKeydown = (event) => {
  if (event.key !== 'Escape') return;
  if (cropState.active) cancelCrop();
  else if (dialog.value) closeDialog();
  else if (contextMenu.value) closeContextMenu();
  else emit('close');
};

onMounted(() => {
  fetchWallpapers();
  checkDefaultWallpapers();
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  hideTooltip();
  cropper.value?.destroy();
});
</script>

<style scoped>
.theme-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(8px);
}

.theme-panel {
  width: min(560px, 100%);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: 24px;
  background: var(--card-bg);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.28);
}

.theme-header {
  height: 72px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--border-color);
}

.theme-header h3 {
  margin: 0;
  flex: 1;
  color: var(--text-color);
  font-size: 1.2rem;
}

.header-actions,
.mode-toggle,
.modal-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mode-toggle {
  padding: 3px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-color);
}

.mode-toggle button {
  border: 0;
  border-radius: 9px;
  padding: 6px 10px;
  cursor: pointer;
  color: var(--secondary-text);
  background: transparent;
}

.mode-toggle button.active {
  color: white;
  background: var(--accent-color);
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: var(--bg-color);
  color: var(--text-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.theme-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.scroll-grid {
  max-height: 58vh;
  overflow-y: auto;
  padding-right: 4px;
}

.theme-slot {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--secondary-text);
}

.theme-slot:hover {
  transform: translateY(-3px);
}

.slot-preview {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 2px solid transparent;
  border-radius: 12px;
  background-color: var(--bg-color);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  color: var(--secondary-text);
}

.theme-slot.active .slot-preview {
  border-color: var(--accent-color);
}

.theme-slot.empty .slot-preview,
.upload-preview,
.library-preview {
  border-style: dashed;
  border-color: var(--border-color);
}

.color-preview {
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}

.slot-label {
  max-width: 100%;
  font-size: 0.78rem;
  color: var(--secondary-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.active-badge,
.count-badge {
  position: absolute;
  top: 6px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--accent-color);
  color: white;
  font-size: 0.62rem;
}

.active-badge {
  left: 6px;
}

.count-badge {
  right: 6px;
}

.theme-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-color);
}

.hint {
  margin: 0;
  text-align: center;
  color: var(--secondary-text);
  font-size: 0.75rem;
}

.context-menu {
  position: fixed;
  z-index: 7000;
  width: 168px;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  box-shadow: 0 14px 35px rgba(0, 0, 0, 0.22);
}

.context-menu button {
  width: 100%;
  border: 0;
  border-radius: 8px;
  padding: 9px 10px;
  background: transparent;
  color: var(--text-color);
  text-align: left;
  cursor: pointer;
}

.context-menu button:hover {
  background: var(--bg-color);
}

.wallpaper-tooltip {
  position: fixed;
  z-index: 7100;
  max-width: 220px;
  padding: 7px 10px;
  border-radius: 9px;
  color: white;
  background: rgba(0, 0, 0, 0.78);
  font-size: 0.78rem;
  pointer-events: none;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 6500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.45);
}

.modal-card,
.crop-card {
  width: min(420px, 100%);
  padding: 24px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: var(--card-bg);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.25);
}

.modal-card h4,
.crop-card h4 {
  margin: 0;
  color: var(--text-color);
}

.dialog-header {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dialog-back-btn {
  border: 0;
  border-radius: 999px;
  padding: 6px 12px;
  background: var(--bg-color);
  color: var(--text-color);
  cursor: pointer;
  font-weight: 600;
}

.modal-card p {
  margin: 0 0 18px;
  color: var(--secondary-text);
  line-height: 1.5;
}

.text-input {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 18px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-color);
  color: var(--text-color);
}

.shortcut-picker,
.source-picker {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.shortcut-picker button,
.source-picker button,
.btn-cancel,
.btn-primary {
  border: 0;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 600;
}

.source-picker button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.shortcut-picker button,
.source-picker button,
.btn-cancel {
  color: var(--text-color);
  background: var(--bg-color);
}

.btn-primary {
  color: white;
  background: var(--accent-color);
}

.color-picker {
  display: grid;
  gap: 12px;
}

.color-picker input[type="color"] {
  width: 100%;
  height: 52px;
  border: 0;
  background: transparent;
}

.crop-card {
  width: min(820px, 100%);
}

.crop-box {
  height: min(58vh, 520px);
  overflow: hidden;
  background: #111;
}

.crop-box img {
  display: block;
  max-width: 100%;
}

.crop-card .modal-actions {
  justify-content: flex-end;
  margin-top: 18px;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  z-index: 8000;
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.82);
  color: white;
  font-size: 0.86rem;
}

@media (max-width: 520px) {
  .theme-grid {
    gap: 12px;
  }

  .theme-header {
    padding: 0 14px;
  }

  .theme-content {
    padding: 18px;
  }

  .mode-toggle button {
    padding: 5px 8px;
  }
}
</style>
