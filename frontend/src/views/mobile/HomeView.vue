<template>
  <div class="mobile-home">
    <!-- Search Bar (Duplicate of layout search but integrated) -->
    <div class="search-section">
      <form @submit.prevent="handleSearch" class="search-bar">
        <SearchIcon size="20" />
        <input v-model="searchQuery" type="text" placeholder="搜索文章..." />
      </form>
    </div>

    <!-- App Grid -->
    <div class="app-grid">
      <div 
        v-for="module in mainModules" 
        :key="module.id" 
        class="mobile-module"
        @click="handleModuleClick(module)"
      >
        <div class="module-icon">{{ module.icon }}</div>
        <div class="module-title">{{ module.title }}</div>
      </div>
    </div>

    <!-- Folders as Expandable Sections or Simple Lists -->
    <div class="folder-sections">
      <div v-for="folder in folderModules" :key="folder.id" class="folder-section">
        <h3 class="section-title">{{ folder.title }}</h3>
        <div class="section-grid">
          <div 
            v-for="item in getFolderItems(folder.folderType)" 
            :key="item.id" 
            class="section-item"
            @click="handleFolderItemClick(item)"
          >
            <div class="item-icon">{{ item.icon }}</div>
            <div class="item-title">{{ item.title }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Search as SearchIcon } from '@lucide/vue';
import {
  FOLDER_ITEM_REGISTRY,
  MOBILE_FOLDER_MODULE_KEYS,
  MOBILE_MAIN_MODULE_KEYS,
  MOBILE_SETTINGS_ITEMS,
  MODULE_REGISTRY,
  folderItemFromRegistry,
  moduleFromRegistry,
} from '../../modules/desktopModules';

const router = useRouter();
const searchQuery = ref('');

const mainModules = computed(() => MOBILE_MAIN_MODULE_KEYS
  .map(moduleFromRegistry)
  .filter(Boolean));

const folderModules = computed(() => MOBILE_FOLDER_MODULE_KEYS
  .map(moduleFromRegistry)
  .filter(Boolean));

const mobileSettingsItems = () => MOBILE_SETTINGS_ITEMS.map((item) => {
  const module = MODULE_REGISTRY[item.module_key];
  if (!module) return item;

  return {
    ...module,
    ...item,
    id: item.id,
    module_key: item.module_key,
  };
});

const getFolderItems = (type) => {
  if (type === 'settings') return mobileSettingsItems();

  return Object.keys(FOLDER_ITEM_REGISTRY[type] || {})
    .map(itemKey => folderItemFromRegistry(type, itemKey))
    .filter(Boolean);
};

const handleModuleClick = (module) => {
  if (module.route) {
    router.push(module.route);
  }
};

const handleFolderItemClick = (item) => {
  if (item.route) {
    router.push(item.route);
  } else if (item.action) {
    // Handle actions like wallpaper/music if needed
    if (item.action === 'music') {
      window.dispatchEvent(new CustomEvent('open-music-player'));
    }
  }
};

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: 'home', query: { q: searchQuery.value } });
    searchQuery.value = '';
  }
};
</script>

<style scoped>
.mobile-home {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.search-section {
  padding: 8px 0;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--card-bg);
  padding: 10px 16px;
  border-radius: 24px;
  border: 1px solid var(--border-color);
}

.search-bar input {
  flex: 1;
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 1rem;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.mobile-module {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.module-icon {
  font-size: 2rem;
  width: 56px;
  height: 56px;
  background: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.module-title {
  font-size: 0.8rem;
  color: var(--text-color);
  text-align: center;
}

.folder-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-title {
  font-size: 1.1rem;
  margin-bottom: 12px;
  padding-left: 4px;
  border-left: 4px solid var(--accent-color);
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.section-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card-bg);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.item-icon {
  font-size: 1.5rem;
}

.item-title {
  font-size: 0.9rem;
  font-weight: 500;
}
</style>
