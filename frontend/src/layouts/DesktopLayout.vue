<template>
  <div 
    class="desktop-layout" 
    :data-theme="theme"
    :style="wallpaper ? { backgroundImage: `url(${wallpaper})` } : {}"
  >
    <header class="navbar">
      <div class="container navbar-content">
        <div class="nav-left"> 
          <router-link to="/" class="site-title"> 
            <img src="/Logo.png" alt="logo" class="site-logo" /> 
            <span class="site-name">{{ user?.display_name || user?.username || '无名客' }}</span> 
          </router-link> 
        </div> 
        <div class="nav-right">
          <div class="utility-actions">
            <form @submit.prevent="handleSearch" class="nav-search"> 
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="搜索文章..." 
                class="nav-search-input" 
              /> 
              <button type="submit" class="nav-search-btn" title="搜索"> 
                <SearchIcon /> 
              </button> 
            </form> 
            <button @click="toggleTheme" class="nav-icon-btn theme-toggle-btn" title="切换主题"> 
              <SunIcon v-if="theme === 'light'" /> 
              <MoonIcon v-else /> 
            </button> 
            <div v-show="!compactHeader" ref="musicEntryRef" class="desktop-music-entry">
              <MusicPlayer ref="musicPlayerRef" />
            </div>
          </div>
          <button @click="toggleSidebar" class="nav-icon-btn menu-toggle-btn" title="菜单"> 
            <MenuIcon /> 
          </button> 
        </div> 
      </div>
    </header>

    <!-- Sidebar Menu -->
    <div :class="['side-menu', { active: showSidebar }]">
      <div class="sidebar-header">
        <span class="sidebar-title">菜单</span>
        <button @click="toggleSidebar" class="close-btn-inline"><XIcon /></button>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/" @click="closeSidebar"><HomeIcon /> 首页</router-link>
        <template v-if="user">
          <router-link to="/profile" @click="closeSidebar"><UserIcon /> 个人主页</router-link>
          <router-link to="/cyber-camera" @click="closeSidebar"><VideoIcon /> 赛博摄像头</router-link>
          
          <!-- Study System Collapsible Menu -->
          <div class="sidebar-item-group">
            <a @click="toggleStudyMenu" class="sidebar-link has-submenu" :class="{ active: isStudyOpen }">
              <div class="link-content">
                <BookOpenIcon /> <span>学习系统</span>
              </div>
              <ChevronDownIcon v-if="!isStudyOpen" size="16" />
              <ChevronUpIcon v-else size="16" />
            </a>
            <div v-if="isStudyOpen" class="sidebar-submenu">
              <router-link to="/study/language" @click="closeSidebar" class="submenu-link">🌍 语言学习</router-link>
              <router-link to="/study/professional" @click="closeSidebar" class="submenu-link">🎓 专业学习</router-link>
              <router-link to="/study/interest" @click="closeSidebar" class="submenu-link">🎯 兴趣学习</router-link>
            </div>
          </div>

          <a v-if="compactHeader" @click="openMusicPlayer" class="mobile-music-entry" style="cursor: pointer;"><MusicIcon /> 音乐播放器</a>
          <button @click="toggleTheme" class="sidebar-theme-btn mobile-theme-btn"> 
            <SunIcon v-if="theme === 'light'" /> 
            <MoonIcon v-else /> 
            <span>{{ theme === 'light' ? '切换深色模式' : '切换浅色模式' }}</span> 
          </button> 
          <a href="#"><InfoIcon /> 关于</a>
          <a @click="handleLogout" class="logout-link"><LogOutIcon /> 退出登录</a>
        </template>
        <template v-else>
          <router-link to="/cyber-camera" @click="closeSidebar"><VideoIcon /> 赛博摄像头</router-link>
          <a v-if="compactHeader" @click="openMusicPlayer" class="mobile-music-entry" style="cursor: pointer;"><MusicIcon /> 音乐播放器</a>
          <button @click="toggleTheme" class="sidebar-theme-btn mobile-theme-btn"> 
            <SunIcon v-if="theme === 'light'" /> 
            <MoonIcon v-else /> 
            <span>{{ theme === 'light' ? '切换深色模式' : '切换浅色模式' }}</span> 
          </button> 
          <router-link to="/login" @click="closeSidebar"><LogInIcon /> 登录 / 注册</router-link>
        </template>
      </nav>
    </div>

    <!-- Sidebar Overlay -->
    <div 
      v-if="showSidebar" 
      class="side-overlay active" 
      @click="closeSidebar"
    ></div>

    <main :class="['main-content', { 'camera-layout': isCameraPage, 'home-layout': isHomePage, 'auth-layout': isAuthPage }]">
      <slot></slot>
    </main>

    <footer v-if="!isCameraPage" class="footer"> 
      <div class="container footer-container"> 
        <div class="footer-copyright-badge">
          <p class="footer-text">© 2026 Markus · 一剑一代码，一步一江湖 · v0.1 Beta</p> 
        </div>
      </div> 
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { 
  Search as SearchIcon, 
  Sun as SunIcon, 
  Moon as MoonIcon, 
  Menu as MenuIcon, 
  X as XIcon,
  Home as HomeIcon,
  User as UserIcon,
  Video as VideoIcon,
  Info as InfoIcon,
  LogOut as LogOutIcon,
  LogIn as LogInIcon,
  Music as MusicIcon,
  BookOpen as BookOpenIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon
} from '@lucide/vue';
import MusicPlayer from '../components/MusicPlayer.vue';
import api from '../api';

const props = defineProps({
  theme: String,
  wallpaper: String,
  user: Object
});

const emit = defineEmits(['toggle-theme', 'logout']);

const router = useRouter();
const route = useRoute();
const showSidebar = ref(false);
const isStudyOpen = ref(false);
const searchQuery = ref('');
const musicPlayerRef = ref(null);
const musicEntryRef = ref(null);
const compactHeader = ref(false);
let mediaQuery;

const isCameraPage = computed(() => route.path === '/cyber-camera');
const isHomePage = computed(() => route.path === '/');
const isAuthPage = computed(() => route.path === '/login');

const toggleTheme = () => emit('toggle-theme');

const openMusicPlayer = () => {
  closeSidebar();
  if (musicPlayerRef.value) {
    musicPlayerRef.value.open();
  }
};

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: 'home', query: { q: searchQuery.value } });
    searchQuery.value = '';
  }
};

const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value;
  if (!showSidebar.value) {
    isStudyOpen.value = false;
  }
};

const closeSidebar = () => {
  showSidebar.value = false;
  isStudyOpen.value = false;
};

const toggleStudyMenu = () => {
  isStudyOpen.value = !isStudyOpen.value;
};

const handleLogout = () => {
  emit('logout');
  closeSidebar();
};

const updateHeaderMode = (event) => {
  compactHeader.value = event.matches;
};

onMounted(() => {
  window.addEventListener('open-music-player', openMusicPlayer);
  
  mediaQuery = window.matchMedia('(max-width: 680px)');
  updateHeaderMode(mediaQuery);
  mediaQuery.addEventListener('change', updateHeaderMode);
});

onBeforeUnmount(() => {
  window.removeEventListener('open-music-player', openMusicPlayer);
  mediaQuery?.removeEventListener('change', updateHeaderMode);
});
</script>

<style scoped>
.desktop-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: transparent;
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  background-repeat: no-repeat;
  transition: background-image 0.5s ease;
}

.navbar {
  background: var(--navbar-glass) !important;
  backdrop-filter: blur(12px) !important;
  border-bottom: 1px solid var(--border-color);
}

.footer {
  margin-top: auto;
  width: 100%;
  height: var(--footer-height);
  padding: 20px 0;
  border-top: none !important;
  background: transparent !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-copyright-badge {
  background: var(--footer-badge-bg);
  backdrop-filter: blur(10px);
  padding: 8px 22px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
}

.footer-text {
  color: var(--text-color) !important;
  font-weight: 500;
  font-size: 0.9rem;
}

/* Navbar and Header Responsiveness */
.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  width: 100%;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 48px !important;
  box-sizing: border-box;
}

.nav-left {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.nav-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: 22px;
  min-width: 0;
  overflow: visible;
}

.utility-actions {
  display: contents;
}

.nav-search {
  order: 1;
  flex: 0 0 auto;
}

.theme-toggle-btn {
  order: 2;
  flex: 0 0 auto;
}

.desktop-music-entry {
  order: 3;
  flex: 0 0 auto;
}

.menu-toggle-btn {
  display: inline-flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  flex: 0 0 auto !important;
  flex-shrink: 0 !important;
  position: relative;
  z-index: 5;
  order: 4 !important;
}

/* Responsive hiding rules */
@media (max-width: 900px) {
  .nav-search {
    display: none !important;
  }
}

@media (max-width: 680px) {
  .desktop-music-entry {
    display: none !important;
  }
}

@media (max-width: 450px) {
  .theme-toggle-btn {
    display: none !important;
  }
}

/* Mobile specific padding and width for container */
@media (max-width: 768px) {
  .container.navbar-content {
    padding: 0 16px !important;
    max-width: none !important;
    width: 100% !important;
    margin: 0 !important;
  }
}

/* Fix for very small screens */
@media (max-width: 375px) {
  .site-name {
    display: none;
  }
}
</style>
