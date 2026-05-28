<template>
  <div class="cyber-camera-page">
    <!-- HTTPS Warning -->
    <div v-if="!isSecure" class="cyber-camera-warning">
      <p>检测到非安全环境。请使用 HTTPS 或 localhost 访问以获取摄像头权限。</p>
    </div>

    <div :class="['cyber-camera-stage', { 'cyberpunk-vision': visionStyle === 'cyberpunk' }]" ref="containerRef">
      <!-- Video Element -->
      <video 
        ref="videoRef" 
        autoplay 
        playsinline 
        :class="['cyber-camera-video', visionStyle === 'cyberpunk' ? 'contain' : 'cover']"
      ></video>

      <!-- Grid & Scanline Overlay for Cyberpunk -->
      <div v-if="visionStyle === 'cyberpunk'" class="cyberpunk-grid"></div>
      <div v-if="visionStyle === 'cyberpunk'" class="cyberpunk-overlay"></div>

      <!-- Canvas Overlay for HUD -->
      <canvas ref="canvasRef" class="cyber-camera-hud"></canvas>

      <!-- Controls UI (Floating inside stage) -->
      <div class="cyber-camera-controls">
        <button v-if="!isStreaming" @click="startCamera" class="cyber-btn primary glow-btn">
          <CameraIcon /> 开启视觉系统
        </button>
        <div v-else class="cyber-btn-group">
          <button @click="stopCamera" class="cyber-btn danger">
            <XIcon /> 关闭
          </button>
          
          <!-- Style Switcher -->
          <div class="dropdown-container">
            <button @click="toggleMenu('style')" class="cyber-btn info">
              <LayersIcon /> 风格: {{ visionStyle === 'default' ? '默认' : '赛博' }}
            </button>
            <div v-if="showStyleMenu" class="dropdown-menu">
              <button @click="setStyle('default')" :class="{ active: visionStyle === 'default' }">默认风格</button>
              <button @click="setStyle('cyberpunk')" :class="{ active: visionStyle === 'cyberpunk' }">赛博朋克</button>
            </div>
          </div>

          <!-- Detection Mode Switcher -->
          <div class="dropdown-container">
            <button @click="toggleMenu('detect')" class="cyber-btn info">
              <TargetIcon /> 识别: {{ detectMode === 'none' ? '无' : 'YOLO' }}
            </button>
            <div v-if="showDetectMenu" class="dropdown-menu">
              <button @click="setDetectMode('none')" :class="{ active: detectMode === 'none' }">无识别模式</button>
              <button @click="setDetectMode('yolo')" :class="{ active: detectMode === 'yolo' }">YOLO识别</button>
            </div>
          </div>

          <!-- Options Menu -->
          <div class="dropdown-container">
            <button @click="toggleMenu('option')" class="cyber-btn info">
              <SettingsIcon /> 选项
            </button>
            <div v-if="showOptionMenu" class="dropdown-menu option-panel">
              <div class="option-section">
                <span class="option-title">识别类别</span>
                <div class="class-grid">
                  <label v-for="cls in yoloClasses" :key="cls.id" class="class-item">
                    <input type="checkbox" :checked="cls.enabled" @change="toggleYoloClass(cls.id)">
                    <span>{{ cls.label }}</span>
                  </label>
                </div>
              </div>
              <div class="option-section divider">
                <span class="option-title">HUD 选项</span>
                <label class="class-item">
                  <input type="checkbox" :checked="showReticle" @change="showReticle = !showReticle">
                  <span>显示中心准星</span>
                </label>
              </div>
            </div>
          </div>

          <button @click="switchCamera" class="cyber-btn info mobile-hide">
            <RefreshCwIcon /> 切换镜头
          </button>
          <button @click="captureFrame" class="cyber-btn success">
            <DownloadIcon /> 截图
          </button>
          <button @click="toggleFullscreen" class="cyber-btn warning mobile-hide">
            <MaximizeIcon /> 全屏
          </button>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMsg" class="cyber-camera-error">
        {{ errorMsg }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { 
  Camera as CameraIcon, 
  X as XIcon, 
  RefreshCw as RefreshCwIcon, 
  Download as DownloadIcon,
  Maximize as MaximizeIcon,
  Layers as LayersIcon,
  Target as TargetIcon,
  Settings as SettingsIcon
} from '@lucide/vue';
import api from '../api';

const containerRef = ref(null);
const videoRef = ref(null);
const canvasRef = ref(null);
const isStreaming = ref(false);
const errorMsg = ref('');
const isSecure = ref(window.isSecureContext || window.location.hostname === 'localhost');
const currentFacingMode = ref('environment');
const visionStyle = ref('default');
const showStyleMenu = ref(false);

// Detection State
const detectMode = ref('none');
const showDetectMenu = ref(false);
const showOptionMenu = ref(false);
const detections = ref([]);
const targetCount = computed(() => detections.value.length);
const yoloSourceSize = ref({ width: 0, height: 0 });

const showReticle = ref(true);
const yoloClasses = ref([
  { id: 0, name: 'person', label: '人', enabled: true },
  { id: 2, name: 'car', label: '车', enabled: false },
  { id: 1, name: 'bicycle', label: '自行车', enabled: false },
  { id: 3, name: 'motorcycle', label: '摩托', enabled: false },
  { id: 5, name: 'bus', label: '公交', enabled: false },
  { id: 7, name: 'truck', label: '卡车', enabled: false },
  { id: 15, name: 'cat', label: '猫', enabled: false },
  { id: 16, name: 'dog', label: '狗', enabled: false },
  { id: 56, name: 'chair', label: '椅子', enabled: false },
  { id: 63, name: 'laptop', label: '笔记本', enabled: false },
  { id: 67, name: 'cell phone', label: '手机', enabled: false }
]);

const enabledClassIds = computed(() => {
  return yoloClasses.value.filter(c => c.enabled).map(c => c.id);
});

const toggleYoloClass = (id) => {
  const item = yoloClasses.value.find(c => c.id === id);
  if (item) item.enabled = !item.enabled;
};

const cameraInfo = ref({
  width: 0,
  height: 0,
  frameRate: 0
});

let stream = null;
let animationId = null;
let lastTime = 0;
let fps = 0;
let lastFrameCount = 0;

// YOLO Loop Control
let detectTimer = null;
let isDetecting = false;

const toggleMenu = (menu) => {
  if (menu === 'style') {
    showStyleMenu.value = !showStyleMenu.value;
    showDetectMenu.value = false;
    showOptionMenu.value = false;
  } else if (menu === 'detect') {
    showDetectMenu.value = !showDetectMenu.value;
    showStyleMenu.value = false;
    showOptionMenu.value = false;
  } else {
    showOptionMenu.value = !showOptionMenu.value;
    showStyleMenu.value = false;
    showDetectMenu.value = false;
  }
};

const setStyle = (style) => {
  visionStyle.value = style;
  showStyleMenu.value = false;
};

const setDetectMode = (mode) => {
  detectMode.value = mode;
  showDetectMenu.value = false;
  if (mode === 'yolo') {
    startYoloDetectionLoop();
  } else {
    stopYoloDetectionLoop();
    detections.value = [];
  }
};

const sendFrameToYolo = async () => {
  const video = videoRef.value;
  if (!video || !cameraInfo.value.width || !cameraInfo.value.height) return;

  if (enabledClassIds.value.length === 0) {
    detections.value = [];
    return;
  }

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = cameraInfo.value.width;
  frameCanvas.height = cameraInfo.value.height;

  const frameCtx = frameCanvas.getContext('2d');
  frameCtx.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);

  const blob = await new Promise(resolve => {
    frameCanvas.toBlob(resolve, 'image/jpeg', 0.75);
  });

  const formData = new FormData();
  formData.append('image', blob, 'frame.jpg');
  formData.append('classes', JSON.stringify(enabledClassIds.value));

  try {
    const response = await api.post('/yolo-detect/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    detections.value = response.data.detections || [];
    yoloSourceSize.value = {
      width: response.data.width || cameraInfo.value.width,
      height: response.data.height || cameraInfo.value.height
    };
  } catch (err) {
    console.error('YOLO detection failed:', err);
  }
};

const startYoloDetectionLoop = () => {
  stopYoloDetectionLoop();
  detectTimer = setInterval(async () => {
    if (detectMode.value !== 'yolo' || !isStreaming.value || isDetecting) return;
    isDetecting = true;
    try {
      await sendFrameToYolo();
    } finally {
      isDetecting = false;
    }
  }, 200);
};

const stopYoloDetectionLoop = () => {
  if (detectTimer) {
    clearInterval(detectTimer);
    detectTimer = null;
  }
};

const COLORS = {
  CYAN: '#00ffff',
  MAGENTA: '#ff00ff',
  GREEN: '#39ff14',
  DARK_PURPLE: 'rgba(20, 10, 30, 0.82)'
};

function getVideoRenderRect(videoWidth, videoHeight, containerWidth, containerHeight) {
  const videoRatio = videoWidth / videoHeight;
  const containerRatio = containerWidth / containerHeight;
  let renderWidth, renderHeight, offsetX, offsetY;

  if (containerRatio > videoRatio) {
    renderHeight = containerHeight;
    renderWidth = renderHeight * videoRatio;
    offsetX = (containerWidth - renderWidth) / 2;
    offsetY = 0;
  } else {
    renderWidth = containerWidth;
    renderHeight = renderWidth / videoRatio;
    offsetX = 0;
    offsetY = (containerHeight - renderHeight) / 2;
  }
  return { renderWidth, renderHeight, offsetX, offsetY };
}

const drawCenterReticle = (ctx, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  ctx.strokeStyle = COLORS.MAGENTA;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = COLORS.CYAN;
  ctx.beginPath();
  ctx.moveTo(cx - 40, cy); ctx.lineTo(cx - 10, cy);
  ctx.moveTo(cx + 10, cy); ctx.lineTo(cx + 40, cy);
  ctx.moveTo(cx, cy - 40); ctx.lineTo(cx, cy - 10);
  ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy + 40);
  ctx.stroke();
  ctx.fillStyle = COLORS.CYAN;
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
};

const drawDetections = (ctx, w, h, style = 'default') => {
  if (detectMode.value !== 'yolo' || !detections.value.length || !yoloSourceSize.value.width) return;

  const rect = getVideoRenderRect(yoloSourceSize.value.width, yoloSourceSize.value.height, w, h);
  const scaleX = rect.renderWidth / yoloSourceSize.value.width;
  const scaleY = rect.renderHeight / yoloSourceSize.value.height;
  const cx = w / 2;
  const cy = h / 2;

  detections.value.forEach(det => {
    const bx = rect.offsetX + det.x1 * scaleX;
    const by = rect.offsetY + det.y1 * scaleY;
    const bw = (det.x2 - det.x1) * scaleX;
    const bh = (det.y2 - det.y1) * scaleY;

    if (style === 'cyberpunk') {
      // Cyberpunk Style
      ctx.strokeStyle = COLORS.CYAN;
      ctx.lineWidth = 2;
      const s = 20;
      ctx.beginPath(); ctx.moveTo(bx, by + s); ctx.lineTo(bx, by); ctx.lineTo(bx + s, by); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + bw - s, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by + bh - s); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + s, by + bh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + bw - s, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - s); ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 0, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 3, by - 3, bw + 6, bh + 6);
      ctx.fillStyle = COLORS.DARK_PURPLE;
      ctx.fillRect(bx, by - 25, 120, 25);
      ctx.fillStyle = COLORS.CYAN;
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${det.label} ${det.score.toFixed(2)}`, bx + 5, by - 7);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx + bw / 2, by + bh / 2); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Default Style
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.fillRect(bx, by - 20, 100, 20);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${det.label} ${det.score.toFixed(2)}`, bx + 5, by - 5);
    }
  });
};

const drawCyberpunkHUD = (ctx, w, h, time) => {
  // 1. Header Panel
  ctx.fillStyle = COLORS.DARK_PURPLE;
  ctx.strokeStyle = COLORS.CYAN;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.rect(20, 20, w - 40, 60); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 10; ctx.shadowColor = COLORS.CYAN; ctx.fillStyle = COLORS.CYAN;
  ctx.font = 'bold 18px "Courier New", monospace'; ctx.textAlign = 'left';
  const title = detectMode.value === 'yolo' ? 'NEURAL VISION / PERSON TRACKING' : 'NEURAL VISION / CAMERA HUD';
  ctx.fillText(title, 40, 55);
  ctx.shadowColor = COLORS.MAGENTA; ctx.fillStyle = COLORS.MAGENTA; ctx.textAlign = 'right';
  const timeStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  ctx.fillText(`FPS ${fps.toFixed(1)}   TARGETS ${targetCount.value}   ${timeStr}`, w - 40, 55);
  ctx.shadowBlur = 0;

  // 2. Footer Panel
  ctx.fillStyle = COLORS.DARK_PURPLE; ctx.strokeStyle = COLORS.MAGENTA;
  ctx.beginPath(); ctx.rect(20, h - 65, w - 40, 45); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 8; ctx.shadowColor = COLORS.GREEN; ctx.fillStyle = COLORS.GREEN;
  ctx.font = 'bold 14px "Courier New", monospace'; ctx.textAlign = 'center';
  
  let filterText = 'FILTER: OFF';
  if (detectMode.value === 'yolo') {
    filterText = enabledClassIds.value.length === 1 && enabledClassIds.value[0] === 0 ? 'FILTER: PERSON_ONLY' : 'FILTER: MULTI_CLASS';
  }
  const footerText = `MODE: ${detectMode.value === 'yolo' ? 'SURVEILLANCE' : 'CAMERA HUD'}   STATUS: ONLINE   ${filterText}   CORE: ${detectMode.value === 'yolo' ? 'YOLO11N' : 'NONE'}`;
  ctx.fillText(footerText, w / 2, h - 38);
  ctx.shadowBlur = 0;

  if (showReticle.value) drawCenterReticle(ctx, w, h);
  drawDetections(ctx, w, h, 'cyberpunk');

  // Bottom Left Info
  ctx.fillStyle = COLORS.CYAN; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
  ctx.fillText(`RES ${cameraInfo.value.width}x${cameraInfo.value.height}  HUD ACTIVE`, 40, h - 80);
};

const drawDefaultHUD = (ctx, w, h) => {
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < w; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  const scanY = (Date.now() / 10) % h;
  ctx.fillStyle = 'rgba(0, 255, 255, 0.1)'; ctx.fillRect(0, scanY, w, 2);

  ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; const cs = 30;
  ctx.beginPath(); ctx.moveTo(20, 20 + cs); ctx.lineTo(20, 20); ctx.lineTo(20 + cs, 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - 20 - cs, 20); ctx.lineTo(w - 20, 20); ctx.lineTo(w - 20, 20 + cs); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, h - 20 - cs); ctx.lineTo(20, h - 20); ctx.lineTo(20 + cs, h - 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w - 20 - cs, h - 20); ctx.lineTo(w - 20, h - 20); ctx.lineTo(w - 20, h - 20 - cs); ctx.stroke();

  ctx.fillStyle = '#00ffff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
  ctx.fillText('NEURAL VISION // CYBER CAMERA v1.0', 40, 40);
  ctx.textAlign = 'right';
  ctx.fillText(`RENDER FPS: ${fps.toFixed(1)}`, w - 40, 40);
  if (isStreaming.value) {
    ctx.fillText(`CAMERA FPS: ${cameraInfo.value.frameRate}`, w - 40, 60);
    ctx.fillText(`RES: ${cameraInfo.value.width}x${cameraInfo.value.height}`, w - 40, 80);
    ctx.fillText(`TARGETS: ${targetCount.value}`, w - 40, 100);
  }
  ctx.fillText(`STATUS: ${isStreaming.value ? 'ONLINE' : 'OFFLINE'}`, w - 40, 120);
  ctx.fillText(new Date().toLocaleTimeString(), w - 40, 140);

  if (showReticle.value) drawCenterReticle(ctx, w, h);
  drawDetections(ctx, w, h, 'default');

  ctx.textAlign = 'left'; ctx.fillText(`MODE: LOCAL CAMERA`, 40, h - 40);
  ctx.textAlign = 'right'; ctx.fillText('HUD ACTIVE // SIGNAL SECURE', w - 40, h - 40);
};

const initHud = () => {
  const canvas = canvasRef.value; if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const draw = (time) => {
    const deltaTime = time - lastTime;
    if (deltaTime >= 1000) { fps = lastFrameCount; lastFrameCount = 0; lastTime = time; }
    lastFrameCount++;
    const w = canvas.width; const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (visionStyle.value === 'cyberpunk') drawCyberpunkHUD(ctx, w, h, time);
    else drawDefaultHUD(ctx, w, h);
    animationId = requestAnimationFrame(draw);
  };
  animationId = requestAnimationFrame(draw);
};

const startCamera = async () => {
  errorMsg.value = '';
  try {
    const constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: currentFacingMode.value }, audio: false };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    cameraInfo.value = {
      width: settings.width || videoRef.value?.videoWidth || 1280,
      height: settings.height || videoRef.value?.videoHeight || 720,
      frameRate: settings.frameRate || 30
    };
    videoRef.value.srcObject = stream;
    isStreaming.value = true;
    handleResize();
    if (detectMode.value === 'yolo') startYoloDetectionLoop();
  } catch (err) { errorMsg.value = `初始化失败: ${err.message}`; }
};

const stopCamera = () => {
  stopYoloDetectionLoop();
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  isStreaming.value = false;
  detections.value = [];
};

const switchCamera = () => { currentFacingMode.value = currentFacingMode.value === 'user' ? 'environment' : 'user'; stopCamera(); startCamera(); };

const captureFrame = () => {
  const canvas = canvasRef.value; const video = videoRef.value;
  const tempCanvas = document.createElement('canvas'); tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height); tempCtx.drawImage(canvas, 0, 0);
  const link = document.createElement('a'); link.download = `cyber-capture-${Date.now()}.png`; link.href = tempCanvas.toDataURL('image/png'); link.click();
};

const toggleFullscreen = () => { if (!document.fullscreenElement) containerRef.value.requestFullscreen(); else document.exitFullscreen(); };

const handleResize = () => {
  if (canvasRef.value && containerRef.value) { canvasRef.value.width = containerRef.value.clientWidth; canvasRef.value.height = containerRef.value.clientHeight; }
};

onMounted(() => { document.body.classList.add('camera-page-active'); handleResize(); window.addEventListener('resize', handleResize); initHud(); });

onBeforeUnmount(() => { document.body.classList.remove('camera-page-active'); stopCamera(); window.removeEventListener('resize', handleResize); if (animationId) cancelAnimationFrame(animationId); });
</script>

<style scoped>
.cyber-camera-page {
  width: 100%;
  margin-top: var(--navbar-height);
  height: calc(100dvh - var(--navbar-height));
  background: #000;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cyber-camera-warning { background: #ff0055; color: #fff; padding: 8px; text-align: center; font-weight: bold; z-index: 2000; font-size: 13px; }

.cyber-camera-stage { flex: 1; position: relative; background: #050505; width: 100%; height: 100%; overflow: hidden; display: flex; justify-content: center; align-items: center; }

.cyber-camera-video { width: 100%; height: 100%; transition: all 0.3s; }
.cyber-camera-video.cover { object-fit: cover; }
.cyber-camera-video.contain { object-fit: contain; background: #000; }

.cyber-camera-hud { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }

.cyberpunk-grid { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(rgba(0, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 0, 255, 0.05) 1px, transparent 1px); background-size: 80px 80px; z-index: 5; }

.cyberpunk-overlay::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(to bottom, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 2px, transparent 4px); mix-blend-mode: multiply; z-index: 8; }

.cyber-camera-controls { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); z-index: 40; width: auto; padding: 0 20px; }

.cyber-btn-group { display: flex; gap: 12px; flex-wrap: nowrap; justify-content: center; background: rgba(0, 0, 0, 0.6); padding: 8px 16px; border-radius: 99px; backdrop-filter: blur(10px); border: 1px solid rgba(0, 255, 255, 0.2); }

.cyber-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid #00ffff; background: rgba(0, 255, 255, 0.05); color: #00ffff; border-radius: 4px; cursor: pointer; font-weight: bold; text-transform: uppercase; font-size: 13px; transition: all 0.2s; white-space: nowrap; }
.cyber-btn:hover { background: rgba(0, 255, 255, 0.2); box-shadow: 0 0 10px rgba(0, 255, 255, 0.5); }
.cyber-btn.danger { border-color: #ff0055; color: #ff0055; }
.cyber-btn.success { border-color: #00ff66; color: #00ff66; }
.cyber-btn.warning { border-color: #ffcc00; color: #ffcc00; }

.dropdown-container { position: relative; }

.dropdown-menu { position: absolute; bottom: calc(100% + 15px); left: 50%; transform: translateX(-50%); background: rgba(20, 10, 30, 0.95); border: 1px solid #00ffff; border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 4px; min-width: 140px; box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }

.dropdown-menu button { padding: 8px 12px; background: transparent; border: none; color: #fff; cursor: pointer; text-align: left; border-radius: 4px; font-size: 13px; }
.dropdown-menu button:hover, .dropdown-menu button.active { background: rgba(0, 255, 255, 0.2); color: #00ffff; }

/* Option Panel Specifics */
.option-panel { min-width: 240px; padding: 15px; }
.option-section { display: flex; flex-direction: column; gap: 10px; }
.option-title { font-size: 12px; color: var(--accent-color); font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
.class-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.class-item { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ccc; font-size: 13px; }
.class-item input { accent-color: var(--accent-color); }
.divider { margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.1); }

.cyber-camera-error { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255, 0, 85, 0.9); color: #fff; padding: 16px 24px; border-radius: 8px; text-align: center; z-index: 100; }

@media (max-width: 768px) { .mobile-hide { display: none; } .cyber-btn { padding: 8px 12px; font-size: 12px; } .cyber-btn-group { padding: 6px 10px; gap: 8px; } .class-grid { grid-template-columns: 1fr; } }
</style>
