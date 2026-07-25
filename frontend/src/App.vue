<template>
  <!-- 只在首页且未检查完成时显示加载 -->
  <div v-if="showHomeLoading" class="app-loading">
    正在加载...
  </div>

  <!-- 未登录且尚未选择进入方式 -->
  <div
    v-else-if="showEntryChoice"
    class="entry-choice-page"
    :data-theme="theme"
    :style="backgroundStyle"
  >
    <div class="entry-choice-mask"></div>

    <div class="entry-choice-panel">
      <div class="entry-choice-title">请选择进入方式</div>
      <div class="entry-choice-description">
        你可以先以游客身份浏览，也可以登录会员账户。
      </div>

      <div class="entry-choice-cards">
        <button class="entry-card" @click="enterAsGuest">
          <span class="entry-icon">👤</span>
          <span class="entry-card-title">游客模式</span>
          <span class="entry-card-text">
            无需登录，直接进入主页
          </span>
        </button>

        <button class="entry-card member-card" @click="enterAsMember">
          <span class="entry-icon">🔐</span>
          <span class="entry-card-title">会员模式</span>
          <span class="entry-card-text">
            登录或注册会员账户
          </span>
        </button>
      </div>
    </div>
  </div>

  <!-- 正常网站内容 -->
  <template v-else>
    <component 
      :is="layoutComponent" 
      :theme="theme" 
      :wallpaper="layoutBackgroundValue"
      :background-type="backgroundType"
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
        :current-background-type="backgroundType"
        :current-color="backgroundColor"
        :current-mode="wallpaperMode"
        :user="user"
        @close="showThemePopup = false"
        @select-wallpaper="selectWallpaper"
      />
    </Teleport>
  </template>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import DesktopLayout from './layouts/DesktopLayout.vue';
import MobileLayout from './layouts/MobileLayout.vue';
import ThemePopup from './components/ThemePopup.vue';
import { useResponsiveLayout } from './composables/useResponsiveLayout';
import api from './api';

const { isMobile } = useResponsiveLayout();
const router = useRouter();
const route = useRoute();

const theme = ref(localStorage.getItem('theme') || 'light');
const wallpaper = ref(localStorage.getItem('wallpaper') || '/wallpapers/default1.png');
const backgroundType = ref(localStorage.getItem('background_type') || 'image');
const backgroundColor = ref(localStorage.getItem('background_color') || '#f5f5f5');
const wallpaperMode = ref(localStorage.getItem('wallpaper_mode') || (isMobile.value ? 'mobile' : 'pc'));
const user = ref(null);
const authChecked = ref(false);
const guestMode = ref(sessionStorage.getItem('entry_mode') === 'guest');
const showThemePopup = ref(false);

const layoutComponent = computed(() => isMobile.value ? MobileLayout : DesktopLayout);

// 只在首页显示加载状态
const showHomeLoading = computed(() => {
  return route.path === '/' && !authChecked.value;
});

// 显示选择页面的条件
const showEntryChoice = computed(() => {
  return route.path === '/' && authChecked.value && !user.value && !guestMode.value;
});

const backgroundStyle = computed(() => {
  if (backgroundType.value === 'color') {
    return { backgroundColor: backgroundColor.value, backgroundImage: 'none' };
  }
  return wallpaper.value ? { backgroundImage: `url(${wallpaper.value})` } : {};
});

const layoutBackgroundValue = computed(() => {
  return backgroundType.value === 'color' ? backgroundColor.value : wallpaper.value;
});

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', theme.value);
};

const selectWallpaper = (payload) => {
  const next = typeof payload === 'string' ? { value: payload, type: 'image' } : payload;
  if (!next) return;

  if (next.type === 'color') {
    backgroundType.value = 'color';
    backgroundColor.value = next.value || next.color || '#f5f5f5';
    localStorage.setItem('background_type', 'color');
    localStorage.setItem('background_color', backgroundColor.value);
    return;
  }

  backgroundType.value = 'image';
  wallpaper.value = next.value || next.wallpaper || next.path || '/wallpapers/default1.png';
  if (next.mode) {
    wallpaperMode.value = next.mode;
    localStorage.setItem('wallpaper_mode', next.mode);
  }
  localStorage.setItem('background_type', 'image');
  localStorage.setItem('wallpaper', wallpaper.value);
};

const openThemePopup = () => {
  showThemePopup.value = true;
};

const enterAsGuest = () => {
  sessionStorage.setItem('entry_mode', 'guest');
  guestMode.value = true;
};

const enterAsMember = () => {
  sessionStorage.removeItem('entry_mode');
  guestMode.value = false;
  router.push('/login');
};

const checkUser = async () => {
  authChecked.value = false;
  
  try {
    const res = await api.get('/user/');
    user.value = res.data;
    localStorage.setItem('user_info', JSON.stringify(res.data));
    
    // 登录后清理游客模式
    sessionStorage.removeItem('entry_mode');
    guestMode.value = false;
    
    // Sync wallpaper from backend if available
    if (user.value.current_background_type === 'color') {
      selectWallpaper({
        type: 'color',
        value: user.value.current_background_color || '#f5f5f5',
      });
    } else if (user.value.current_wallpaper) {
      selectWallpaper({
        type: 'image',
        value: user.value.current_wallpaper,
        mode: user.value.current_wallpaper_mode || wallpaperMode.value,
      });
    }
  } catch (err) {
    user.value = null;
    localStorage.removeItem('user_info');
    guestMode.value = sessionStorage.getItem('entry_mode') === 'guest';
  } finally {
    authChecked.value = true;
  }
};

const handleLogout = async () => {
  try {
    await api.post('/logout/');
    user.value = null;
    localStorage.removeItem('user_info');
    // 退出登录后清除游客状态，重新询问
    sessionStorage.removeItem('entry_mode');
    guestMode.value = false;
    router.push('/');
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

.app-loading {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color, #f5f5f5);
  color: var(--text-color, #333);
  font-size: 16px;
}

.entry-choice-page {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.entry-choice-mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(4px);
}

.entry-choice-panel {
  position: relative;
  z-index: 1;
  width: min(760px, calc(100% - 40px));
  padding: 40px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 55px rgba(0, 0, 0, 0.16);
}

.entry-choice-title {
  text-align: center;
  font-size: 30px;
  font-weight: 700;
  color: #222;
}

.entry-choice-description {
  margin-top: 10px;
  text-align: center;
  color: #666;
  font-size: 15px;
}

.entry-choice-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-top: 32px;
}

.entry-card {
  min-height: 220px;
  padding: 28px 20px;
  border: 2px solid transparent;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.entry-card:hover {
  transform: translateY(-5px);
  border-color: #62a8d8;
  box-shadow: 0 14px 30px rgba(40, 110, 160, 0.2);
}

.member-card:hover {
  border-color: #c6a664;
}

.entry-icon {
  font-size: 56px;
  line-height: 1;
}

.entry-card-title {
  margin-top: 18px;
  color: #222;
  font-size: 22px;
  font-weight: 700;
}

.entry-card-text {
  margin-top: 10px;
  color: #777;
  font-size: 14px;
}

@media (max-width: 650px) {
  .entry-choice-panel {
    padding: 28px 20px;
  }
  .entry-choice-cards {
    grid-template-columns: 1fr;
  }
  .entry-card {
    min-height: 170px;
  }
}
</style>
