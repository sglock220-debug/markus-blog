<template>
  <div 
    class="home-desktop" 
    @click="handleGlobalClick"
    :style="{ '--app-card-opacity': appOpacity / 100 }"
    :class="{ 'cards-fully-transparent': cardsFullyTransparent }"
  >
    <div class="desktop-container">
      <div class="desktop-grid">
        <!-- Grid Cells (Background) -->
        <div 
          v-for="cell in GRID_CELL_COUNT" 
          :key="'cell-' + cell"
          class="grid-cell"
          :class="{ 'can-drop': movingModuleId !== null }"
          :style="getCellStyle((cell - 1) % GRID_COLUMNS, Math.floor((cell - 1) / GRID_COLUMNS))"
          @click="handleCellClick((cell - 1) % GRID_COLUMNS, Math.floor((cell - 1) / GRID_COLUMNS))"
        ></div>

        <!-- Modules -->
        <div 
          v-for="module in modules"
          :key="module.id"
          class="app-module"
          :class="{ 
            'is-moving': movingModuleId === module.id,
            'is-target': movingModuleId !== null && movingModuleId !== module.id
          }"
          :style="getCellStyle(module.x, module.y)"
          @click.stop="handleModuleClick(module)"
        >
          <div 
            :class="cardsFullyTransparent ? 'module-transparent' : 'module-inner'"
          >
            <button 
              class="move-btn" 
              @click.stop="startMoving(module.id)"
              title="移动/交换"
            >
              <GripVerticalIcon size="14" />
            </button>
            <div class="module-icon">
              <component :is="module.icon" aria-hidden="true" />
            </div>
            <div 
              class="module-title" 
              :class="{ 
                'force-black-title': cardsFullyTransparent || appOpacity <= 20 
              }" 
            > 
              {{ module.title }} 
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Folder Popups -->
    <Teleport to="body">
      <div v-if="activeFolder" class="folder-overlay" @click="closeFolder">
        <div :class="['folder-panel', { 'study-panel': activeFolder === 'study' }]" @click.stop>
          <div class="folder-header">
            <h3>{{ activeFolder === 'settings' ? '设置' : (activeFolder === 'study' ? '学习系统' : '扩展') }}</h3>
          </div>
          <div :class="['folder-grid', { 'study-layout': activeFolder === 'study' }]">
            <!-- Grid Slots (Folder) - Only for 3x3 folders -->
            <template v-if="activeFolder !== 'study' && activeFolder !== 'settings'">
              <div 
                v-for="pos in 9" 
                :key="'slot-' + pos"
                class="folder-slot"
                :class="{ 'can-drop': movingFolderItemId !== null }"
                :style="getFolderSlotStyle(pos - 1)"
                @click="handleFolderSlotClick(pos - 1)"
              >
              </div>
            </template>

            <!-- Folder Items -->
        <template v-if="activeFolder === 'settings'">
          <div class="settings-panel-content">
            <div class="setting-item">
              <label>功能框透明度</label>
              <div class="setting-control">
                <button 
                  type="button" 
                  class="full-transparent-btn" 
                  :class="{ active: cardsFullyTransparent }" 
                  @click="toggleFullyTransparent" 
                > 
                  全透明 
                </button> 
                <input 
                  type="range" 
                  v-model.number="appOpacity" 
                  min="0" 
                  max="100" 
                  step="1"
                  @input="saveOpacity"
                  :disabled="cardsFullyTransparent"
                />
                <label
                  class="percent-editor"
                  :class="{ disabled: cardsFullyTransparent }"
                  :style="{ opacity: cardsFullyTransparent ? 0.4 : 1 }"
                >
                  <input
                    type="number"
                    v-model.number="appOpacity"
                    min="0"
                    max="100"
                    step="1"
                    @input="saveOpacity"
                    :disabled="cardsFullyTransparent"
                  />
                  <span>%</span>
                </label>
              </div>
            </div>
            <div class="setting-item">
              <label>导航栏透明度</label>
              <div class="setting-control">
                <button
                  type="button"
                  class="full-transparent-btn"
                  :class="{ active: navbarHidden }"
                  @click="toggleNavbarHidden"
                >
                  隐藏
                </button>
                <button
                  type="button"
                  class="full-transparent-btn"
                  :class="{ active: navbarFullyTransparent }"
                  @click="toggleNavbarFullyTransparent"
                >
                  全透明
                </button>
                <input
                  type="range"
                  v-model.number="navbarOpacity"
                  min="0"
                  max="100"
                  step="1"
                  @input="saveNavbarOpacity"
                  :disabled="navbarFullyTransparent || navbarHidden"
                />
                <label
                  class="percent-editor"
                  :class="{ disabled: navbarFullyTransparent || navbarHidden }"
                  :style="{ opacity: navbarFullyTransparent || navbarHidden ? 0.4 : 1 }"
                >
                  <input
                    type="number"
                    v-model.number="navbarOpacity"
                    min="0"
                    max="100"
                    step="1"
                    @input="saveNavbarOpacity"
                    :disabled="navbarFullyTransparent || navbarHidden"
                  />
                  <span>%</span>
                </label>
              </div>
            </div>
            <div class="setting-item">
              <label>版权栏透明度</label>
              <div class="setting-control">
                <button
                  type="button"
                  class="full-transparent-btn"
                  :class="{ active: footerHidden }"
                  @click="toggleFooterHidden"
                >
                  隐藏
                </button>
                <button
                  type="button"
                  class="full-transparent-btn"
                  :class="{ active: footerFullyTransparent }"
                  @click="toggleFooterFullyTransparent"
                >
                  全透明
                </button>
                <input
                  type="range"
                  v-model.number="footerOpacity"
                  min="0"
                  max="100"
                  step="1"
                  @input="saveFooterOpacity"
                  :disabled="footerFullyTransparent || footerHidden"
                />
                <label
                  class="percent-editor"
                  :class="{ disabled: footerFullyTransparent || footerHidden }"
                  :style="{ opacity: footerFullyTransparent || footerHidden ? 0.4 : 1 }"
                >
                  <input
                    type="number"
                    v-model.number="footerOpacity"
                    min="0"
                    max="100"
                    step="1"
                    @input="saveFooterOpacity"
                    :disabled="footerFullyTransparent || footerHidden"
                  />
                  <span>%</span>
                </label>
              </div>
            </div>
            <div class="setting-item">
              <label>网站语言</label>
              <div class="setting-control">
                <select v-model="siteLanguage" @change="saveLanguage">
                  <option value="zh-CN">中文（简体）</option>
                </select>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div 
            v-for="item in currentFolderItems" 
            :key="item.id"
            class="folder-item"
            :class="{ 
              'is-moving': movingFolderItemId === item.id,
              'is-target': movingFolderItemId !== null && movingFolderItemId !== item.id
            }"
            :style="getFolderSlotStyle(item.pos)"
            @click.stop="handleFolderItemClick(item)"
          >
            <button 
              class="move-btn-mini" 
              @click.stop="startMovingFolderItem(item.id)"
            >
              <GripVerticalIcon size="12" />
            </button>
            <div class="item-icon">
              <component :is="item.icon" aria-hidden="true" />
            </div>
            <div class="item-title">{{ item.title }}</div>
          </div>
        </template>
      </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  Bot as BotIcon,
  BookOpen as BookOpenIcon,
  Camera as CameraIcon,
  ClipboardList as ClipboardListIcon,
  Film as FilmIcon,
  Gamepad2 as Gamepad2Icon,
  Globe as GlobeIcon,
  GraduationCap as GraduationCapIcon,
  GripVertical as GripVerticalIcon,
  Image as ImageIcon,
  Languages as LanguagesIcon,
  Music as MusicIcon,
  NotebookPen as NotebookPenIcon,
  Puzzle as PuzzleIcon,
  Settings as SettingsIcon,
  Sparkles as SparklesIcon,
  Target as TargetIcon,
  User as UserIcon,
  Users as UsersIcon,
} from '@lucide/vue';
import { useDesktopState } from '../../composables/useDesktopState';

const router = useRouter();
const {
  desktopModules: moduleLayouts,
  folderLayouts,
  appCardOpacity: appOpacity,
  appCardsFullyTransparent: cardsFullyTransparent,
  navbarOpacity,
  navbarFullyTransparent,
  navbarHidden,
  footerOpacity,
  footerFullyTransparent,
  footerHidden,
  siteLanguage,
  applyDesktopChromeState,
  desktopHydrated,
  flushDesktopStateSave,
  runWithoutDesktopStateSave,
} = useDesktopState();

const GRID_COLUMNS = 11; 
const GRID_ROWS = 5; 
const GRID_CELL_COUNT = GRID_COLUMNS * GRID_ROWS;

const isMobile = ref(window.innerWidth <= 600);

const MODULE_REGISTRY = {
  study: { title: '学习系统', icon: BookOpenIcon, type: 'folder', folderType: 'study', x: 0, y: 1 },
  cinema: { title: '影厅', icon: FilmIcon, route: '/cinema', type: 'route', x: 1, y: 1 },
  notes: { title: '笔记', icon: NotebookPenIcon, route: '/notes', type: 'route', x: 2, y: 1 },
  camera: { title: '相机', icon: CameraIcon, route: '/cyber-camera', type: 'route', x: 3, y: 1 },
  wallpaper: { title: '壁纸主题', icon: ImageIcon, type: 'action', action: 'wallpaper', x: 0, y: 2 },
  'ai-chat': { title: 'AI聊天助手', icon: BotIcon, route: '/ai-chat', type: 'route', x: 1, y: 2 },
  games: { title: '娱乐游戏', icon: Gamepad2Icon, route: '/games', type: 'route', x: 2, y: 2 },
  friends: { title: '交友', icon: UsersIcon, route: '/friends', type: 'route', x: 3, y: 2 },
  music: { title: '音乐', icon: MusicIcon, type: 'action', action: 'music', x: 0, y: 3 },
  profile: { title: '个人主页', icon: UserIcon, route: '/profile', type: 'route', x: 1, y: 3 },
  settings: { title: '设置', icon: SettingsIcon, type: 'folder', folderType: 'settings', x: 2, y: 3 },
  extensions: { title: '扩展', icon: PuzzleIcon, type: 'folder', folderType: 'extensions', x: 3, y: 3 },
  'ai-translate': { title: 'AI翻译助手', icon: LanguagesIcon, route: '/ai-chat', type: 'route', x: 4, y: 2 },
  memo: { title: '备忘', icon: ClipboardListIcon, route: '/notes', type: 'route', x: 4, y: 3 },
};

const FOLDER_ITEM_REGISTRY = {
  settings: {},
  study: {
    'study-language': { title: '语言学习', icon: GlobeIcon, action: 'study-language', x: 0, y: 0 },
    'study-professional': { title: '专业学习', icon: GraduationCapIcon, action: 'study-professional', x: 1, y: 0 },
    'study-interest': { title: '兴趣学习', icon: TargetIcon, action: 'study-interest', x: 2, y: 0 },
  },
  extensions: {
    'ai-translate': { title: 'AI翻译助手', icon: LanguagesIcon, route: '/ai-chat', x: 0, y: 0 },
    memo: { title: '备忘', icon: ClipboardListIcon, route: '/notes', x: 1, y: 0 },
    assistant: { title: '智能助手', icon: SparklesIcon, route: '/ai-chat', x: 2, y: 0 },
  },
};

const movingModuleId = ref(null);
const activeFolder = ref(null);
const currentFolderItems = ref([]);
const movingFolderItemId = ref(null);

const getModuleKey = (module) => String(module?.module_key || module?.id || '');
const getItemKey = (item) => String(item?.module_key || item?.id || '');
const folderPositionToXY = (pos) => ({
  x: pos % 3,
  y: Math.floor(pos / 3),
});
const xyToFolderPosition = (x, y) => y * 3 + x;

const defaultModuleLayouts = () => Object.entries(MODULE_REGISTRY).map(([moduleKey, module], index) => ({
  id: moduleKey,
  module_key: moduleKey,
  x: module.x,
  y: module.y,
  width: 1,
  height: 1,
  order: index,
  visible: true,
}));

const normalizeGridCoordinate = (value, max, fallback) => {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 0 || numberValue >= max) return fallback;
  return numberValue;
};

const layoutForModule = (rawLayout, fallbackLayout, fallbackOrder) => {
  const moduleKey = getModuleKey(rawLayout) || fallbackLayout.module_key;

  return {
    id: moduleKey,
    module_key: moduleKey,
    x: normalizeGridCoordinate(rawLayout?.x, GRID_COLUMNS, fallbackLayout.x),
    y: normalizeGridCoordinate(rawLayout?.y, GRID_ROWS, fallbackLayout.y),
    width: Number.isInteger(Number(rawLayout?.width)) && Number(rawLayout.width) > 0 ? Number(rawLayout.width) : 1,
    height: Number.isInteger(Number(rawLayout?.height)) && Number(rawLayout.height) > 0 ? Number(rawLayout.height) : 1,
    order: Number.isInteger(Number(rawLayout?.order)) ? Number(rawLayout.order) : fallbackOrder,
    visible: rawLayout?.visible !== false,
  };
};

const findEmptyModuleCell = (currentModules) => {
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLUMNS; x++) {
      if (!currentModules.some(m => m.x === x && m.y === y)) {
        return { x, y };
      }
    }
  }
  return null;
};

const sanitizeModuleLayouts = (rawLayouts) => {
  const defaults = defaultModuleLayouts();
  const rawByKey = new Map();

  if (Array.isArray(rawLayouts)) {
    rawLayouts.forEach((rawLayout) => {
      const moduleKey = getModuleKey(rawLayout);
      if (MODULE_REGISTRY[moduleKey] && !rawByKey.has(moduleKey)) {
        rawByKey.set(moduleKey, rawLayout);
      }
    });
  }

  const validLayouts = [];
  const invalidLayouts = [];

  defaults.forEach((defaultLayout, index) => {
    const layout = layoutForModule(rawByKey.get(defaultLayout.module_key), defaultLayout, index);
    const isOccupied = validLayouts.some(item => item.x === layout.x && item.y === layout.y);

    if (isOccupied) {
      invalidLayouts.push(layout);
    } else {
      validLayouts.push(layout);
    }
  });

  invalidLayouts.forEach((layout) => {
    const emptyCell = findEmptyModuleCell(validLayouts);
    if (emptyCell) {
      validLayouts.push({ ...layout, ...emptyCell });
    }
  });

  return validLayouts.sort((a, b) => a.order - b.order);
};

const mergeModuleLayout = (layout) => {
  const moduleKey = getModuleKey(layout);
  const registryModule = MODULE_REGISTRY[moduleKey];
  if (!registryModule) return null;

  return {
    ...registryModule,
    ...layout,
    id: moduleKey,
    module_key: moduleKey,
    icon: registryModule.icon,
    title: registryModule.title,
  };
};

const modules = computed(() => moduleLayouts.value
  .map(mergeModuleLayout)
  .filter(module => module && module.visible !== false));

const defaultFolderLayouts = (folderType) => Object.entries(FOLDER_ITEM_REGISTRY[folderType] || {}).map(([itemKey, item], index) => ({
  id: itemKey,
  module_key: itemKey,
  x: item.x,
  y: item.y,
  width: 1,
  height: 1,
  order: index,
  visible: true,
}));

const layoutForFolderItem = (rawLayout, fallbackLayout, fallbackOrder) => {
  const itemKey = getItemKey(rawLayout) || fallbackLayout.module_key;
  const fallbackPos = xyToFolderPosition(fallbackLayout.x, fallbackLayout.y);
  const hasLegacyPos = Number.isInteger(Number(rawLayout?.pos));
  const legacyXY = hasLegacyPos ? folderPositionToXY(Number(rawLayout.pos)) : null;

  return {
    id: itemKey,
    module_key: itemKey,
    x: normalizeGridCoordinate(rawLayout?.x ?? legacyXY?.x, 3, fallbackLayout.x),
    y: normalizeGridCoordinate(rawLayout?.y ?? legacyXY?.y, 3, fallbackLayout.y),
    width: Number.isInteger(Number(rawLayout?.width)) && Number(rawLayout.width) > 0 ? Number(rawLayout.width) : 1,
    height: Number.isInteger(Number(rawLayout?.height)) && Number(rawLayout.height) > 0 ? Number(rawLayout.height) : 1,
    order: Number.isInteger(Number(rawLayout?.order)) ? Number(rawLayout.order) : fallbackOrder,
    visible: rawLayout?.visible !== false,
  };
};

const sanitizeFolderLayoutsForType = (folderType, rawLayouts) => {
  const defaults = defaultFolderLayouts(folderType);
  const rawByKey = new Map();

  if (Array.isArray(rawLayouts)) {
    rawLayouts.forEach((rawLayout) => {
      const itemKey = getItemKey(rawLayout);
      if (FOLDER_ITEM_REGISTRY[folderType]?.[itemKey] && !rawByKey.has(itemKey)) {
        rawByKey.set(itemKey, rawLayout);
      }
    });
  }

  const usedPositions = new Set();

  return defaults
    .map((defaultLayout, index) => layoutForFolderItem(rawByKey.get(defaultLayout.module_key), defaultLayout, index))
    .map((layout) => {
      let x = layout.x;
      let y = layout.y;
      let posKey = `${x}:${y}`;

      if (usedPositions.has(posKey)) {
        for (let pos = 0; pos < 9; pos += 1) {
          const nextXY = folderPositionToXY(pos);
          posKey = `${nextXY.x}:${nextXY.y}`;
          if (!usedPositions.has(posKey)) {
            x = nextXY.x;
            y = nextXY.y;
            break;
          }
        }
      }

      usedPositions.add(`${x}:${y}`);
      return { ...layout, x, y };
    })
    .sort((a, b) => a.order - b.order);
};

const mergeFolderItemLayout = (folderType, layout) => {
  const itemKey = getItemKey(layout);
  const registryItem = FOLDER_ITEM_REGISTRY[folderType]?.[itemKey];
  if (!registryItem) return null;

  return {
    ...registryItem,
    ...layout,
    id: itemKey,
    module_key: itemKey,
    icon: registryItem.icon,
    title: registryItem.title,
    pos: xyToFolderPosition(layout.x, layout.y),
  };
};

const serializeFolderItemLayout = (item) => ({
  id: item.module_key,
  module_key: item.module_key,
  x: item.x,
  y: item.y,
  width: item.width || 1,
  height: item.height || 1,
  order: item.order || 0,
  visible: item.visible !== false,
});

const getCellStyle = (desktopX, desktopY) => { 
  const mobile = isMobile.value;
  const gap = mobile ? 8 : 12; 
  
  let x = desktopX;
  let y = desktopY;
  let cols = GRID_COLUMNS;
  let rows = GRID_ROWS;

  if (mobile) {
    cols = 5;
    rows = Math.ceil(GRID_CELL_COUNT / 5);
    const index = desktopY * GRID_COLUMNS + desktopX;
    x = index % cols;
    y = Math.floor(index / cols);
  }

  return { 
    width: `calc((100% - ${(cols - 1) * gap}px) / ${cols})`, 
    height: `calc((100% - ${(rows - 1) * gap}px) / ${rows})`, 
    left: `calc(${x} * ((100% - ${(cols - 1) * gap}px) / ${cols} + ${gap}px))`, 
    top: `calc(${y} * ((100% - ${(rows - 1) * gap}px) / ${rows} + ${gap}px))` 
  }; 
}; 

const getFolderSlotStyle = (pos) => ({ 
  gridColumnStart: (pos % 3) + 1, 
  gridColumnEnd: (pos % 3) + 2, 
  gridRowStart: Math.floor(pos / 3) + 1, 
  gridRowEnd: Math.floor(pos / 3) + 2 
});

const handleResize = () => {
  isMobile.value = window.innerWidth <= 600;
};

const initializeDesktopModules = async () => {
  if (!desktopHydrated.value) return;

  applyDesktopChromeState();

  const sanitizedLayouts = sanitizeModuleLayouts(moduleLayouts.value);

  if (moduleLayouts.value.length) {
      moduleLayouts.value = sanitizedLayouts;
      saveLayout();
  } else {
    await runWithoutDesktopStateSave(() => {
      moduleLayouts.value = sanitizedLayouts;
    });
  }
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  void initializeDesktopModules();
});

watch(
  desktopHydrated,
  (hydrated) => {
    if (hydrated) {
      void initializeDesktopModules();
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  flushDesktopStateSave();
});

const saveLayout = () => {};

const startMoving = (id) => {
  movingModuleId.value = id;
};

const startMovingFolderItem = (id) => {
  movingFolderItemId.value = id;
};

const handleGlobalClick = () => {
  movingModuleId.value = null;
  movingFolderItemId.value = null;
};

const loadFolderItems = (folderType) => {
  const saved = folderLayouts.value[folderType];
  const layouts = sanitizeFolderLayoutsForType(folderType, saved);
  currentFolderItems.value = layouts
    .map(layout => mergeFolderItemLayout(folderType, layout))
    .filter(Boolean);

  if (Array.isArray(saved)) {
    saveFolderLayout();
  }
};

const saveFolderLayout = () => {
  if (activeFolder.value) {
    folderLayouts.value = {
      ...folderLayouts.value,
      [activeFolder.value]: currentFolderItems.value.map(serializeFolderItemLayout),
    };
  }
};

const handleModuleClick = (module) => {
  if (movingModuleId.value) {
    if (movingModuleId.value !== module.id) {
      // Swap positions
      const m1 = moduleLayouts.value.find(m => getModuleKey(m) === movingModuleId.value);
      const m2 = moduleLayouts.value.find(m => getModuleKey(m) === module.module_key);
      if (!m1 || !m2) {
        movingModuleId.value = null;
        return;
      }
      const tempX = m1.x;
      const tempY = m1.y;
      m1.x = m2.x;
      m1.y = m2.y;
      m2.x = tempX;
      m2.y = tempY;
      saveLayout();
    }
    movingModuleId.value = null;
    return;
  }

  if (module.type === 'route') {
    router.push(module.route);
  } else if (module.type === 'folder') {
    activeFolder.value = module.folderType;
    loadFolderItems(module.folderType);
  } else if (module.type === 'action') {
    if (module.action === 'wallpaper') {
      window.dispatchEvent(new CustomEvent('open-theme-popup'));
    } else if (module.action === 'music') {
      window.dispatchEvent(new CustomEvent('open-music-player'));
    }
  }
};

const saveOpacity = () => {
  appOpacity.value = Math.min(100, Math.max(0, Number(appOpacity.value)));
};

const toggleFullyTransparent = () => { 
  cardsFullyTransparent.value = !cardsFullyTransparent.value; 
};

const saveNavbarOpacity = () => {
  navbarOpacity.value = Math.min(100, Math.max(0, Number(navbarOpacity.value)));
  applyDesktopChromeState();
};

const toggleNavbarFullyTransparent = () => {
  navbarFullyTransparent.value = !navbarFullyTransparent.value;
  applyDesktopChromeState();
};

const toggleNavbarHidden = () => {
  navbarHidden.value = !navbarHidden.value;
  applyDesktopChromeState();
};

const saveFooterOpacity = () => {
  footerOpacity.value = Math.min(100, Math.max(0, Number(footerOpacity.value)));
  applyDesktopChromeState();
};

const toggleFooterFullyTransparent = () => {
  footerFullyTransparent.value = !footerFullyTransparent.value;
  applyDesktopChromeState();
};

const toggleFooterHidden = () => {
  footerHidden.value = !footerHidden.value;
  applyDesktopChromeState();
};

const saveLanguage = () => {};

const handleFolderItemClick = (item) => {
  if (movingFolderItemId.value) {
    const movingItem = currentFolderItems.value.find(i => i.id === movingFolderItemId.value);

    if (!movingItem) {
      movingFolderItemId.value = null;
      return;
    }

    if (movingItem.id !== item.id) {
      const oldX = movingItem.x;
      const oldY = movingItem.y;
      movingItem.x = item.x;
      movingItem.y = item.y;
      movingItem.pos = item.pos;
      item.x = oldX;
      item.y = oldY;
      item.pos = xyToFolderPosition(item.x, item.y);
      saveFolderLayout();
    }

    movingFolderItemId.value = null;
    return;
  }

  if (item.action) {
    handleFolderAction(item.action);
  } else if (item.route) {
    router.push(item.route);
    closeFolder();
  }
};

const handleFolderSlotClick = (pos) => {
  if (!movingFolderItemId.value) return;

  const movingItem = currentFolderItems.value.find(i => i.id === movingFolderItemId.value);
  if (!movingItem) {
    movingFolderItemId.value = null;
    return;
  }

  const targetItem = currentFolderItems.value.find(i => i.id !== movingFolderItemId.value && i.pos === pos);
  const targetXY = folderPositionToXY(pos);

  if (targetItem) {
    const oldX = movingItem.x;
    const oldY = movingItem.y;
    movingItem.x = targetItem.x;
    movingItem.y = targetItem.y;
    movingItem.pos = targetItem.pos;
    targetItem.x = oldX;
    targetItem.y = oldY;
    targetItem.pos = xyToFolderPosition(targetItem.x, targetItem.y);
  } else {
    movingItem.x = targetXY.x;
    movingItem.y = targetXY.y;
    movingItem.pos = pos;
  }

  saveFolderLayout();
  movingFolderItemId.value = null;
};

const handleCellClick = (x, y) => {
  if (movingModuleId.value) {
    const module = moduleLayouts.value.find(m => getModuleKey(m) === movingModuleId.value);
    // Check if another module is already at this position
    const isOccupied = moduleLayouts.value.some(m => getModuleKey(m) !== movingModuleId.value && m.x === x && m.y === y);
    if (module && !isOccupied) {
      module.x = x;
      module.y = y;
      saveLayout();
    }
    movingModuleId.value = null;
  }
};

const closeFolder = () => {
  activeFolder.value = null;
};

const handleFolderAction = (action) => {
  if (action === 'study-language') {
    router.push('/study/language');
    closeFolder();
  } else if (action === 'study-professional') {
    router.push('/study/professional');
    closeFolder();
  } else if (action === 'study-interest') {
    router.push('/study/interest');
    closeFolder();
  }
};
</script>

<style scoped>
.home-desktop {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
  margin: 0;
}

.desktop-container { 
  width: min(1480px, calc(100vw - 40px)); 
  max-width: none; 
  aspect-ratio: 11 / 5; 
  position: relative; 
} 

.desktop-grid {
  position: relative;
  width: 100%;
  height: 100%;
}

.grid-cell,
.app-module {
  position: absolute;
}

.grid-cell {
  border-radius: 20px;
  transition: background 0.2s;
}

.grid-cell.can-drop:hover {
  background: rgba(var(--accent-rgb), 0.1);
  border: 2px dashed var(--accent-color);
}

.app-module {
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.module-inner {
  width: 100%;
  height: 100%;
  background: rgba(var(--card-bg-rgb), var(--app-card-opacity));
  backdrop-filter: blur(8px);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-color);
  position: relative;
  padding: 10px;
}

.app-module:hover .module-inner {
  transform: translateY(-5px);
  border-color: var(--accent-color);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.move-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--secondary-text);
  opacity: 0.3;
  cursor: move;
  padding: 4px;
  transition: opacity 0.2s;
}

.app-module:hover .move-btn {
  opacity: 1;
}

.is-moving .module-inner {
  border: 2px solid var(--accent-color);
  box-shadow: 0 0 15px rgba(var(--accent-rgb), 0.5);
  animation: pulse 1.5s infinite;
}

.module-transparent { 
  width: 100%; 
  height: 100%; 
  display: flex; 
  flex-direction: column; 
  justify-content: center; 
  align-items: center; 
  position: relative; 
  padding: 10px; 

  background: none; 
  background-color: transparent; 
  background-image: none; 
  backdrop-filter: none; 
  -webkit-backdrop-filter: none; 
  filter: none; 
  border: 0; 
  outline: 0; 
  box-shadow: none; 
} 
 
.app-module:hover .module-transparent { 
  transform: translateY(-5px); 
  background: none; 
  backdrop-filter: none; 
  -webkit-backdrop-filter: none; 
  border: 0; 
  box-shadow: none; 
} 
 
.app-module.is-moving .module-transparent { 
  outline: 2px dashed var(--accent-color); 
  outline-offset: -2px; 
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.module-icon {
  margin-bottom: 8px;
  color: var(--accent-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.module-icon svg {
  width: 3rem;
  height: 3rem;
  stroke-width: 1.8;
}

.module-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-color);
  text-align: center;
}

.module-title.force-black-title { 
  color: #222222 !important; 
}

/* Folder Overlay */
.folder-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  z-index: 3000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.folder-panel {
  background: var(--card-bg);
  border-radius: 32px;
  width: 100%;
  max-width: 400px;
  padding: 24px;
  box-shadow: 0 25px 50px rgba(0,0,0,0.3);
  animation: folder-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.folder-panel.study-panel {
  max-width: 520px;
  height: auto;
  min-height: unset;
}

@keyframes folder-pop {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

.folder-header {
  margin-bottom: 20px;
  text-align: center;
}

.folder-header h3 {
  font-size: 1.2rem;
  color: var(--text-color);
}

.folder-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 100px);
  gap: 15px;
  position: relative;
}

.folder-grid.study-layout {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: 100px;
}

.folder-slot {
  z-index: 1;
  min-height: 100px;
  border-radius: 16px;
  transition: all 0.2s;
  background: transparent;
  border: 1px solid transparent;
}

.folder-slot.can-drop:hover {
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px dashed var(--border-color);
}

.folder-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  z-index: 2;
  user-select: none;
}

.folder-item:not(.disabled) {
  background: var(--card-bg);
}

.folder-empty-slot {
  opacity: 1;
  cursor: default;
  background: transparent !important;
  border: 1px solid transparent;
}

.folder-empty-slot:hover {
  border: 1px dashed var(--border-color) !important;
  background: rgba(var(--accent-rgb), 0.04) !important;
  transform: none !important;
}

.folder-item:hover:not(.disabled):not(.folder-empty-slot) {
  background: var(--border-color);
  transform: translateY(-2px);
}

.folder-item.is-moving {
  border: 2px solid var(--accent-color);
  box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.3);
  z-index: 10;
}

.move-btn-mini {
  position: absolute;
  top: 4px;
  right: 4px;
  background: transparent;
  border: none;
  color: var(--secondary-text);
  opacity: 0.2;
  cursor: move;
  padding: 2px;
  transition: opacity 0.2s;
}

.folder-item:hover .move-btn-mini {
  opacity: 1;
}

.item-icon {
  color: var(--accent-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-icon svg {
  width: 2rem;
  height: 2rem;
  stroke-width: 1.9;
}

.item-title {
  font-size: 0.8rem;
  color: var(--secondary-text);
  text-align: center;
}

.full-transparent-btn { 
  flex: 0 0 auto; 
  padding: 7px 12px; 
  border-radius: 10px; 
  border: 1px solid var(--border-color); 
  background: var(--card-bg); 
  color: var(--text-color); 
  cursor: pointer; 
  font-size: 0.85rem;
  transition: all 0.2s;
} 
 
.full-transparent-btn.active { 
  background: #35b86b; 
  border-color: #35b86b; 
  color: white; 
} 

.setting-control input[type="range"]:disabled { 
  opacity: 0.35; 
  cursor: not-allowed; 
} 

/* Settings Panel */
.settings-panel-content {
  grid-column: 1 / span 3;
  grid-row: 1 / span 3;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 10px 0;
  position: relative;
  z-index: 2;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.setting-item label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-color);
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 15px;
}

.setting-control input[type="range"] {
  flex: 1;
  accent-color: var(--accent-color);
}

.percent-editor {
  min-width: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  color: var(--secondary-text);
  font-size: 0.85rem;
  cursor: text;
}

.percent-editor input {
  width: 38px;
  padding: 2px 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: right;
  outline: none;
}

.percent-editor input:focus {
  border-color: rgba(var(--accent-rgb), 0.45);
  background: rgba(var(--card-bg-rgb), 0.8);
}

.percent-editor input::-webkit-outer-spin-button,
.percent-editor input::-webkit-inner-spin-button {
  margin: 0;
}

.percent-editor.disabled {
  cursor: not-allowed;
}

.setting-control select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-color);
  outline: none;
}

@media (max-width: 600px) {
  .home-desktop {
    padding: 10px;
  }

  .desktop-container {
    width: 100%;
    aspect-ratio: 5 / 11;
  }

  .module-icon {
    margin-bottom: 6px;
  }
  .module-icon svg {
    width: 2rem;
    height: 2rem;
  }
  .module-title {
    font-size: 0.75rem;
  }
}
</style>
