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

    <Teleport to="body">
      <div class="water-splash-layer" aria-hidden="true">
        <span
          v-for="splash in clickSplashes"
          :key="splash.id"
          class="water-splash"
          :style="{ left: `${splash.x}px`, top: `${splash.y}px` }"
        ></span>
      </div>
    </Teleport>
  </template>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import DesktopLayout from './layouts/DesktopLayout.vue';
import MobileLayout from './layouts/MobileLayout.vue';
import ThemePopup from './components/ThemePopup.vue';
import { useResponsiveLayout } from './composables/useResponsiveLayout';
import { useDesktopState } from './composables/useDesktopState';
import api from './api';

const { isMobile } = useResponsiveLayout();
const {
  flushDesktopStateSave,
} = useDesktopState();
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
const clickSplashes = ref([]);
let splashId = 0;

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
    sessionStorage.removeItem('entry_mode');
    
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

const suppressNativeContextMenu = (event) => {
  event.preventDefault();
};

const createWaterSplash = (event) => {
  if (event.button !== 0 || event.pointerType === 'touch') {
    return;
  }

  const id = splashId + 1;
  splashId = id;
  clickSplashes.value.push({
    id,
    x: event.clientX,
    y: event.clientY,
  });

  window.setTimeout(() => {
    clickSplashes.value = clickSplashes.value.filter((splash) => splash.id !== id);
  }, 720);
};

onMounted(() => {
  checkUser();
  window.addEventListener('toggle-theme', toggleTheme);
  window.addEventListener('auth-changed', checkUser);
  window.addEventListener('open-theme-popup', openThemePopup);
  document.addEventListener('contextmenu', suppressNativeContextMenu);
  document.addEventListener('pointerdown', createWaterSplash);
});

onBeforeUnmount(() => {
  window.removeEventListener('toggle-theme', toggleTheme);
  window.removeEventListener('auth-changed', checkUser);
  window.removeEventListener('open-theme-popup', openThemePopup);
  document.removeEventListener('contextmenu', suppressNativeContextMenu);
  document.removeEventListener('pointerdown', createWaterSplash);
  flushDesktopStateSave();
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

:root {
  --pencil-cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cg transform='rotate(145 16 16)'%3E%3Crect x='14' y='3' width='5' height='22' rx='2.5' fill='%23f6c45f' stroke='%233c3c3c' stroke-width='1.4'/%3E%3Cpath d='M14 25h5l-2.5 5z' fill='%23f3d2aa' stroke='%233c3c3c' stroke-width='1.4' stroke-linejoin='round'/%3E%3Cpath d='M15.5 29.4l1-2.5 1 2.5z' fill='%23333333'/%3E%3Crect x='14' y='3' width='5' height='4' rx='1.4' fill='%23ef7b8a' stroke='%233c3c3c' stroke-width='1.2'/%3E%3Cline x1='16.5' y1='8' x2='16.5' y2='23' stroke='%23ffffff' stroke-opacity='.55' stroke-width='1'/%3E%3C/g%3E%3C/svg%3E") 6 5;
}

html,
body,
body * {
  cursor: var(--pencil-cursor), auto !important;
}

input[type="text"],
input[type="email"],
input[type="password"],
input[type="search"],
input[type="number"],
textarea,
[contenteditable="true"] {
  cursor: text !important;
}

.water-splash-layer {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  pointer-events: none;
  overflow: hidden;
}

.water-splash {
  position: absolute;
  width: 96px;
  height: 96px;
  transform: translate(-50%, -50%);
  opacity: 0;
  animation: splash-shell 820ms ease-out forwards;
}

.water-splash::before,
.water-splash::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999px;
  transform: translate(-50%, -50%);
}

.water-splash::before {
  width: 18px;
  height: 10px;
  border: 2px solid rgba(98, 207, 255, 0.72);
  box-shadow:
    0 0 12px rgba(72, 190, 255, 0.32),
    inset 0 0 8px rgba(255, 255, 255, 0.7);
  animation: splash-ripple 820ms ease-out forwards;
}

.water-splash::after {
  width: 9px;
  height: 9px;
  background:
    radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.98) 0 2px, transparent 2.6px),
    radial-gradient(circle at 62% 72%, rgba(45, 153, 255, 0.72), rgba(112, 217, 255, 0.94) 62%, rgba(245, 253, 255, 0.82));
  box-shadow:
    -26px -38px 0 -1px rgba(114, 217, 255, 0.94),
    -14px -54px 0 -2px rgba(240, 253, 255, 0.96),
    8px -48px 0 0 rgba(94, 203, 255, 0.95),
    25px -36px 0 -2px rgba(235, 252, 255, 0.94),
    -35px -18px 0 -3px rgba(91, 198, 255, 0.86),
    34px -16px 0 -3px rgba(92, 197, 255, 0.86);
  filter: drop-shadow(0 7px 5px rgba(17, 92, 130, 0.24));
  animation: splash-drops 820ms cubic-bezier(0.17, 0.72, 0.22, 1) forwards;
}

.water-splash {
  background:
    radial-gradient(ellipse at 50% 58%, rgba(255, 255, 255, 0.74) 0 8px, transparent 9px),
    radial-gradient(ellipse at 50% 62%, rgba(75, 189, 255, 0.46) 0 17px, transparent 18px);
}

@keyframes splash-shell {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.72);
  }
  62% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.08);
  }
}

@keyframes splash-ripple {
  0% {
    opacity: 0.9;
    width: 8px;
    height: 4px;
  }
  100% {
    opacity: 0;
    width: 86px;
    height: 42px;
  }
}

@keyframes splash-drops {
  0% {
    opacity: 0;
    transform: translate(-50%, -35%) scale(0.35);
  }
  16% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, 14%) scale(1.22);
  }
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
