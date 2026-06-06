<template>
  <div class="mobile-camera">
    <div class="camera-stage" :class="{ cyberpunk: visionStyle === 'cyberpunk' }">
      <video ref="videoRef" autoplay playsinline class="video-feed"></video>
      <canvas ref="canvasRef" class="hud-canvas"></canvas>
      
      <!-- Mobile HUD -->
      <div class="mobile-hud">
        <div class="hud-info">
          <div class="mode-tag">{{ visionStyle.toUpperCase() }}</div>
          <div class="status-tag" :class="workerStatus">{{ workerStatus.toUpperCase() }}</div>
        </div>
      </div>

      <!-- Floating Controls -->
      <div class="mobile-controls">
        <template v-if="!isStreaming">
          <button @click="startCamera" class="m-capture-btn start">
            <CameraIcon size="32" />
          </button>
        </template>
        <template v-else>
          <div class="control-row">
            <button @click="showStyleMenu = !showStyleMenu" class="m-tool-btn">
              <LayersIcon size="20" />
            </button>
            <button @click="showDetectMenu = !showDetectMenu" class="m-tool-btn">
              <TargetIcon size="20" />
            </button>
            <button @click="showOptionMenu = !showOptionMenu" class="m-tool-btn">
              <SettingsIcon size="20" />
            </button>
          </div>
          <div class="main-actions">
            <button @click="stopCamera" class="m-capture-btn stop">
              <XIcon size="32" />
            </button>
            <button @click="captureFrame" class="m-capture-btn capture">
              <DownloadIcon size="32" />
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Mobile Menus (Bottom Sheets) -->
    <transition name="slide-up">
      <div v-if="showStyleMenu" class="bottom-sheet" @click="showStyleMenu = false">
        <div class="sheet-content" @click.stop>
          <h3>选择视觉风格</h3>
          <button @click="visionStyle = 'default'; showStyleMenu = false">默认风格</button>
          <button @click="visionStyle = 'cyberpunk'; showStyleMenu = false">赛博朋克</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { 
  Camera as CameraIcon, 
  X as XIcon, 
  Layers as LayersIcon, 
  Target as TargetIcon, 
  Settings as SettingsIcon,
  Download as DownloadIcon
} from '@lucide/vue';
import { useCyberCamera } from '../../composables/useCyberCamera';

const videoRef = ref(null);
const canvasRef = ref(null);

const {
  isStreaming, visionStyle, showStyleMenu, showDetectMenu, showOptionMenu,
  workerStatus, startCamera, stopCamera
} = useCyberCamera(videoRef, canvasRef);

const captureFrame = () => {
  if (!videoRef.value) return;
  const canvas = document.createElement('canvas');
  canvas.width = videoRef.value.videoWidth;
  canvas.height = videoRef.value.videoHeight;
  canvas.getContext('2d').drawImage(videoRef.value, 0, 0);
  const link = document.createElement('a');
  link.download = `cyber-capture-${Date.now()}.png`;
  link.href = canvas.toDataURL();
  link.click();
};
</script>

<style scoped>
.mobile-camera {
  position: fixed;
  inset: 0;
  background: black;
  z-index: 1000;
}

.camera-stage {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.video-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hud-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.mobile-hud {
  position: absolute;
  top: env(safe-area-inset-top);
  left: 0;
  width: 100%;
  padding: 16px;
  pointer-events: none;
}

.hud-info {
  display: flex;
  gap: 8px;
}

.mode-tag, .status-tag {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
  background: rgba(0,0,0,0.5);
  color: #00ff41;
  border: 1px solid #00ff41;
}

.status-tag.offline { border-color: #ff4d4f; color: #ff4d4f; }

.mobile-controls {
  position: absolute;
  bottom: calc(20px + env(safe-area-inset-bottom));
  left: 0;
  width: 100%;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.control-row {
  display: flex;
  gap: 20px;
  background: rgba(0,0,0,0.5);
  padding: 8px 20px;
  border-radius: 24px;
  backdrop-filter: blur(8px);
}

.m-tool-btn {
  background: none;
  border: none;
  color: white;
  padding: 8px;
}

.main-actions {
  display: flex;
  align-items: center;
  gap: 32px;
}

.m-capture-btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.m-capture-btn.start { background: var(--accent-color); }
.m-capture-btn.stop { background: #ff4d4f; }
.m-capture-btn.capture { background: #52c41a; }

.bottom-sheet {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
}

.sheet-content {
  width: 100%;
  background: var(--card-bg);
  border-radius: 20px 20px 0 0;
  padding: 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.sheet-content h3 {
  margin-bottom: 20px;
  text-align: center;
}

.sheet-content button {
  width: 100%;
  height: 52px;
  margin-bottom: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-color);
  font-weight: bold;
}

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>
