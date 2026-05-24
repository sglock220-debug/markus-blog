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
          <a href="#"><InfoIcon /> 关于</a>
          <a @click="handleLogout" class="logout-link"><LogOutIcon /> 退出登录</a>
        </template>
        <template v-else>
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

    <main>
      <router-view></router-view>
    </main>

    <footer class="footer"> 
      <div class="container footer-container"> 
        <p class="footer-text">© 2026 {{ user?.username || '无名客' }} · 一剑一代码，一步一江湖</p> 
      </div> 
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { 
  Search as SearchIcon, 
  Sun as SunIcon, 
  Moon as MoonIcon, 
  Menu as MenuIcon, 
  X as XIcon,
  Home as HomeIcon,
  User as UserIcon,
  Info as InfoIcon,
  LogOut as LogOutIcon,
  LogIn as LogInIcon
} from '@lucide/vue';
import api from './api';

const router = useRouter();
const theme = ref(localStorage.getItem('theme') || 'light');
const showSidebar = ref(false);
const searchQuery = ref('');
const user = ref(null);

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', theme.value);
};

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: 'home', query: { q: searchQuery.value } });
    searchQuery.value = '';
  }
};

const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value;
};

const closeSidebar = () => {
  showSidebar.value = false;
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
});

// Sync user state on route change
watch(() => router.currentRoute.value.fullPath, () => {
  checkUser();
});
</script>
