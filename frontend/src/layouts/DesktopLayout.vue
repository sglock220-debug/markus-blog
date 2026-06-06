<template>
  <div class="desktop-layout" :data-theme="theme">
    <header class="navbar">
      <div class="container navbar-content">
        <div class="nav-left"> 
          <router-link to="/" class="site-title"> 
            <img src="/Logo.png" alt="logo" class="site-logo" /> 
            <span class="site-name">{{ user?.username || '无名客' }}</span> 
          </router-link> 
        </div> 
        <div class="nav-right">
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
          <MusicPlayer ref="musicPlayerRef" class="desktop-music-entry" />
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

          <a @click="openMusicPlayer" class="mobile-music-entry" style="cursor: pointer;"><MusicIcon /> 音乐播放器</a>
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
          <a @click="openMusicPlayer" class="mobile-music-entry" style="cursor: pointer;"><MusicIcon /> 音乐播放器</a>
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

    <main :class="['main-content', { 'camera-layout': isCameraPage, 'home-layout': isHomePage }]">
      <slot></slot>
    </main>

    <footer v-if="!isCameraPage" class="footer"> 
      <div class="container footer-container"> 
        <p class="footer-text">© 2026 {{ user?.username || '无名客' }} · 一剑一代码，一步一江湖 · v0.1 Beta</p> 
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
  user: Object
});

const emit = defineEmits(['toggle-theme', 'logout']);

const router = useRouter();
const route = useRoute();
const showSidebar = ref(false);
const isStudyOpen = ref(false);
const searchQuery = ref('');
const musicPlayerRef = ref(null);

const isCameraPage = computed(() => route.path === '/cyber-camera');
const isHomePage = computed(() => route.path === '/');

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

onMounted(() => {
  window.addEventListener('open-music-player', openMusicPlayer);
});

onBeforeUnmount(() => {
  window.removeEventListener('open-music-player', openMusicPlayer);
});
</script>

<style scoped>
/* Move desktop specific CSS from App.vue here if needed, 
   but for now we keep global CSS in main.css as requested 
   not to break PC UI. DesktopLayout will use existing global styles. */
</style>
