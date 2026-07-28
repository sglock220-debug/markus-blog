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
            <div class="module-icon">{{ module.icon }}</div>
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
            <div class="item-icon">{{ item.icon }}</div>
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
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { GripVertical as GripVerticalIcon } from '@lucide/vue';

const router = useRouter();

const GRID_COLUMNS = 11; 
const GRID_ROWS = 5; 
const GRID_CELL_COUNT = GRID_COLUMNS * GRID_ROWS;

const isMobile = ref(window.innerWidth <= 600);

const defaultModules = [
  { id: 'cinema', title: '影厅', icon: '🎬', route: '/cinema', type: 'route', x: 1, y: 1 },
  { id: 'notes', title: '笔记', icon: '📝', route: '/notes', type: 'route', x: 2, y: 1 },
  { id: 'camera', title: '相机', icon: '📷', route: '/cyber-camera', type: 'route', x: 3, y: 1 },
  { id: 'ai-chat', title: 'AI聊天助手', icon: '🤖', route: '/ai-chat', type: 'route', x: 1, y: 2 },
  { id: 'games', title: '娱乐游戏', icon: '🎮', route: '/games', type: 'route', x: 2, y: 2 },
  { id: 'friends', title: '交友', icon: '👥', route: '/friends', type: 'route', x: 3, y: 2 },
  { id: 'profile', title: '个人主页', icon: '👤', route: '/profile', type: 'route', x: 1, y: 3 },
  { id: 'settings', title: '设置', icon: '⚙️', type: 'folder', folderType: 'settings', x: 2, y: 3 },
  { id: 'extensions', title: '扩展', icon: '🧩', type: 'folder', folderType: 'extensions', x: 3, y: 3 },
  { id: 'study', title: '学习系统', icon: '📖', type: 'folder', folderType: 'study', x: 0, y: 1 },
  { id: 'wallpaper', title: '壁纸主题', icon: '🖼️', type: 'action', action: 'wallpaper', x: 0, y: 2 },
  { id: 'music', title: '音乐', icon: '🎵', type: 'action', action: 'music', x: 0, y: 3 }
];

const modules = ref([]);
const movingModuleId = ref(null);
const activeFolder = ref(null);
const currentFolderItems = ref([]);
const movingFolderItemId = ref(null);
const savedOpacity = Number(localStorage.getItem('app_card_opacity'));
const appOpacity = ref(
  Number.isFinite(savedOpacity) 
    ? Math.min(100, Math.max(0, savedOpacity)) 
    : 88
);
const savedNavbarOpacity = Number(localStorage.getItem('navbar_opacity'));
const navbarOpacity = ref(
  Number.isFinite(savedNavbarOpacity)
    ? Math.min(100, Math.max(0, savedNavbarOpacity))
    : 78
);
const savedFooterOpacity = Number(localStorage.getItem('footer_opacity'));
const footerOpacity = ref(
  Number.isFinite(savedFooterOpacity)
    ? Math.min(100, Math.max(0, savedFooterOpacity))
    : 72
);
const cardsFullyTransparent = ref( 
  localStorage.getItem('app_cards_fully_transparent') === 'true' 
);
const navbarFullyTransparent = ref(
  localStorage.getItem('navbar_fully_transparent') === 'true'
);
const footerFullyTransparent = ref(
  localStorage.getItem('footer_fully_transparent') === 'true'
);
const navbarHidden = ref(
  localStorage.getItem('navbar_hidden') === 'true'
);
const footerHidden = ref(
  localStorage.getItem('footer_hidden') === 'true'
);
const siteLanguage = ref(localStorage.getItem('site_language') || 'zh-CN');

const folderDefaults = {
  settings: [],
  study: [
    { id: 'study-language', title: '语言学习', icon: '🌍', action: 'study-language', pos: 0 },
    { id: 'study-professional', title: '专业学习', icon: '🎓', action: 'study-professional', pos: 1 },
    { id: 'study-interest', title: '兴趣学习', icon: '🎯', action: 'study-interest', pos: 2 },
  ],
  extensions: []
};

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

const findEmptyCell = (currentModules) => { 
  for (let y = 0; y < GRID_ROWS; y++) { 
    for (let x = 0; x < GRID_COLUMNS; x++) { 
      if (!currentModules.some(m => m.x === x && m.y === y)) { 
        return { x, y }; 
      } 
    } 
  } 
  return null; 
};

const handleResize = () => {
  isMobile.value = window.innerWidth <= 600;
};

const applyNavbarOpacity = () => {
  const rootStyle = document.documentElement.style;

  if (navbarHidden.value) {
    rootStyle.setProperty('--navbar-height', '80px');
    window.dispatchEvent(new CustomEvent('layout-visibility-change'));
    return;
  }

  rootStyle.setProperty('--navbar-height', '80px');

  if (navbarFullyTransparent.value) {
    rootStyle.setProperty('--navbar-opacity', '0');
    rootStyle.setProperty('--navbar-backdrop-filter', 'none');
    rootStyle.setProperty('--navbar-border-color', 'transparent');
    window.dispatchEvent(new CustomEvent('layout-visibility-change'));
    return;
  }

  rootStyle.setProperty('--navbar-opacity', String(navbarOpacity.value / 100));
  rootStyle.setProperty('--navbar-backdrop-filter', 'blur(12px)');
  rootStyle.setProperty('--navbar-border-color', 'var(--border-color)');
  window.dispatchEvent(new CustomEvent('layout-visibility-change'));
};

const applyFooterOpacity = () => {
  const rootStyle = document.documentElement.style;

  if (footerHidden.value) {
    rootStyle.setProperty('--footer-height', '0px');
    window.dispatchEvent(new CustomEvent('layout-visibility-change'));
    return;
  }

  rootStyle.setProperty('--footer-height', '100px');
  if (footerFullyTransparent.value) {
    rootStyle.setProperty('--footer-badge-opacity', '0');
    rootStyle.setProperty('--footer-badge-backdrop-filter', 'none');
    rootStyle.setProperty('--footer-badge-border-color', 'transparent');
    rootStyle.setProperty('--footer-badge-shadow', 'none');
    window.dispatchEvent(new CustomEvent('layout-visibility-change'));
    return;
  }

  rootStyle.setProperty('--footer-badge-opacity', String(footerOpacity.value / 100));
  rootStyle.setProperty('--footer-badge-backdrop-filter', 'blur(10px)');
  rootStyle.setProperty('--footer-badge-border-color', 'var(--border-color)');
  rootStyle.setProperty('--footer-badge-shadow', '0 4px 15px rgba(0, 0, 0, 0.05)');
  window.dispatchEvent(new CustomEvent('layout-visibility-change'));
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  applyNavbarOpacity();
  applyFooterOpacity();

  // Clear old folder layout once to fix grid issues
  if (localStorage.getItem('folder_layout_fixed_v1') !== 'true') {
    localStorage.removeItem('folder_layout_settings');
    localStorage.removeItem('folder_layout_extensions');
    localStorage.removeItem('folder_layout_study');
    localStorage.setItem('folder_layout_fixed_v1', 'true');
  }

  const saved = localStorage.getItem('desktop_modules');

  if (saved) {
    try {
      const savedModules = JSON.parse(saved);
      
      // Sanitize old data to fit 5x5
      const validModules = [];
      const invalidModules = [];

      savedModules.forEach(module => {
        if (
          module.x >= 0 && 
          module.x < GRID_COLUMNS && 
          module.y >= 0 && 
          module.y < GRID_ROWS && 
          !validModules.some(m => m.x === module.x && m.y === module.y)
        ) {
          validModules.push(module);
        } else {
          invalidModules.push(module);
        }
      });

      invalidModules.forEach(module => {
        const emptyCell = findEmptyCell(validModules);
        if (emptyCell) {
          validModules.push({
            ...module,
            x: emptyCell.x,
            y: emptyCell.y
          });
        }
      });

      const mergedModules = [...validModules];

      // Merge new default modules
      defaultModules.forEach(dm => {
        const exists = mergedModules.some(sm => sm.id === dm.id);

        if (!exists) {
          const emptyCell = findEmptyCell(mergedModules);
          if (emptyCell) {
            mergedModules.push({
              ...dm,
              x: emptyCell.x,
              y: emptyCell.y
            });
          }
        }
      });

      modules.value = mergedModules;
      saveLayout();
    } catch (e) {
      modules.value = [...defaultModules];
      saveLayout();
    }
  } else {
    modules.value = [...defaultModules];
    saveLayout();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});

const saveLayout = () => {
  localStorage.setItem('desktop_modules', JSON.stringify(modules.value));
};

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
  const saved = localStorage.getItem(`folder_layout_${folderType}`);
  const defaults = folderDefaults[folderType] || [];
  let items = [];
  
  if (saved) {
    try {
      items = JSON.parse(saved);
      // Data Sanitization: Ensure unique positions
      const seenPos = new Set();
      items = items.filter(item => {
        if (seenPos.has(item.pos)) return false;
        seenPos.add(item.pos);
        return true;
      });
    } catch (e) {
      items = [...defaults];
    }
  } else {
    items = [...defaults];
  }
  currentFolderItems.value = items;
};

const saveFolderLayout = () => {
  if (activeFolder.value) {
    localStorage.setItem(`folder_layout_${activeFolder.value}`, JSON.stringify(currentFolderItems.value));
  }
};

const handleModuleClick = (module) => {
  if (movingModuleId.value) {
    if (movingModuleId.value !== module.id) {
      // Swap positions
      const m1 = modules.value.find(m => m.id === movingModuleId.value);
      const m2 = module;
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
  localStorage.setItem('app_card_opacity', String(appOpacity.value));
};

const toggleFullyTransparent = () => { 
  cardsFullyTransparent.value = !cardsFullyTransparent.value; 
  localStorage.setItem( 
    'app_cards_fully_transparent', 
    String(cardsFullyTransparent.value) 
  ); 
};

const saveNavbarOpacity = () => {
  navbarOpacity.value = Math.min(100, Math.max(0, Number(navbarOpacity.value)));
  localStorage.setItem('navbar_opacity', String(navbarOpacity.value));
  applyNavbarOpacity();
};

const toggleNavbarFullyTransparent = () => {
  navbarFullyTransparent.value = !navbarFullyTransparent.value;
  localStorage.setItem(
    'navbar_fully_transparent',
    String(navbarFullyTransparent.value)
  );
  applyNavbarOpacity();
};

const toggleNavbarHidden = () => {
  navbarHidden.value = !navbarHidden.value;
  localStorage.setItem('navbar_hidden', String(navbarHidden.value));
  applyNavbarOpacity();
};

const saveFooterOpacity = () => {
  footerOpacity.value = Math.min(100, Math.max(0, Number(footerOpacity.value)));
  localStorage.setItem('footer_opacity', String(footerOpacity.value));
  applyFooterOpacity();
};

const toggleFooterFullyTransparent = () => {
  footerFullyTransparent.value = !footerFullyTransparent.value;
  localStorage.setItem(
    'footer_fully_transparent',
    String(footerFullyTransparent.value)
  );
  applyFooterOpacity();
};

const toggleFooterHidden = () => {
  footerHidden.value = !footerHidden.value;
  localStorage.setItem('footer_hidden', String(footerHidden.value));
  applyFooterOpacity();
};

const saveLanguage = () => {
  localStorage.setItem('site_language', siteLanguage.value);
};

const handleFolderItemClick = (item) => {
  if (movingFolderItemId.value) {
    const movingItem = currentFolderItems.value.find(i => i.id === movingFolderItemId.value);

    if (!movingItem) {
      movingFolderItemId.value = null;
      return;
    }

    if (movingItem.id !== item.id) {
      const oldPos = movingItem.pos;
      movingItem.pos = item.pos;
      item.pos = oldPos;
      saveFolderLayout();
    }

    movingFolderItemId.value = null;
    return;
  }

  if (item.action) {
    handleFolderAction(item.action);
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

  if (targetItem) {
    const oldPos = movingItem.pos;
    movingItem.pos = targetItem.pos;
    targetItem.pos = oldPos;
  } else {
    movingItem.pos = pos;
  }

  saveFolderLayout();
  movingFolderItemId.value = null;
};

const handleCellClick = (x, y) => {
  if (movingModuleId.value) {
    const module = modules.value.find(m => m.id === movingModuleId.value);
    // Check if another module is already at this position
    const isOccupied = modules.value.some(m => m.id !== movingModuleId.value && m.x === x && m.y === y);
    if (!isOccupied) {
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
  font-size: 3rem;
  margin-bottom: 8px;
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
  font-size: 2rem;
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
    font-size: 2rem;
  }
  .module-title {
    font-size: 0.75rem;
  }
}
</style>
