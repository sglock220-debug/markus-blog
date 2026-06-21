<template>
  <div ref="pageRef" class="reid-manor-page container" :class="{ 'is-playing': mode === 'playing' }">
    <div v-if="mode === 'playing'" class="game-toolbar">
      <button type="button" class="toolbar-btn" @click="openLeaveDialog">
        <ArrowLeftIcon size="20" />
        返回主页
      </button>

      <button type="button" class="toolbar-btn" @click="toggleFullscreen">
        <MinimizeIcon v-if="isFullscreen" size="20" />
        <MaximizeIcon v-else size="20" />
        {{ isFullscreen ? '退出全屏' : '全屏' }}
      </button>
    </div>

    <section ref="gameShellRef" class="game-shell" :class="{ 'menu-shell': mode !== 'playing' }">
      <div v-if="mode === 'title'" class="menu-scene">
        <div class="pixel-preview" aria-hidden="true">
          <span class="preview-house"></span>
          <span class="preview-field"></span>
          <span class="preview-water"></span>
          <span class="preview-road"></span>
          <span class="preview-tree tree-one"></span>
          <span class="preview-tree tree-two"></span>
        </div>

        <div class="menu-panel">
          <p class="menu-kicker">原创像素农场原型</p>
          <h1>锐德庄园</h1>
          <div class="menu-actions">
            <button type="button" class="primary-menu-btn" @click="openCreateCharacter">
              新游戏
            </button>
            <button
              type="button"
              class="menu-btn"
              :disabled="!hasSave"
              @click="continueGame"
            >
              继续游戏
              <span v-if="!hasSave">暂无存档</span>
            </button>
            <button type="button" class="menu-btn" @click="openLoadSaves">
              加载存档
            </button>
            <button type="button" class="menu-btn" @click="mode = 'settings'">
              设置
            </button>
            <button type="button" class="menu-btn" @click="goToHall">
              返回游戏大厅
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="mode === 'load'" class="load-scene" @click="selectedSlotId = null">
        <div class="load-panel" @click.stop>
          <button type="button" class="text-back-btn" @click="mode = 'title'">
            <ArrowLeftIcon size="18" />
            返回标题
          </button>
          <h1>加载存档</h1>

          <div class="slot-actions">
            <button
              type="button"
              class="slot-action load-action"
              :disabled="!selectedSlot?.save"
              @click="loadSelectedSlot"
            >
              <CheckIcon size="18" />
              加载
            </button>
            <button
              type="button"
              class="slot-action delete-action"
              :disabled="!selectedSlot?.save"
              @click="deleteSelectedSlot"
            >
              <TrashIcon size="18" />
              删除
            </button>
          </div>

          <div class="save-slot-list">
            <button
              v-for="slot in slotList"
              :key="slot.slotId"
              type="button"
              class="save-slot"
              :class="{ selected: selectedSlotId === slot.slotId, empty: !slot.save }"
              @click="selectedSlotId = slot.slotId"
              @dblclick="loadSlot(slot.slotId)"
            >
              <span class="slot-number">存档 {{ slot.slotId }}</span>
              <strong>{{ slot.save ? slot.save.character?.name || '旅行者' : '空存档' }}</strong>
              <span>{{ slot.save ? getSaveMeta(slot.save) : '这里还没有庄园记录' }}</span>
              <small>{{ slot.save ? getSavedAt(slot.save.savedAt) : '新游戏会自动使用空槽位' }}</small>
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="mode === 'create'" class="create-scene">
        <div class="create-panel">
          <button type="button" class="text-back-btn" @click="mode = 'title'">
            <ArrowLeftIcon size="18" />
            返回标题
          </button>
          <h1>创建角色</h1>

          <label class="name-field">
            <span>名字</span>
            <input
              v-model.trim="characterForm.name"
              type="text"
              :maxlength="characterNameMax"
              autocomplete="off"
            />
          </label>
          <p v-if="nameError" class="form-error">{{ nameError }}</p>

          <div class="creator-grid">
            <div class="avatar-card">
              <div class="pixel-avatar" :style="avatarStyle" :class="`hair-${characterForm.hair}`">
                <span class="avatar-hair"></span>
                <span class="avatar-head"></span>
                <span class="avatar-eye left"></span>
                <span class="avatar-eye right"></span>
                <span class="avatar-body"></span>
                <span class="avatar-leg left"></span>
                <span class="avatar-leg right"></span>
              </div>
              <strong>{{ safeCharacterName }}</strong>
            </div>

            <div class="option-stack">
              <fieldset class="option-group">
                <legend>发型</legend>
                <button
                  v-for="(hair, index) in characterOptions.hairstyles"
                  :key="hair.id"
                  type="button"
                  class="option-chip"
                  :class="{ selected: characterForm.hair === index }"
                  @click="characterForm.hair = index"
                >
                  {{ hair.label }}
                </button>
              </fieldset>

              <fieldset class="option-group">
                <legend>肤色</legend>
                <button
                  v-for="(skin, index) in characterOptions.skinTones"
                  :key="skin.id"
                  type="button"
                  class="swatch-chip"
                  :class="{ selected: characterForm.skin === index }"
                  :style="{ '--swatch': toCssColor(skin.color) }"
                  @click="characterForm.skin = index"
                >
                  {{ skin.label }}
                </button>
              </fieldset>

              <fieldset class="option-group">
                <legend>衣服</legend>
                <button
                  v-for="(outfit, index) in characterOptions.outfits"
                  :key="outfit.id"
                  type="button"
                  class="swatch-chip"
                  :class="{ selected: characterForm.outfit === index }"
                  :style="{ '--swatch': toCssColor(outfit.color) }"
                  @click="characterForm.outfit = index"
                >
                  {{ outfit.label }}
                </button>
              </fieldset>
            </div>
          </div>

          <button type="button" class="primary-menu-btn start-life-btn" @click="startNewGame">
            开始庄园生活
          </button>
        </div>
      </div>

      <div v-else-if="mode === 'settings'" class="settings-scene">
        <div class="menu-panel small-panel">
          <button type="button" class="text-back-btn" @click="mode = 'title'">
            <ArrowLeftIcon size="18" />
            返回标题
          </button>
          <h1>设置</h1>
          <p>当前版本保留默认像素锐化、自动存档和键鼠/触控输入。</p>
          <p>更多音量、显示和按键配置会在后续阶段加入。</p>
        </div>
      </div>

      <div v-if="mode === 'playing'" class="game-play-frame" :style="gameViewportStyle">
        <div ref="gameContainerRef" class="game-container" aria-label="锐德庄园游戏画面"></div>
        <div v-if="gameLoading || gameFailed" class="game-status-overlay">
          <strong>{{ gameFailed ? '游戏画面加载异常' : '正在进入庄园...' }}</strong>
          <span>{{ gameFailed ? gameErrorDetail : '正在准备地图、背包和存档。' }}</span>
        </div>
      </div>
    </section>

    <div v-if="dialog.open" class="page-dialog-backdrop" @click.self="cancelDialog">
      <div class="page-dialog" role="dialog" aria-modal="true" @click.stop>
        <h2>{{ dialog.title }}</h2>
        <p>{{ dialog.message }}</p>
        <div class="dialog-actions">
          <button type="button" class="dialog-cancel" @click="cancelDialog">
            {{ dialog.cancelText }}
          </button>
          <button
            type="button"
            class="dialog-confirm"
            :class="{ danger: dialog.danger }"
            @click="confirmDialog"
          >
            {{ dialog.confirmText }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="leaveDialogOpen" class="page-dialog-backdrop" @click.self="cancelLeaveDialog">
      <div class="page-dialog leave-dialog" role="dialog" aria-modal="true" @click.stop>
        <h2>离开锐德庄园</h2>
        <p>是否保存当前进度后返回？</p>
        <div class="dialog-actions leave-actions">
          <button type="button" class="dialog-confirm save-return" @click="leaveWithSave">
            保存并返回
          </button>
          <button type="button" class="dialog-confirm no-save-return" @click="leaveWithoutSave">
            不保存返回
          </button>
          <button type="button" class="dialog-cancel" @click="cancelLeaveDialog">
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowLeft as ArrowLeftIcon,
  Check as CheckIcon,
  Maximize2 as MaximizeIcon,
  Minimize2 as MinimizeIcon,
  Trash2 as TrashIcon
} from '@lucide/vue';
import { createReidManorGame } from '../games/reid-manor/createReidManorGame';
import SaveSystem from '../games/reid-manor/SaveSystem';
import { CHARACTER_CONFIG, SAVE_CONFIG, TIME_CONFIG, WEATHER } from '../games/reid-manor/config';

const router = useRouter();
const saveSystem = new SaveSystem();
const pageRef = ref(null);
const gameContainerRef = ref(null);
const gameShellRef = ref(null);
const gameViewportStyle = ref({ width: '1024px', height: '576px' });
const isFullscreen = ref(false);
const leaveDialogOpen = ref(false);
const leaveTarget = ref('home'); // 'home', 'hall', 'title'
const mode = ref('title');
const hasSave = ref(false);
const gameLoading = ref(false);
const gameFailed = ref(false);
const gameErrorDetail = ref('');
const slotList = ref([]);
const selectedSlotId = ref(null);
const characterOptions = CHARACTER_CONFIG;
const characterNameMax = CHARACTER_CONFIG.nameMaxLength;
const characterForm = reactive({
  name: CHARACTER_CONFIG.defaultName,
  hair: 0,
  skin: 0,
  outfit: 0
});
const dialog = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  danger: false
});
let game = null;
let resizeObserver = null;
let gameReadyTimer = null;
let dialogResolver = null;

const trimmedName = computed(() => characterForm.name.trim());
const nameError = computed(() => {
  if (trimmedName.value.length < CHARACTER_CONFIG.nameMinLength) {
    return `名字至少 ${CHARACTER_CONFIG.nameMinLength} 个字符`;
  }

  return '';
});
const selectedSlot = computed(() => slotList.value.find((slot) => slot.slotId === selectedSlotId.value) || null);
const safeCharacterName = computed(() => trimmedName.value || CHARACTER_CONFIG.defaultName);
const avatarStyle = computed(() => ({
  '--hair': toCssColor(CHARACTER_CONFIG.hairstyles[characterForm.hair]?.color || CHARACTER_CONFIG.hairstyles[0].color),
  '--skin': toCssColor(CHARACTER_CONFIG.skinTones[characterForm.skin]?.color || CHARACTER_CONFIG.skinTones[0].color),
  '--outfit': toCssColor(CHARACTER_CONFIG.outfits[characterForm.outfit]?.color || CHARACTER_CONFIG.outfits[0].color)
}));

const refreshSaveState = () => {
  slotList.value = saveSystem.getSlots();
  hasSave.value = slotList.value.some((slot) => slot.save);
};

const GAME_BASE_WIDTH = 1024;
const GAME_BASE_HEIGHT = 576;

const fitGameViewport = () => {
  const shell = gameShellRef.value;
  if (!shell || mode.value !== 'playing') return;

  // In fullscreen, we use the fullscreen element's dimensions for maximum accuracy
  const fsElement = document.fullscreenElement;
  const isFS = !!fsElement;
  
  const availableWidth = isFS ? fsElement.clientWidth : Math.max(1, shell.clientWidth);
  const availableHeight = isFS ? fsElement.clientHeight : Math.max(1, shell.clientHeight);
  
  // Calculate the raw scale to fit the available space
  const rawScale = Math.min(availableWidth / GAME_BASE_WIDTH, availableHeight / GAME_BASE_HEIGHT);
  
  // Requirement: allow scale > 1 in fullscreen, up to 1.8 or 2.0
  // In normal mode, we keep it <= 1.0 to fit into the page layout nicely
  const maxScale = isFS ? 2.0 : 1.0;
  const scale = Math.min(maxScale, rawScale);
  
  const finalWidth = Math.max(1, Math.floor(GAME_BASE_WIDTH * scale));
  const finalHeight = Math.max(1, Math.floor(GAME_BASE_HEIGHT * scale));

  gameViewportStyle.value = {
    width: `${finalWidth}px`,
    height: `${finalHeight}px`,
    imageRendering: 'pixelated'
  };
};

const refreshGameScale = () => {
  fitGameViewport();
  // Using requestAnimationFrame ensures we get the most up-to-date layout dimensions
  requestAnimationFrame(() => {
    fitGameViewport();
    if (game?.scale) {
      game.scale.refresh();
    }
  });
};

const handleVisualViewportResize = () => {
  refreshGameScale();
};

const waitForLayout = () => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});

const mountGame = async () => {
  await nextTick();
  await waitForLayout();
  fitGameViewport();
  const container = gameContainerRef.value;
  if (!container || game) return;

  gameLoading.value = true;
  gameFailed.value = false;
  gameErrorDetail.value = '';
  container.replaceChildren();
  try {
    game = createReidManorGame(container);
  } catch (error) {
    console.error('Failed to create Reid Manor game', error);
    gameLoading.value = false;
    gameFailed.value = true;
    gameErrorDetail.value = getErrorDetail(error);
    return;
  }
  
  // Observe both the shell and the page container for size changes
  resizeObserver = new ResizeObserver(() => {
    refreshGameScale();
  });
  
  if (gameShellRef.value) resizeObserver.observe(gameShellRef.value);
  if (pageRef.value) resizeObserver.observe(pageRef.value);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleVisualViewportResize);
  }
  
  requestAnimationFrame(refreshGameScale);

  window.clearTimeout(gameReadyTimer);
  gameReadyTimer = window.setTimeout(() => {
    if (gameLoading.value) {
      gameFailed.value = true;
      gameErrorDetail.value = 'Scene 未在预期时间内完成创建，请查看控制台中的 Phaser 错误。';
    }
  }, 3500);
};

const destroyGame = () => {
  window.clearTimeout(gameReadyTimer);
  gameReadyTimer = null;
  gameLoading.value = false;
  gameFailed.value = false;
  gameErrorDetail.value = '';
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
  }
  game?.destroy(true);
  game = null;
  gameContainerRef.value?.replaceChildren();
};

const enterGame = async () => {
  destroyGame();
  mode.value = 'playing';
  await mountGame();
};

const continueGame = async () => {
  refreshSaveState();
  const activeId = saveSystem.getActiveSlotId();
  const activeSlot = slotList.value.find((slot) => slot.slotId === activeId && slot.save);
  const fallbackSlot = slotList.value.find((slot) => slot.save);
  const targetSlot = activeSlot || fallbackSlot;
  if (!targetSlot) return;

  saveSystem.setActiveSlot(targetSlot.slotId);
  await enterGame();
};

const openLoadSaves = () => {
  refreshSaveState();
  selectedSlotId.value = saveSystem.getActiveSlotId() || slotList.value.find((slot) => slot.save)?.slotId || null;
  mode.value = 'load';
};

const loadSelectedSlot = async () => {
  if (!selectedSlot.value?.save) return;
  await loadSlot(selectedSlot.value.slotId);
};

const loadSlot = async (slotId) => {
  const slot = slotList.value.find((entry) => entry.slotId === slotId);
  if (!slot?.save) return;

  saveSystem.setActiveSlot(slotId);
  await enterGame();
};

const deleteSelectedSlot = async () => {
  if (!selectedSlot.value?.save) return;

  const slotId = selectedSlot.value.slotId;
  const ok = await openDialog({
    title: `删除存档 ${slotId}`,
    message: '这个存档删除后不可恢复。确定删除吗？',
    confirmText: '删除',
    danger: true
  });
  if (!ok) return;

  saveSystem.deleteSlot(slotId);
  refreshSaveState();
  selectedSlotId.value = slotList.value.find((slot) => slot.save)?.slotId || null;
};

const openCreateCharacter = () => {
  characterForm.name = CHARACTER_CONFIG.defaultName;
  characterForm.hair = 0;
  characterForm.skin = 0;
  characterForm.outfit = 0;
  mode.value = 'create';
};

const startNewGame = async () => {
  if (nameError.value) return;

  refreshSaveState();
  const slotId = saveSystem.getFirstAvailableSlotId();
  if (!slotId) {
    await openDialog({
      title: '存档已满',
      message: `最多只能保存 ${SAVE_CONFIG.maxSlots} 个庄园，请先在“加载存档”中删除一个旧存档。`,
      confirmText: '知道了'
    });
    mode.value = 'load';
    return;
  }

  const freshSave = saveSystem.createNewSave({
    name: trimmedName.value,
    hair: characterForm.hair,
    skin: characterForm.skin,
    outfit: characterForm.outfit
  });
  saveSystem.saveToSlot(slotId, freshSave);
  refreshSaveState();
  await enterGame();
};

const toggleFullscreen = async () => {
  const page = pageRef.value;
  if (!page) return;

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (page.requestFullscreen) {
      await page.requestFullscreen();
    }
  } catch (error) {
    console.warn('Fullscreen request failed', error);
  }
};

const getGameScene = () => game?.scene?.getScene('ReidManorScene');

const openLeaveDialog = (target = 'home') => {
  leaveTarget.value = target;
  leaveDialogOpen.value = true;
  game?.scene?.pause('ReidManorScene');
};

const cancelLeaveDialog = () => {
  leaveDialogOpen.value = false;
  game?.scene?.resume('ReidManorScene');
};

const leaveWithSave = async () => {
  const scene = getGameScene();
  scene?.saveNow?.();
  leaveDialogOpen.value = false;
  const target = leaveTarget.value;
  destroyGame();
  
  if (target === 'home') {
    await router.push('/');
  } else if (target === 'hall') {
    await router.push('/games');
  } else {
    refreshSaveState();
    mode.value = 'title';
  }
};

const leaveWithoutSave = async () => {
  const scene = getGameScene();
  if (scene) scene.skipShutdownSave = true;
  leaveDialogOpen.value = false;
  const target = leaveTarget.value;
  destroyGame();
  
  if (target === 'home') {
    await router.push('/');
  } else if (target === 'hall') {
    await router.push('/games');
  } else {
    refreshSaveState();
    mode.value = 'title';
  }
};

const handleFullscreenChange = () => {
  isFullscreen.value = document.fullscreenElement === pageRef.value;
  requestAnimationFrame(refreshGameScale);
  window.setTimeout(refreshGameScale, 120);
};

const handleReturnTitle = () => {
  destroyGame();
  refreshSaveState();
  mode.value = 'title';
};

const handleRequestLeave = (event) => {
  openLeaveDialog(event.detail?.target || 'home');
};

const goToHall = () => {
  destroyGame();
  router.push('/games');
};

const handleReturnHall = () => {
  destroyGame();
  router.push('/games');
};

const handleGameReady = () => {
  gameLoading.value = false;
  gameFailed.value = false;
  gameErrorDetail.value = '';
  window.clearTimeout(gameReadyTimer);
  gameReadyTimer = null;
  refreshGameScale();
};

const handleRuntimeError = (event) => {
  if (mode.value !== 'playing') return;

  const message = event.reason?.message || event.error?.message || event.message || '';
  if (!message) return;

  gameLoading.value = false;
  gameFailed.value = true;
  gameErrorDetail.value = `开发错误：${message}`;
};

const openDialog = ({
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  danger = false
}) => new Promise((resolve) => {
  dialogResolver?.(false);
  dialogResolver = resolve;
  dialog.title = title;
  dialog.message = message;
  dialog.confirmText = confirmText;
  dialog.cancelText = cancelText;
  dialog.danger = danger;
  dialog.open = true;
});

const closeDialog = (result) => {
  dialog.open = false;
  dialogResolver?.(result);
  dialogResolver = null;
};

const confirmDialog = () => closeDialog(true);
const cancelDialog = () => closeDialog(false);

const handlePageEscape = (event) => {
  if (event.key !== 'Escape') return;
  if (leaveDialogOpen.value) {
    event.preventDefault();
    cancelLeaveDialog();
  } else if (dialog.open) {
    event.preventDefault();
    cancelDialog();
  }
};

const getSaveMeta = (save) => {
  const minutes = save.time?.totalMinutes || 0;
  const day = Math.floor(minutes / TIME_CONFIG.minutesPerDay) + 1;
  const minuteOfDay = minutes % TIME_CONFIG.minutesPerDay;
  const hour = Math.floor(minuteOfDay / 60).toString().padStart(2, '0');
  const minute = Math.floor(minuteOfDay % 60).toString().padStart(2, '0');
  const weekday = TIME_CONFIG.weekdays[(day - 1) % TIME_CONFIG.weekdays.length];
  const weather = WEATHER.labels[save.time?.weather] || '晴天';
  const gold = save.inventory?.gold || 0;
  return `第 ${day} 天 · ${weekday} · ${hour}:${minute} · ${weather} · 金币 ${gold}`;
};

const getSavedAt = (savedAt) => {
  if (!Number.isFinite(savedAt)) return '尚未记录保存时间';
  return `保存于 ${new Date(savedAt).toLocaleString()}`;
};

const getErrorDetail = (error) => {
  const message = error?.message || String(error || '');
  return message ? `开发错误：${message}` : '请返回标题后重新进入，若仍异常请检查控制台错误。';
};

const toCssColor = (color) => `#${Number(color).toString(16).padStart(6, '0')}`;

onMounted(() => {
  refreshSaveState();
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  window.addEventListener('reid-manor-request-leave', handleRequestLeave);
  window.addEventListener('reid-manor-return-title', handleReturnTitle);
  window.addEventListener('reid-manor-return-hall', handleReturnHall);
  window.addEventListener('reid-manor-ready', handleGameReady);
  window.addEventListener('error', handleRuntimeError);
  window.addEventListener('unhandledrejection', handleRuntimeError);
  window.addEventListener('keydown', handlePageEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  window.removeEventListener('reid-manor-request-leave', handleRequestLeave);
  window.removeEventListener('reid-manor-return-title', handleReturnTitle);
  window.removeEventListener('reid-manor-return-hall', handleReturnHall);
  window.removeEventListener('reid-manor-ready', handleGameReady);
  window.removeEventListener('error', handleRuntimeError);
  window.removeEventListener('unhandledrejection', handleRuntimeError);
  window.removeEventListener('keydown', handlePageEscape);
  cancelDialog();
  leaveDialogOpen.value = false;
  destroyGame();

  if (document.fullscreenElement === pageRef.value) {
    document.exitFullscreen().catch(() => {});
  }
});
</script>

<style scoped>
.reid-manor-page {
  width: 100%;
  max-width: none;
  padding: 16px clamp(16px, 3vw, 48px) 28px;
  min-height: 70vh;
}

.reid-manor-page.is-playing {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--navbar-height) - var(--footer-height) - 20px);
  min-height: 0;
  overflow: hidden;
}

.game-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  margin-bottom: 12px;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-color);
  text-decoration: none;
  font-weight: 700;
  box-shadow: var(--card-shadow);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.toolbar-btn:hover {
  color: var(--accent-color);
  border-color: var(--accent-color);
  transform: translateY(-1px);
}

.game-shell {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  overflow: visible;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: #202617;
  box-shadow: var(--card-shadow);
  touch-action: none;
}

.reid-manor-page.is-playing .game-shell {
  display: grid;
  flex: 1 1 auto;
  min-height: 0;
  place-items: center;
  overflow: hidden;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.menu-shell {
  max-width: 1120px;
  overflow: hidden;
  background: #f7fbf1;
  touch-action: auto;
}

.game-play-frame {
  position: relative;
  flex: 0 0 auto;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: #6fb55a;
  box-shadow: var(--card-shadow);
}

.game-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #6fb55a;
  overflow: hidden;
}

.game-status-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 8px;
  text-align: center;
  color: #fff7df;
  background: rgba(45, 40, 31, 0.18);
  pointer-events: none;
}

.game-status-overlay strong {
  font-size: 1.15rem;
}

.game-status-overlay span {
  font-size: 0.9rem;
}

.menu-scene,
.create-scene,
.settings-scene,
.load-scene {
  position: relative;
  display: grid;
  min-height: 560px;
  place-items: center;
  padding: 36px;
  overflow: hidden;
}

.menu-scene::before,
.load-scene::before,
.settings-scene::before,
.create-scene::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.18) 1px, transparent 1px),
    linear-gradient(rgba(255, 255, 255, 0.18) 1px, transparent 1px),
    #a9d995;
  background-size: 32px 32px;
}

.pixel-preview {
  position: absolute;
  inset: 0;
}

.pixel-preview::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(247, 251, 241, 0.38);
}

.preview-house,
.preview-field,
.preview-water,
.preview-road,
.preview-tree {
  position: absolute;
  display: block;
}

.preview-house {
  left: 14%;
  top: 20%;
  width: 130px;
  height: 96px;
  border-radius: 6px;
  background: linear-gradient(#b84f4a 0 34%, #f2d39a 34%);
  border: 3px solid rgba(45, 40, 31, 0.32);
}

.preview-field {
  left: 23%;
  bottom: 18%;
  width: 240px;
  height: 116px;
  border-radius: 8px;
  background:
    repeating-linear-gradient(0deg, #8a5a35 0 14px, #a66a3d 14px 28px);
  border: 3px solid rgba(45, 40, 31, 0.22);
}

.preview-water {
  right: 8%;
  bottom: 12%;
  width: 260px;
  height: 118px;
  border-radius: 28px;
  background: #55aee4;
  border: 8px solid #337da7;
}

.preview-road {
  left: 42%;
  top: 0;
  width: 82px;
  height: 100%;
  transform: rotate(8deg);
  background: rgba(213, 176, 107, 0.8);
}

.preview-tree {
  width: 58px;
  height: 78px;
  border-radius: 50% 50% 42% 42%;
  background: #2f8a45;
  box-shadow: inset 0 -18px #7a5838;
}

.tree-one {
  right: 28%;
  top: 16%;
}

.tree-two {
  right: 20%;
  top: 28%;
}

.menu-panel,
.create-panel,
.load-panel {
  position: relative;
  z-index: 1;
  width: min(100%, 430px);
  padding: 28px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: var(--card-shadow);
}

.create-panel,
.load-panel {
  width: min(100%, 820px);
}

.small-panel {
  width: min(100%, 520px);
}

.menu-kicker {
  margin: 0 0 8px;
  color: var(--accent-color);
  font-weight: 800;
}

.menu-panel h1,
.create-panel h1,
.load-panel h1 {
  margin: 0 0 24px;
  color: var(--text-color);
  font-size: clamp(2rem, 5vw, 3.4rem);
  letter-spacing: 0;
}

.menu-actions {
  display: grid;
  gap: 12px;
}

.primary-menu-btn,
.menu-btn,
.text-back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: #fff;
  color: var(--text-color);
  font-weight: 800;
  cursor: pointer;
}

.primary-menu-btn {
  border-color: var(--accent-color);
  background: var(--accent-color);
  color: #fff;
}

.menu-btn span {
  color: #888;
  font-size: 0.86rem;
  font-weight: 700;
}

.menu-btn:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.text-back-btn {
  justify-content: flex-start;
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--accent-color);
}

.slot-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.slot-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  color: #fff;
  font-weight: 900;
  cursor: pointer;
}

.slot-action:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.load-action {
  background: #3f8c55;
}

.delete-action {
  background: #e74c3c;
}

.save-slot-list {
  display: grid;
  gap: 10px;
}

.save-slot {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 14px 16px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: #fff;
  color: var(--text-color);
  text-align: left;
  cursor: pointer;
}

.save-slot.selected {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.16);
}

.save-slot.empty {
  color: #888;
  background: rgba(255, 255, 255, 0.72);
}

.slot-number {
  color: var(--accent-color);
  font-weight: 900;
}

.save-slot strong {
  font-size: 1.05rem;
}

.save-slot small {
  color: #777;
}

.name-field {
  display: grid;
  gap: 8px;
  margin-top: 18px;
  color: var(--text-color);
  font-weight: 800;
}

.name-field input {
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-color);
  font: inherit;
}

.form-error {
  margin: 8px 0 0;
  color: #e74c3c;
  font-weight: 700;
}

.creator-grid {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  margin-top: 22px;
}

.avatar-card {
  display: grid;
  place-items: center;
  gap: 14px;
  min-height: 260px;
  border-radius: 10px;
  background: #f7fbf1;
  border: 1px solid var(--border-color);
}

.pixel-avatar {
  position: relative;
  width: 96px;
  height: 120px;
  image-rendering: pixelated;
  transform: scale(1.4);
}

.pixel-avatar span {
  position: absolute;
  display: block;
}

.avatar-head {
  left: 27px;
  top: 26px;
  width: 42px;
  height: 38px;
  background: var(--skin);
  border: 3px solid #2d281f;
}

.avatar-hair {
  left: 22px;
  top: 18px;
  width: 52px;
  height: 22px;
  background: var(--hair);
  border: 3px solid #2d281f;
}

.hair-1 .avatar-hair {
  height: 34px;
  border-radius: 20px 20px 8px 8px;
}

.hair-2 .avatar-hair {
  width: 58px;
  height: 28px;
  border-radius: 50%;
}

.hair-3 .avatar-hair {
  top: 14px;
  height: 18px;
  background: #3f6542;
}

.avatar-eye {
  top: 44px;
  width: 6px;
  height: 6px;
  background: #2d281f;
}

.avatar-eye.left {
  left: 38px;
}

.avatar-eye.right {
  right: 38px;
}

.avatar-body {
  left: 24px;
  top: 67px;
  width: 48px;
  height: 38px;
  background: var(--outfit);
  border: 3px solid #2d281f;
}

.avatar-leg {
  top: 102px;
  width: 16px;
  height: 16px;
  background: #244a7a;
  border: 3px solid #2d281f;
}

.avatar-leg.left {
  left: 27px;
}

.avatar-leg.right {
  right: 27px;
}

.option-stack {
  display: grid;
  gap: 16px;
}

.option-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.option-group legend {
  padding: 0 6px;
  color: var(--text-color);
  font-weight: 800;
}

.option-chip,
.swatch-chip {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: #fff;
  color: var(--text-color);
  font-weight: 700;
  cursor: pointer;
}

.swatch-chip::before {
  content: "";
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  vertical-align: -3px;
  border-radius: 4px;
  background: var(--swatch);
  border: 1px solid rgba(45, 40, 31, 0.28);
}

.option-chip.selected,
.swatch-chip.selected {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.16);
}

.start-life-btn {
  width: 100%;
  margin-top: 22px;
}

.settings-scene p {
  margin: 10px 0 0;
  color: #666;
  line-height: 1.7;
}

.page-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(45, 40, 31, 0.26);
}

.page-dialog {
  width: min(100%, 420px);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: #fff;
  box-shadow: var(--card-shadow);
}

.page-dialog h2 {
  margin: 0 0 10px;
  color: var(--text-color);
}

.page-dialog p {
  margin: 0;
  color: #555;
  line-height: 1.7;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.dialog-cancel,
.dialog-confirm {
  min-width: 86px;
  min-height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: #fff;
  color: var(--text-color);
  font-weight: 800;
  cursor: pointer;
}

.dialog-confirm {
  border-color: var(--accent-color);
  background: var(--accent-color);
  color: #fff;
}

.dialog-confirm.danger {
  border-color: #e74c3c;
  background: #e74c3c;
}

.leave-dialog {
  border: 3px solid #6c5b42;
  background: #fff9e8;
}

.leave-actions {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
}

.save-return {
  border-color: #3f8c55;
  background: #3f8c55;
}

.no-save-return {
  border-color: #c74b40;
  background: #c74b40;
}

.reid-manor-page:fullscreen {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  padding: 0;
  margin: 0;
  background: #000;
  overflow: hidden;
  max-width: none;
  align-items: stretch;
}

.reid-manor-page:fullscreen .game-toolbar {
  position: absolute;
  top: 24px;
  left: 24px;
  right: 24px;
  width: calc(100% - 48px);
  margin: 0;
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;
}

.reid-manor-page:fullscreen .toolbar-btn {
  pointer-events: auto;
  background: rgba(45, 40, 31, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff7df;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.reid-manor-page:fullscreen .game-shell {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  flex: 1;
}

.reid-manor-page:fullscreen .game-play-frame {
  margin: auto;
  border: none;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
  max-width: none;
  max-height: none;
}

.reid-manor-page:fullscreen .game-container {
  width: 100%;
  height: 100%;
  background: transparent;
}

.game-container :deep(canvas) {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  touch-action: none;
  user-select: none;
}

@media (max-width: 760px) {
  .reid-manor-page {
    padding: 10px 8px 20px;
  }

  .game-toolbar {
    align-items: center;
    flex-direction: row;
  }

  .toolbar-btn {
    justify-content: center;
    padding: 8px 10px;
    font-size: 0.86rem;
  }

  .menu-scene,
  .create-scene,
  .settings-scene,
  .load-scene {
    min-height: 640px;
    padding: 20px;
  }

  .creator-grid {
    grid-template-columns: 1fr;
  }

  .slot-actions {
    grid-template-columns: 1fr;
  }

  .leave-actions {
    grid-template-columns: 1fr;
  }

  .game-container {
    min-height: 0;
  }

  .reid-manor-page.is-playing {
    height: calc(100vh - var(--navbar-height) - 24px);
    min-height: 0;
  }
}
</style>
