<template>
  <div class="home-desktop" @click="handleGlobalClick">
    <div class="desktop-container">
      <div class="desktop-grid">
        <!-- Grid Cells (Background) -->
        <div 
          v-for="cell in 25" 
          :key="'cell-' + cell"
          class="grid-cell"
          :class="{ 'can-drop': movingModuleId !== null }"
          :style="getCellStyle((cell - 1) % 5, Math.floor((cell - 1) / 5))"
          @click="handleCellClick((cell - 1) % 5, Math.floor((cell - 1) / 5))"
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
          <div class="module-inner">
            <button 
              class="move-btn" 
              @click.stop="startMoving(module.id)"
              title="移动/交换"
            >
              <GripVerticalIcon size="14" />
            </button>
            <div class="module-icon">{{ module.icon }}</div>
            <div class="module-title">{{ module.title }}</div>
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
            <template v-if="activeFolder !== 'study'">
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
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { GripVertical as GripVerticalIcon } from '@lucide/vue';

const router = useRouter();

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
  { id: 'study', title: '学习系统', icon: '📖', type: 'folder', folderType: 'study', x: 0, y: 1 }
];

const modules = ref([]);
const movingModuleId = ref(null);
const activeFolder = ref(null);
const currentFolderItems = ref([]);
const movingFolderItemId = ref(null);

const folderDefaults = {
  settings: [
    { id: 'wallpaper', title: '壁纸主题', icon: '🖼️', action: 'wallpaper', pos: 0 },
    { id: 'language', title: '语言包', icon: '🌐', action: 'language', pos: 1 },
    { id: 'music', title: '音乐', icon: '🎵', action: 'music', pos: 2 },
  ],
  study: [
    { id: 'study-language', title: '语言学习', icon: '🌍', action: 'study-language', pos: 0 },
    { id: 'study-professional', title: '专业学习', icon: '🎓', action: 'study-professional', pos: 1 },
    { id: 'study-interest', title: '兴趣学习', icon: '🎯', action: 'study-interest', pos: 2 },
  ],
  extensions: []
};

const getCellStyle = (x, y) => {
  const gap = window.innerWidth <= 600 ? 10 : 15;

  return {
    left: `calc(${x} * ((100% - 4 * ${gap}px) / 5 + ${gap}px))`,
    top: `calc(${y} * ((100% - 4 * ${gap}px) / 5 + ${gap}px))`
  };
};

const getFolderSlotStyle = (pos) => ({ 
  gridColumnStart: (pos % 3) + 1, 
  gridColumnEnd: (pos % 3) + 2, 
  gridRowStart: Math.floor(pos / 3) + 1, 
  gridRowEnd: Math.floor(pos / 3) + 2 
});

const findEmptyCell = (currentModules) => { 
  for (let y = 0; y < 5; y++) { 
    for (let x = 0; x < 5; x++) { 
      if (!currentModules.some(m => m.x === x && m.y === y)) { 
        return { x, y }; 
      } 
    } 
  } 
  return null; 
};

onMounted(() => {
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
          module.x < 5 && 
          module.y >= 0 && 
          module.y < 5 && 
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
  }
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
  if (action === 'music') {
    window.dispatchEvent(new CustomEvent('open-music-player'));
    closeFolder();
  } else if (action === 'wallpaper') {
    window.dispatchEvent(new CustomEvent('toggle-theme'));
    closeFolder();
  } else if (action === 'language') {
    // router.push('/study/language'); // Removed this, it's for website language
    alert('网站语言切换功能开发中...');
    closeFolder();
  } else if (action === 'study-language') {
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
  background: var(--bg-color);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
  margin: 0;
}

.desktop-container {
  width: 100%;
  max-width: 660px;
  aspect-ratio: 1 / 1;
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
  width: calc((100% - 4 * 15px) / 5);
  height: calc((100% - 4 * 15px) / 5);
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
  background: var(--card-bg);
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

@media (max-width: 600px) {
  .home-desktop {
    padding: 10px;
  }

  .desktop-container {
    width: 100%;
    aspect-ratio: 1 / 1;
  }

  .grid-cell,
  .app-module {
    width: calc((100% - 4 * 10px) / 5);
    height: calc((100% - 4 * 10px) / 5);
  }

  .module-icon {
    font-size: 2rem;
  }
  .module-title {
    font-size: 0.75rem;
  }
}
</style>
