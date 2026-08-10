<template>
  <div 
    class="mobile-layout" 
    :data-theme="theme"
    :style="wallpaper ? { backgroundImage: `url(${wallpaper})` } : {}"
  >
    <!-- Mobile Top Bar -->
    <header class="mobile-top-bar">
      <div class="top-bar-content">
        <div class="brand">
          <img src="/Logo.png" alt="logo" class="mobile-logo" />
          <span class="mobile-site-name">{{ user?.display_name || user?.username || '无名客' }}</span>
        </div>
        <div class="actions">
          <button @click="toggleTheme" class="mobile-icon-btn">
            <SunIcon v-if="theme === 'light'" size="20" />
            <MoonIcon v-else size="20" />
          </button>
          <button @click="showSearch = !showSearch" class="mobile-icon-btn">
            <SearchIcon size="20" />
          </button>
        </div>
      </div>
      <!-- Search Overlay -->
      <transition name="slide-down">
        <div v-if="showSearch" class="mobile-search-overlay">
          <form @submit.prevent="handleSearch" class="mobile-search-form">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="搜索文章..." 
              class="mobile-search-input"
              ref="searchInput"
            />
            <button type="button" @click="showSearch = false" class="cancel-btn">取消</button>
          </form>
        </div>
      </transition>
    </header>

    <!-- Main Content -->
    <main class="mobile-main" :class="{ 'resume-layout': isResumePage }">
      <slot></slot>
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-bottom-nav">
      <router-link to="/" class="nav-item">
        <HomeIcon size="24" />
        <span>首页</span>
      </router-link>
      <router-link to="/study/language" class="nav-item">
        <BookOpenIcon size="24" />
        <span>学习</span>
      </router-link>
      <router-link to="/cyber-camera" class="nav-item">
        <VideoIcon size="24" />
        <span>摄像头</span>
      </router-link>
      <router-link to="/profile" class="nav-item">
        <UserIcon size="24" />
        <span>我的</span>
      </router-link>
      <button @click="showMenu = true" class="nav-item more-btn">
        <MenuIcon size="24" />
        <span>更多</span>
      </button>
    </nav>

    <!-- Mobile Drawer Menu -->
    <transition name="fade">
      <div v-if="showMenu" class="drawer-overlay" @click="showMenu = false"></div>
    </transition>
    <transition name="slide-right">
      <div v-if="showMenu" class="mobile-drawer">
        <div class="drawer-header">
          <span class="drawer-title">更多功能</span>
          <button @click="showMenu = false" class="close-btn"><XIcon size="24" /></button>
        </div>
        <div class="drawer-content">
          <div class="drawer-section">
            <h3>学习系统</h3>
            <router-link to="/study/language" @click="showMenu = false" class="drawer-item">🌍 语言学习</router-link>
            <router-link to="/study/professional" @click="showMenu = false" class="drawer-item">🎓 专业学习</router-link>
            <router-link to="/study/interest" @click="showMenu = false" class="drawer-item">🎯 兴趣学习</router-link>
          </div>
          <div class="drawer-section">
            <h3>其他</h3>
            <a @click="openMusicPlayer" class="drawer-item"><MusicIcon size="20" /> 音乐播放器</a>
            <router-link to="/notes" @click="showMenu = false" class="drawer-item">📝 笔记</router-link>
            <router-link to="/ai-chat" @click="showMenu = false" class="drawer-item">🤖 AI 助手</router-link>
            <router-link to="/cinema" @click="showMenu = false" class="drawer-item">🎬 影院</router-link>
          </div>
          <div v-if="user" class="drawer-footer">
            <button @click="handleLogout" class="mobile-logout-btn">
              <LogOutIcon size="20" /> 退出登录
            </button>
          </div>
          <div v-else class="drawer-footer">
            <router-link to="/login" @click="showMenu = false" class="mobile-login-btn">
              <LogInIcon size="20" /> 登录 / 注册
            </router-link>
          </div>
        </div>
      </div>
    </transition>

    <!-- Music Player Portal -->
    <MusicPlayer ref="musicPlayerRef" />
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  Search as SearchIcon, 
  Sun as SunIcon, 
  Moon as MoonIcon, 
  Menu as MenuIcon, 
  X as XIcon,
  Home as HomeIcon,
  User as UserIcon,
  Video as VideoIcon,
  BookOpen as BookOpenIcon,
  LogOut as LogOutIcon,
  LogIn as LogInIcon,
  Music as MusicIcon
} from '@lucide/vue';
import MusicPlayer from '../components/MusicPlayer.vue';

const props = defineProps({
  theme: String,
  wallpaper: String,
  user: Object
});

const emit = defineEmits(['toggle-theme', 'logout']);

const router = useRouter();
const route = useRoute();
const showMenu = ref(false);
const showSearch = ref(false);
const searchQuery = ref('');
const searchInput = ref(null);
const musicPlayerRef = ref(null);
const isResumePage = computed(() => /^\/@[^/]+\/cv(?:\/[^/]+)?$/.test(route.path));

const toggleTheme = () => emit('toggle-theme');

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: 'home', query: { q: searchQuery.value } });
    searchQuery.value = '';
    showSearch.value = false;
  }
};

const openMusicPlayer = () => {
  showMenu.value = false;
  if (musicPlayerRef.value) {
    musicPlayerRef.value.open();
  }
};

const handleLogout = () => {
  emit('logout');
  showMenu.value = false;
};

watch(showSearch, (val) => {
  if (val) {
    nextTick(() => {
      searchInput.value?.focus();
    });
  }
});
</script>

<style scoped>
.mobile-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  color: var(--text-color);
  padding-bottom: calc(60px + env(safe-area-inset-bottom));
}

.mobile-top-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--card-bg);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding-top: env(safe-area-inset-top);
}

.top-bar-content {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-logo {
  height: 32px;
  width: 32px;
}

.mobile-site-name {
  font-weight: bold;
  font-size: 1.1rem;
}

.actions {
  display: flex;
  gap: 12px;
}

.mobile-icon-btn {
  background: none;
  border: none;
  color: var(--text-color);
  padding: 8px;
  cursor: pointer;
}

.mobile-search-overlay {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: var(--card-bg);
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.mobile-search-form {
  display: flex;
  gap: 12px;
}

.mobile-search-input {
  flex: 1;
  height: 40px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  padding: 0 16px;
  color: var(--text-color);
}

.cancel-btn {
  background: none;
  border: none;
  color: var(--accent-color);
  font-weight: 600;
}

.mobile-main {
  flex: 1;
  padding: 16px;
}

.mobile-main.resume-layout {
  padding: 0;
  min-height: 0;
  overflow: visible;
}

.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: calc(60px + env(safe-area-inset-bottom));
  background: var(--card-bg);
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid var(--border-color);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: var(--secondary-text);
  font-size: 0.75rem;
  background: none;
  border: none;
  padding: 8px;
}

.nav-item.router-link-active {
  color: var(--accent-color);
}

.more-btn {
  cursor: pointer;
}

/* Drawer styles */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
}

.mobile-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 80%;
  max-width: 300px;
  height: 100%;
  background: var(--card-bg);
  z-index: 201;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
}

.drawer-title {
  font-weight: bold;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.drawer-section {
  margin-bottom: 24px;
}

.drawer-section h3 {
  font-size: 0.85rem;
  color: var(--secondary-text);
  margin-bottom: 12px;
  text-transform: uppercase;
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  text-decoration: none;
  color: var(--text-color);
  font-size: 1rem;
  border-bottom: 1px solid var(--bg-color);
}

.drawer-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.mobile-logout-btn, .mobile-login-btn {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-color);
  font-weight: 600;
}

/* Transitions */
.slide-down-enter-active, .slide-down-leave-active { transition: transform 0.3s; }
.slide-down-enter-from, .slide-down-leave-to { transform: translateY(-100%); }

.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.3s; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
