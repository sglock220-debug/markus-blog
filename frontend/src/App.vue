<template>
  <component 
    :is="layoutComponent" 
    :theme="theme" 
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
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import DesktopLayout from './layouts/DesktopLayout.vue';
import MobileLayout from './layouts/MobileLayout.vue';
import { useResponsiveLayout } from './composables/useResponsiveLayout';
import api from './api';

const { isMobile } = useResponsiveLayout();
const router = useRouter();

const theme = ref(localStorage.getItem('theme') || 'light');
const user = ref(null);

const layoutComponent = computed(() => isMobile.value ? MobileLayout : DesktopLayout);

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', theme.value);
};

const checkUser = async () => {
  try {
    const res = await api.get('/user/');
    user.value = res.data;
    localStorage.setItem('user_info', JSON.stringify(res.data));
  } catch (err) {
    user.value = null;
  }
};

const handleLogout = async () => {
  try {
    await api.post('/logout/');
    user.value = null;
    localStorage.removeItem('user_info');
    router.push('/login');
  } catch (err) {
    console.error('Logout failed', err);
  }
};

onMounted(() => {
  checkUser();
  window.addEventListener('toggle-theme', toggleTheme);
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
