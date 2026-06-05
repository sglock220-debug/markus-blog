<template>
  <div :data-theme="theme">
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
      <router-view></router-view>
    </main>

    <footer v-if="!isCameraPage" class="footer"> 
      <div class="container footer-container"> 
        <p class="footer-text">© 2026 {{ user?.username || '无名客' }} · 一剑一代码，一步一江湖 · v0.1 Beta</p> 
      </div> 
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
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
import MusicPlayer from './components/MusicPlayer.vue';
import api from './api';

const router = useRouter();
const route = useRoute();
const theme = ref(localStorage.getItem('theme') || 'light');
const showSidebar = ref(false);
const isStudyOpen = ref(false);
const searchQuery = ref('');
const user = ref(null);
const musicPlayerRef = ref(null);

const isCameraPage = computed(() => route.path === '/cyber-camera');
const isHomePage = computed(() => route.path === '/');

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', theme.value);
};

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

const checkUser = async () => {
  try {
    const res = await api.get('/user/');
    user.value = res.data;
  } catch (err) {
    user.value = null;
  }
};

const handleLogout = async () => {
  try {
    await api.post('/logout/');
    user.value = null;
    closeSidebar();
    router.push('/login');
  } catch (err) {
    console.error('Logout failed', err);
  }
};

onMounted(() => {
  checkUser();
  window.addEventListener('open-music-player', openMusicPlayer);
  window.addEventListener('toggle-theme', toggleTheme);
});

onBeforeUnmount(() => {
  window.removeEventListener('open-music-player', openMusicPlayer);
  window.removeEventListener('toggle-theme', toggleTheme);
});

// Sync user state on route change
watch(() => router.currentRoute.value.fullPath, () => {
  checkUser();
});
</script>

<style>
.logout-link {
  color: #ff4d4f !important;
}

.mobile-music-entry {
  display: none !important;
}

.desktop-music-entry {
  display: flex;
  align-items: center;
}

/* Sidebar Submenu Styles */
.sidebar-item-group {
  width: 100%;
}

.sidebar-link.has-submenu {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 12px 15px;
  color: var(--text-color);
  text-decoration: none;
  border-radius: 8px;
  transition: background 0.2s;
}

.sidebar-link.has-submenu:hover {
  background: var(--border-color);
}

.sidebar-link.has-submenu.active {
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent-color);
}

.link-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.link-content svg {
  width: 18px;
  height: 18px;
}

.sidebar-submenu {
  display: flex;
  flex-direction: column;
  margin-top: 4px;
}

.submenu-link {
  display: flex !important;
  align-items: center !important;
  padding: 10px 15px 10px 45px !important;
  font-size: 0.95rem !important;
  color: var(--secondary-text) !important;
  text-decoration: none !important;
  border-radius: 8px !important;
  transition: all 0.2s !important;
}

.submenu-link:hover {
  color: var(--accent-color) !important;
  background: var(--border-color) !important;
}

@media (max-width: 768px) {
  .desktop-music-entry {
    display: none !important;
  }
  .mobile-music-entry {
    display: flex !important;
  }
}
</style>
