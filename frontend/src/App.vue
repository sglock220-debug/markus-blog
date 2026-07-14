<template>
  <component 
    :is="layoutComponent" 
    :theme="theme" 
    :wallpaper="wallpaper"
    :user="user"
    @toggle-theme="toggleTheme"
    @logout="handleLogout"
  >
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </component>

  <Teleport to="body">
    <ThemePopup 
      v-if="showThemePopup" 
      :current-wallpaper="wallpaper"
      :user="user"
      @close="showThemePopup = false"
      @select-wallpaper="selectWallpaper"
    />
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import DesktopLayout from './layouts/DesktopLayout.vue';
import MobileLayout from './layouts/MobileLayout.vue';
import ThemePopup from './components/ThemePopup.vue';
import { useResponsiveLayout } from './composables/useResponsiveLayout';
import api from './api';

const { isMobile } = useResponsiveLayout();
const router = useRouter();

const theme = ref(localStorage.getItem('theme') || 'light');
const wallpaper = ref(localStorage.getItem('wallpaper') || '/wallpapers/default1.png');
const user = ref(null);
const showThemePopup = ref(false);

const layoutComponent = computed(() => isMobile.value ? MobileLayout : DesktopLayout);

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', theme.value);
};

const selectWallpaper = (path) => {
  wallpaper.value = path;
  localStorage.setItem('wallpaper', path);
};

const openThemePopup = () => {
  showThemePopup.value = true;
};

const checkUser = async () => {
  try {
    const res = await api.get('/user/');
    user.value = res.data;
    localStorage.setItem('user_info', JSON.stringify(res.data));
    
    // Sync wallpaper from backend if available
    if (user.value.current_wallpaper) {
      selectWallpaper(user.value.current_wallpaper);
    }
  } catch (err) {
    user.value = null;
    localStorage.removeItem('user_info');
  }
};

const handleLogout = async () => {
  try {
    await api.post('/logout/');
    user.value = null;
    localStorage.removeItem('user_info');
    // Reset to first default wallpaper on logout if you want, 
    // or keep current local one. Let's keep current.
    router.push('/login');
  } catch (err) {
    console.error('Logout failed', err);
  }
};

onMounted(() => {
  checkUser();
  window.addEventListener('toggle-theme', toggleTheme);
  window.addEventListener('auth-changed', checkUser);
  window.addEventListener('open-theme-popup', openThemePopup);
});

onBeforeUnmount(() => {
  window.removeEventListener('toggle-theme', toggleTheme);
  window.removeEventListener('auth-changed', checkUser);
  window.removeEventListener('open-theme-popup', openThemePopup);
});
</script>

<style>
/* Global fade transition for routes */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
