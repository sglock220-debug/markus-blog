<template>
  <div class="cyber-camera-page" :class="{ 'mobile-camera-page': mobile }">
    <!-- HTTPS Warning -->
    <div v-if="!isSecure" class="cyber-camera-warning">
      <p>检测到非安全环境。请使用 HTTPS 或 localhost 访问以获取摄像头权限。</p>
    </div>

    <div :class="['cyber-camera-stage', { 'cyberpunk-vision': visionStyle === 'cyberpunk' }]" ref="containerRef">
      <!-- Video Element -->
      <video 
        ref="videoRef" 
        autoplay
        muted
        playsinline 
        class="cyber-camera-video"
        :class="{ mirrored: qr.settings.mirrored }"
      ></video>

      <!-- Grid & Scanline Overlay for Cyberpunk -->
      <div v-if="visionStyle === 'cyberpunk'" class="cyberpunk-grid"></div>
      <div v-if="visionStyle === 'cyberpunk'" class="cyberpunk-overlay"></div>

      <!-- Canvas Overlay for HUD -->
      <canvas ref="canvasRef" class="cyber-camera-hud"></canvas>

      <CodeFocusOverlay v-if="showCodeScanner && qr.settings.focusEnabled && qr.focusRect" :rect="qr.focusRect" />

      <!-- Top Left HUD Group -->
      <div class="hud-top-left">
        <div class="hud-title">
          NEURAL VISION // CYBER CAMERA v1.0
        </div>

        <div class="hud-subtitle"> 
          <span>STYLE: {{ visionStyle === 'cyberpunk' ? 'CYBERPUNK' : 'DEFAULT' }}</span> 
          <span>DETECT: {{ detectHudLabel }}</span>
        </div>
        
        <div v-if="showYoloDetection" class="yolo-worker-badge" :class="workerStatus">
          <span class="status-dot"></span>
          {{ workerStatus === 'online' ? 'YOLO WORKER 在线' : (workerStatus === 'offline' ? 'YOLO WORKER 离线' : 'YOLO 通信错误') }}
        </div>
      </div>

      <!-- Controls UI (Floating inside stage) -->
      <div class="cyber-camera-controls" ref="controlsRef">
        <QrResultsPanel v-show="showCodeScanner" :qr="qr" />
        <button v-if="!isStreaming" :disabled="isStarting" @click="startCamera" class="cyber-btn primary glow-btn">
          <CameraIcon /> {{ isStarting ? '正在连接摄像头…' : '开启视觉系统' }}
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
              <TargetIcon /> 识别: {{ detectLabel }}
            </button>
            <div v-if="showDetectMenu" class="dropdown-menu">
              <button @click="setDetectMode('none')" :class="{ active: detectMode === 'none' }">无识别模式</button>
              <button @click="setDetectMode('yolo')" :class="{ active: detectMode === 'yolo' }">YOLO识别</button>
              <button @click="setDetectMode('qrcode')" :class="{ active: detectMode === 'qrcode' }">Code识别</button>
            </div>
          </div>

          <!-- Options Menu -->
          <div class="dropdown-container">
            <button @click="toggleMenu('options')" class="cyber-btn info">
              <SettingsIcon /> 选项
            </button>
          </div>

          <button @click="switchCamera" class="cyber-btn info">
            <RefreshCwIcon /> 切换镜头
          </button>
          <button @click="captureFrame" class="cyber-btn success">
            <DownloadIcon /> 截图
          </button>
          <button @click="toggleFullscreen" class="cyber-btn warning">
            <MaximizeIcon /> 全屏
          </button>
        </div>
      </div>

      <div v-if="showOptionMenu" class="options-menu" ref="optionsMenuRef">
        <CameraSettings :qr="qr" v-model:show-reticle="showReticle">
          <template #classes>
              <div class="class-header">
                <h4>识别类别</h4>

                <input 
                  v-model="classSearchQuery" 
                  class="class-search-input" 
                  placeholder="搜索类别，例如 person / 手机 / 67" 
                />
              </div>

              <div class="class-list">
                <label 
                  v-for="item in pagedYoloClasses" 
                  :key="item.id" 
                  class="class-item"
                >
                  <input 
                    type="checkbox" 
                    :checked="item.enabled" 
                    @change="toggleYoloClass(item.id)" 
                  />
                  <span class="class-name">{{ item.label }}</span>
                  <span class="class-id">#{{ item.id }} {{ item.name }}</span>
                </label>
              </div>

              <div class="class-pagination">
                <button @click="prevClassPage">上一页</button>
                <span>第 {{ classPage }} / {{ totalClassPages }} 页</span>
                <button @click="nextClassPage">下一页</button>
              </div>

            <p class="settings-hint">已选择 {{ enabledClassIds.length }} / 80 类。勾选类别越多，服务器压力越大。</p>
          </template>
        </CameraSettings>
      </div>

      <!-- Error Message -->
      <div v-if="errorMsg" class="cyber-camera-error">
        {{ errorMsg }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch } from 'vue';
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
import CodeFocusOverlay from '../../components/camera/CodeFocusOverlay.vue';
import CameraSettings from '../../components/camera/CameraSettings.vue';
import QrResultsPanel from '../../components/camera/QrResultsPanel.vue';
import { useQrScanner } from '../../composables/useQrScanner';
import { coverPoint } from '../../services/qrScanner';

defineProps({ mobile: Boolean });

const containerRef = ref(null);
const videoRef = ref(null);
const canvasRef = ref(null);
const controlsRef = ref(null)
const optionsMenuRef = ref(null)

const isStreaming = ref(false);
const isStarting = ref(false);
const cameraActive = computed(() => isStreaming.value && !isStarting.value);
let cameraGeneration = 0;
let detachStreamEvents = null;
const errorMsg = ref('');
const isSecure = ref(window.isSecureContext || window.location.hostname === 'localhost');
const currentFacingMode = ref('environment');
const visionStyle = ref('default');
const showStyleMenu = ref(false)
const showDetectMenu = ref(false)
const showOptionMenu = ref(false)

// Detection State
const detectMode = ref('none');
const showCodeScanner = computed(() => cameraActive.value && detectMode.value === 'qrcode');
const showYoloDetection = computed(() => cameraActive.value && detectMode.value === 'yolo');
const hasActiveDetection = computed(() => showCodeScanner.value || showYoloDetection.value);
const detections = ref([]);
const targetCount = computed(() => detectMode.value === 'qrcode' ? qr.current.length : detections.value.length);
const detectLabel = computed(() => ({ none: '无', yolo: 'YOLO', qrcode: 'Code' })[detectMode.value]);
const detectHudLabel = computed(() => ({ none: 'OFF', yolo: 'YOLO', qrcode: 'CODE' })[detectMode.value]);
const yoloSourceSize = ref({ width: 0, height: 0 });
const showReticle = ref(readCameraPreference('reticle', true));
const qr = reactive(useQrScanner(videoRef, cameraActive, detectMode, containerRef, controlsRef));
function readCameraPreference(key, fallback) {
  try { return JSON.parse(localStorage.getItem(`cyber-camera.${key}.v1`)) ?? fallback; }
  catch { return fallback; }
}
watch(showReticle, value => {
  try { localStorage.setItem('cyber-camera.reticle.v1', JSON.stringify(value)); } catch { /* QR panel reports storage failures */ }
});
const workerStatus = ref('offline'); // Default to offline until connected
let yoloSocket = null;
let yoloReconnectTimer = null;

// YOLO COCO 80 Classes
const allYoloClasses = ref([ 
  { id: 0, name: "person", label: "人", enabled: true }, 
  { id: 1, name: "bicycle", label: "自行车", enabled: false }, 
  { id: 2, name: "car", label: "汽车", enabled: false }, 
  { id: 3, name: "motorcycle", label: "摩托车", enabled: false }, 
  { id: 4, name: "airplane", label: "飞机", enabled: false }, 
  { id: 5, name: "bus", label: "公交车", enabled: false }, 
  { id: 6, name: "train", label: "火车", enabled: false }, 
  { id: 7, name: "truck", label: "卡车", enabled: false }, 
  { id: 8, name: "boat", label: "船", enabled: false }, 
  { id: 9, name: "traffic light", label: "交通灯", enabled: false }, 
  { id: 10, name: "fire hydrant", label: "消防栓", enabled: false }, 
  { id: 11, name: "stop sign", label: "停止标志", enabled: false }, 
  { id: 12, name: "parking meter", label: "停车计时器", enabled: false }, 
  { id: 13, name: "bench", label: "长椅", enabled: false }, 
  { id: 14, name: "bird", label: "鸟", enabled: false }, 
  { id: 15, name: "cat", label: "猫", enabled: false }, 
  { id: 16, name: "dog", label: "狗", enabled: false }, 
  { id: 17, name: "horse", label: "马", enabled: false }, 
  { id: 18, name: "sheep", label: "羊", enabled: false }, 
  { id: 19, name: "cow", label: "牛", enabled: false }, 
  { id: 20, name: "elephant", label: "大象", enabled: false }, 
  { id: 21, name: "bear", label: "熊", enabled: false }, 
  { id: 22, name: "zebra", label: "斑马", enabled: false }, 
  { id: 23, name: "giraffe", label: "长颈鹿", enabled: false }, 
  { id: 24, name: "backpack", label: "背包", enabled: false }, 
  { id: 25, name: "umbrella", label: "雨伞", enabled: false }, 
  { id: 26, name: "handbag", label: "手提包", enabled: false }, 
  { id: 27, name: "tie", label: "领带", enabled: false }, 
  { id: 28, name: "suitcase", label: "行李箱", enabled: false }, 
  { id: 29, name: "frisbee", label: "飞盘", enabled: false }, 
  { id: 30, name: "skis", label: "滑雪板", enabled: false }, 
  { id: 31, name: "snowboard", label: "单板滑雪板", enabled: false }, 
  { id: 32, name: "sports ball", label: "球", enabled: false }, 
  { id: 33, name: "kite", label: "风筝", enabled: false }, 
  { id: 34, name: "baseball bat", label: "棒球棒", enabled: false }, 
  { id: 35, name: "baseball glove", label: "棒球手套", enabled: false }, 
  { id: 36, name: "skateboard", label: "滑板", enabled: false }, 
  { id: 37, name: "surfboard", label: "冲浪板", enabled: false }, 
  { id: 38, name: "tennis racket", label: "网球拍", enabled: false }, 
  { id: 39, name: "bottle", label: "瓶子", enabled: false }, 
  { id: 40, name: "wine glass", label: "酒杯", enabled: false }, 
  { id: 41, name: "cup", label: "杯子", enabled: false }, 
  { id: 42, name: "fork", label: "叉子", enabled: false }, 
  { id: 43, name: "knife", label: "刀", enabled: false }, 
  { id: 44, name: "spoon", label: "勺子", enabled: false }, 
  { id: 45, name: "bowl", label: "碗", enabled: false }, 
  { id: 46, name: "banana", label: "香蕉", enabled: false }, 
  { id: 47, name: "apple", label: "苹果", enabled: false }, 
  { id: 48, name: "sandwich", label: "三明治", enabled: false }, 
  { id: 49, name: "orange", label: "橙子", enabled: false }, 
  { id: 50, name: "broccoli", label: "西兰花", enabled: false }, 
  { id: 51, name: "carrot", label: "胡萝卜", enabled: false }, 
  { id: 52, name: "hot dog", label: "热狗", enabled: false }, 
  { id: 53, name: "pizza", label: "披萨", enabled: false }, 
  { id: 54, name: "donut", label: "甜甜圈", enabled: false }, 
  { id: 55, name: "cake", label: "蛋糕", enabled: false }, 
  { id: 56, name: "chair", label: "椅子", enabled: false }, 
  { id: 57, name: "couch", label: "沙发", enabled: false }, 
  { id: 58, name: "potted plant", label: "盆栽", enabled: false }, 
  { id: 59, name: "bed", label: "床", enabled: false }, 
  { id: 60, name: "dining table", label: "餐桌", enabled: false }, 
  { id: 61, name: "toilet", label: "马桶", enabled: false }, 
  { id: 62, name: "tv", label: "电视", enabled: false }, 
  { id: 63, name: "laptop", label: "笔记本电脑", enabled: false }, 
  { id: 64, name: "mouse", label: "鼠标", enabled: false }, 
  { id: 65, name: "remote", label: "遥控器", enabled: false }, 
  { id: 66, name: "keyboard", label: "键盘", enabled: false }, 
  { id: 67, name: "cell phone", label: "手机", enabled: false }, 
  { id: 68, name: "microwave", label: "微波炉", enabled: false }, 
  { id: 69, name: "oven", label: "烤箱", enabled: false }, 
  { id: 70, name: "toaster", label: "烤面包机", enabled: false }, 
  { id: 71, name: "sink", label: "水槽", enabled: false }, 
  { id: 72, name: "refrigerator", label: "冰箱", enabled: false }, 
  { id: 73, name: "book", label: "书", enabled: false }, 
  { id: 74, name: "clock", label: "钟", enabled: false }, 
  { id: 75, name: "vase", label: "花瓶", enabled: false }, 
  { id: 76, name: "scissors", label: "剪刀", enabled: false }, 
  { id: 77, name: "teddy bear", label: "泰迪熊", enabled: false }, 
  { id: 78, name: "hair drier", label: "吹风机", enabled: false }, 
  { id: 79, name: "toothbrush", label: "牙刷", enabled: false } 
 ]) 

const savedClassIds = readCameraPreference('classes', null);
if (Array.isArray(savedClassIds)) allYoloClasses.value.forEach(c => { c.enabled = savedClassIds.includes(c.id); });
watch(allYoloClasses, classes => {
  try { localStorage.setItem('cyber-camera.classes.v1', JSON.stringify(classes.filter(c => c.enabled).map(c => c.id))); } catch { /* storage may be unavailable */ }
}, { deep: true });

// Search & Pagination Logic
const classSearchQuery = ref('')
const classPage = ref(1)
const classPageSize = 10

const filteredYoloClasses = computed(() => {
  const q = classSearchQuery.value.trim().toLowerCase()
  if (!q) return allYoloClasses.value

  return allYoloClasses.value.filter(item => {
    return (
      item.name.toLowerCase().includes(q) ||
      item.label.includes(q) ||
      String(item.id).includes(q)
    )
  })
})

const totalClassPages = computed(() => {
  return Math.max(1, Math.ceil(filteredYoloClasses.value.length / classPageSize))
})

const pagedYoloClasses = computed(() => {
  const start = (classPage.value - 1) * classPageSize
  return filteredYoloClasses.value.slice(start, start + classPageSize)
})

const prevClassPage = () => { 
  if (classPage.value <= 1) { 
    classPage.value = totalClassPages.value 
  } else { 
    classPage.value-- 
  } 
} 

const nextClassPage = () => { 
  if (classPage.value >= totalClassPages.value) { 
    classPage.value = 1 
  } else { 
    classPage.value++ 
  } 
} 

watch(classSearchQuery, () => {
  classPage.value = 1
})

watch(totalClassPages, () => {
  if (classPage.value > totalClassPages.value) {
    classPage.value = totalClassPages.value
  }
})

const enabledClassIds = computed(() => {
  return allYoloClasses.value
    .filter(item => item.enabled)
    .map(item => item.id)
})

const toggleYoloClass = (id) => {
  const item = allYoloClasses.value.find(c => c.id === id)
  if (item) item.enabled = !item.enabled
}

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

const closeAllMenus = () => {
  showStyleMenu.value = false
  showDetectMenu.value = false
  showOptionMenu.value = false
}

const toggleMenu = (menu) => {
  const nextStyle = menu === 'style' ? !showStyleMenu.value : false
  const nextDetect = menu === 'detect' ? !showDetectMenu.value : false
  const nextOptions = menu === 'options' ? !showOptionMenu.value : false

  showStyleMenu.value = nextStyle
  showDetectMenu.value = nextDetect
  showOptionMenu.value = nextOptions
}

const handleClickOutside = (event) => {
  const controls = controlsRef.value
  if (!controls) return

  // 如果点击发生在按钮组或菜单内部，不关闭
  if (controls.contains(event.target) || optionsMenuRef.value?.contains(event.target)) return

  closeAllMenus()
}

const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    closeAllMenus()
  }
}

const setStyle = (style) => {
  visionStyle.value = style
  showStyleMenu.value = false
}

const setDetectMode = (mode) => {
  if (!['none', 'yolo', 'qrcode'].includes(mode)) return;
  if (mode !== 'none' && !cameraActive.value) return;
  showDetectMenu.value = false;
  if (mode === detectMode.value) return;
  stopYoloDetectionLoop();
  closeYoloSocket();
  detections.value = [];
  yoloSourceSize.value = { width: 0, height: 0 };
  // The QR composable synchronously terminates its old Worker here, before
  // starting YOLO. Changing mode never touches the camera's media stream.
  detectMode.value = mode;
  if (mode === 'yolo' && isStreaming.value) {
    connectYoloSocket();
    startYoloDetectionLoop();
  }
};

const connectYoloSocket = () => {
  if (detectMode.value !== 'yolo' || !isStreaming.value) return;
  clearTimeout(yoloReconnectTimer);
  yoloReconnectTimer = null;
  if (yoloSocket && yoloSocket.readyState <= 1) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  let wsUrl = '';

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    wsUrl = `${protocol}//127.0.0.1:8001/ws/yolo-client/`;
  } else {
    wsUrl = `${protocol}//${window.location.host}/ws/yolo-client/`;
  }

  console.log(`Connecting to YOLO WebSocket: ${wsUrl}`);
  const socket = new WebSocket(wsUrl);
  yoloSocket = socket;
  const isCurrent = () => yoloSocket === socket && detectMode.value === 'yolo' && isStreaming.value;

  socket.onopen = () => {
    if (!isCurrent()) return;
    console.log('YOLO Client WebSocket connected');
    workerStatus.value = 'online';
  };

  socket.onmessage = (event) => {
    if (!isCurrent()) return;
    const data = jsonParseSafe(event.data);
    if (!data) return;

    if (data.type === 'result') {
      detections.value = data.detections || [];
      yoloSourceSize.value = {
        width: data.width || 640,
        height: data.height || 360
      };
      workerStatus.value = 'online';
    } else if (data.type === 'error') {
      if (data.error === 'YOLO worker offline') {
        workerStatus.value = 'offline';
      } else {
        workerStatus.value = 'error';
      }
    }
  };

  socket.onclose = () => {
    if (!isCurrent()) return;
    yoloSocket = null;
    console.log('YOLO Client WebSocket disconnected');
    if (detectMode.value === 'yolo') {
      workerStatus.value = 'offline';
      // Try to reconnect after 3 seconds
      yoloReconnectTimer = setTimeout(connectYoloSocket, 3000);
    }
  };

  socket.onerror = (err) => {
    if (!isCurrent()) return;
    console.error('YOLO WebSocket error:', err);
    workerStatus.value = 'error';
  };
};

const closeYoloSocket = () => {
  clearTimeout(yoloReconnectTimer);
  yoloReconnectTimer = null;
  const socket = yoloSocket;
  yoloSocket = null;
  // Ignore a disconnected mode's late result / close / reconnect callbacks.
  if (socket) {
    socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
    socket.close();
  }
  workerStatus.value = 'offline';
};

const jsonParseSafe = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
};

const sendFrameToYolo = async () => {
  if (detectMode.value !== 'yolo' || !isStreaming.value) return;
  const video = videoRef.value;
  if (!video || video.readyState < 2 || !cameraInfo.value.width || !cameraInfo.value.height) return;

  if (enabledClassIds.value.length === 0) {
    detections.value = [];
    return;
  }

  if (!yoloSocket || yoloSocket.readyState !== 1) {
    workerStatus.value = 'offline';
    return;
  }

  // Optimize: Resize to 640px width for worker efficiency
  const targetWidth = 640;
  const targetHeight = (cameraInfo.value.height / cameraInfo.value.width) * targetWidth;

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = targetWidth;
  frameCanvas.height = targetHeight;

  const frameCtx = frameCanvas.getContext('2d');
  frameCtx.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);

  // Optimize: Lower quality to 0.5 to reduce network traffic
  const base64Image = frameCanvas.toDataURL('image/jpeg', 0.5).split(',')[1];

  const taskData = {
    type: 'detect',
    task_id: crypto.randomUUID(),
    image: base64Image,
    classes: enabledClassIds.value,
    conf: 0.5
  };

  yoloSocket.send(JSON.stringify(taskData));
};

const startYoloDetectionLoop = () => {
  stopYoloDetectionLoop();
  // Detection frequency: 800ms
  detectTimer = setInterval(async () => {
    if (detectMode.value !== 'yolo' || !isStreaming.value || isDetecting) return;
    isDetecting = true;
    try {
      await sendFrameToYolo();
    } finally {
      isDetecting = false;
    }
  }, 800);
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
  const origin = coverPoint({ x: 0, y: 0 }, videoWidth, videoHeight, containerWidth, containerHeight);
  const scale = Math.max(containerWidth / videoWidth, containerHeight / videoHeight);
  return { renderWidth: videoWidth * scale, renderHeight: videoHeight * scale, offsetX: origin.x, offsetY: origin.y };
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
  if (!showYoloDetection.value || !detections.value.length || !yoloSourceSize.value.width) return;

  const rect = getVideoRenderRect(yoloSourceSize.value.width, yoloSourceSize.value.height, w, h);
  const scaleX = rect.renderWidth / yoloSourceSize.value.width;
  const scaleY = rect.renderHeight / yoloSourceSize.value.height;
  const cx = w / 2;
  const cy = h / 2;

  detections.value.forEach(det => {
    const bx = qr.settings.mirrored ? w - rect.offsetX - det.x2 * scaleX : rect.offsetX + det.x1 * scaleX;
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
      if (showReticle.value) {
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx + bw / 2, by + bh / 2); ctx.stroke();
        ctx.setLineDash([]);
      }
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
  // 1. Header Info Box (Right side only)
  const infoBoxWidth = 330;
  const infoBoxHeight = 44;
  
  ctx.fillStyle = COLORS.DARK_PURPLE;
  ctx.strokeStyle = COLORS.CYAN;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(w - infoBoxWidth - 20, 20, infoBoxWidth, infoBoxHeight);
  ctx.fill();
  ctx.stroke();
  
  ctx.shadowBlur = 10;
  ctx.shadowColor = COLORS.MAGENTA; ctx.fillStyle = COLORS.MAGENTA; ctx.textAlign = 'right';
  ctx.font = 'bold 16px "Courier New", monospace';
  const timeStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  ctx.fillText(`FPS ${fps.toFixed(1)}${hasActiveDetection.value ? `   TARGETS ${targetCount.value}` : ''}   ${timeStr}`, w - 35, 48);
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
  const footerText = `MODE: ${detectMode.value === 'qrcode' ? 'CODE SCANNER' : detectMode.value === 'yolo' ? 'SURVEILLANCE' : 'CAMERA HUD'}   STATUS: ${cameraActive.value ? 'ONLINE' : 'OFFLINE'}   ${filterText}   CORE: ${detectMode.value === 'qrcode' ? 'ZXING WASM' : detectMode.value === 'yolo' ? 'YOLO11N' : 'NONE'}`;
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

  ctx.fillStyle = '#00ffff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'right';
  ctx.fillText(`RENDER FPS: ${fps.toFixed(1)}`, w - 40, 40);
  if (isStreaming.value) {
    ctx.fillText(`CAMERA FPS: ${cameraInfo.value.frameRate}`, w - 40, 60);
    ctx.fillText(`RES: ${cameraInfo.value.width}x${cameraInfo.value.height}`, w - 40, 80);
    if (hasActiveDetection.value) ctx.fillText(`TARGETS: ${targetCount.value}`, w - 40, 100);
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
    qr.draw(ctx, w, h);
    animationId = requestAnimationFrame(draw);
  };
  animationId = requestAnimationFrame(draw);
};

const startCamera = async () => {
  if (isStarting.value || isStreaming.value) return;
  const token = ++cameraGeneration;
  isStarting.value = true;
  errorMsg.value = '';
  let acquiredStream;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('浏览器不支持摄像头，请使用 HTTPS 或 localhost。');
    const constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: currentFacingMode.value }, audio: false };
    acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (token !== cameraGeneration || !videoRef.value) { acquiredStream.getTracks().forEach(t => { if (t.readyState !== 'ended') t.stop(); }); return; }
    stream = acquiredStream;
    // Both system revocation and unexpected stream termination share shutdown.
    // Identity checks prevent a late event from an old lens closing a new one.
    const onStreamEnded = () => {
      if (stream === acquiredStream && token === cameraGeneration) stopCamera();
    };
    const tracks = acquiredStream.getVideoTracks();
    if (!acquiredStream.active || !tracks.length || tracks.some(t => t.readyState === 'ended')) throw new Error('摄像头视频流已结束，请重新开启。');
    tracks.forEach(track => track.addEventListener('ended', onStreamEnded));
    acquiredStream.addEventListener('inactive', onStreamEnded);
    detachStreamEvents = () => {
      tracks.forEach(track => track.removeEventListener('ended', onStreamEnded));
      acquiredStream.removeEventListener('inactive', onStreamEnded);
    };
    videoRef.value.srcObject = stream;
    await videoRef.value.play();
    if (token !== cameraGeneration) return;
    const settings = stream.getVideoTracks()[0].getSettings();
    cameraInfo.value = { width: videoRef.value.videoWidth || settings.width || 1280,
      height: videoRef.value.videoHeight || settings.height || 720, frameRate: settings.frameRate || 30 };
    isStarting.value = false;
    isStreaming.value = true;
    handleResize();
    if (detectMode.value === 'yolo') { connectYoloSocket(); startYoloDetectionLoop(); }
  } catch (err) {
    if (token === cameraGeneration) { stopCamera(); errorMsg.value = `初始化失败: ${err.message}`; }
    else acquiredStream?.getTracks().forEach(t => { if (t.readyState !== 'ended') t.stop(); });
  } finally { if (token === cameraGeneration) isStarting.value = false; }
};

const stopCamera = ({ forCameraSwitch = false } = {}) => {
  cameraGeneration++;
  // Reset the recognition mode first: its sync watcher cancels Code tasks and
  // invalidates pending results. A lens replacement alone preserves the mode.
  if (!forCameraSwitch) setDetectMode('none');
  stopYoloDetectionLoop();
  closeYoloSocket();
  isStreaming.value = false;
  isStarting.value = false;
  detections.value = [];
  yoloSourceSize.value = { width: 0, height: 0 };
  cameraInfo.value = { width: 0, height: 0, frameRate: 0 };
  closeAllMenus();
  detachStreamEvents?.();
  detachStreamEvents = null;
  const previousStream = stream;
  stream = null;
  if (videoRef.value) { videoRef.value.pause(); videoRef.value.srcObject = null; }
  previousStream?.getTracks().forEach(t => { if (t.readyState !== 'ended') t.stop(); });
  const canvas = canvasRef.value;
  canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
};

const switchCamera = () => {
  if (!cameraActive.value) return;
  currentFacingMode.value = currentFacingMode.value === 'user' ? 'environment' : 'user';
  stopCamera({ forCameraSwitch: true });
  startCamera();
};

const captureFrame = () => {
  const canvas = canvasRef.value; const video = videoRef.value;
  const tempCanvas = document.createElement('canvas'); tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  const scale = Math.max(tempCanvas.width / video.videoWidth, tempCanvas.height / video.videoHeight);
  tempCtx.save();
  if (qr.settings.mirrored) { tempCtx.translate(tempCanvas.width, 0); tempCtx.scale(-1, 1); }
  tempCtx.drawImage(video, (tempCanvas.width - video.videoWidth * scale) / 2, (tempCanvas.height - video.videoHeight * scale) / 2, video.videoWidth * scale, video.videoHeight * scale);
  tempCtx.restore();
  tempCtx.drawImage(canvas, 0, 0);
  const link = document.createElement('a'); link.download = `cyber-capture-${Date.now()}.png`; link.href = tempCanvas.toDataURL('image/png'); link.click();
};

const toggleFullscreen = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (containerRef.value?.requestFullscreen) await containerRef.value.requestFullscreen();
    else errorMsg.value = '当前浏览器不支持全屏，可使用浏览器的全屏模式。';
  } catch (error) { errorMsg.value = `无法进入全屏：${error.message}`; }
};

const handleResize = () => {
  if (canvasRef.value && containerRef.value) { canvasRef.value.width = containerRef.value.clientWidth; canvasRef.value.height = containerRef.value.clientHeight; }
};

let resizeObserver;
onMounted(() => { 
  document.body.classList.add('camera-page-active'); 
  handleResize(); 
  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(containerRef.value);
  window.addEventListener('resize', handleResize); 
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleKeyDown)
  initHud(); 
});

onBeforeUnmount(() => { 
  document.body.classList.remove('camera-page-active');
  resizeObserver?.disconnect();
  stopCamera(); 
  closeYoloSocket();
  window.removeEventListener('resize', handleResize); 
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
  if (animationId) cancelAnimationFrame(animationId); 
});
</script>

<style scoped>
.cyber-camera-page {
  width: 100%;
  height: calc(100vh - var(--navbar-height));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #000;
  position: relative;
}

.cyber-camera-warning { 
  background: #ff0055; 
  color: #fff; 
  padding: 8px; 
  text-align: center; 
  font-weight: bold; 
  z-index: 2000; 
  font-size: 13px; 
  flex-shrink: 0;
}

.cyber-camera-stage {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}

.cyber-camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cyber-camera-hud {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
  object-fit: cover;
}

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

/* Options Menu Styling */
.options-menu {
  position: absolute;
  bottom: calc(100% + 15px);
  left: 50%;
  transform: translateX(-50%);
  width: 380px;
  max-height: 520px;
  background: rgba(20, 10, 30, 0.96);
  border: 1px solid #00ffff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 0 24px rgba(0, 255, 255, 0.35);
  color: #fff;
  overflow: hidden;
  z-index: 80;
}

.class-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.class-header h4 {
  margin: 0;
  white-space: nowrap;
  color: #fff;
  font-size: 18px;
  font-weight: 800;
}

.class-search-input {
  width: min(280px, 80%);
  height: 34px;
  border: 1px solid rgba(0, 255, 255, 0.55);
  background: rgba(0, 0, 0, 0.35);
  color: #00ffff;
  border-radius: 6px;
  padding: 0 10px;
  outline: none;
  margin-bottom: 0;
}

.class-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 14px;
  min-height: 210px;
}

.class-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}

.class-item input {
  accent-color: #00ffff;
}

.class-name {
  color: #ddd;
}

.class-id {
  color: rgba(0, 255, 255, 0.65);
  font-size: 11px;
}

.class-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 255, 255, 0.18);
}

.class-pagination button {
  border: 1px solid #00ffff;
  background: rgba(0, 255, 255, 0.08);
  color: #00ffff;
  border-radius: 5px;
  padding: 5px 10px;
  cursor: pointer;
}

.class-pagination button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.hud-options {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 255, 255, 0.18);
}

.cyber-camera-error { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255, 0, 0, 0.2); color: #ff4444; padding: 15px 30px; border: 1px solid #ff4444; border-radius: 8px; backdrop-filter: blur(5px); z-index: 100; }

.hud-top-left {
  position: absolute;
  top: clamp(12px, 2vw, 24px);
  left: clamp(12px, 2vw, 28px);
  z-index: 30;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid rgba(0, 255, 255, 0.7);
  background: rgba(20, 10, 30, 0.55);
  box-shadow: 0 0 14px rgba(0, 255, 255, 0.25);
  pointer-events: none;
  width: fit-content;
  max-width: calc(100vw - 24px);
}

.hud-title {
  color: #00ffff;
  font-weight: 800;
  letter-spacing: 1px;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.9);
  font-size: clamp(13px, 1.2vw, 18px);
  line-height: 1.2;
  white-space: nowrap;
  font-family: "Courier New", monospace;
}

.hud-subtitle {
  display: flex;
  gap: 14px;
  color: rgba(0, 255, 255, 0.78);
  font-size: clamp(10px, 0.9vw, 12px);
  font-weight: 700;
  letter-spacing: 0.6px;
  font-family: "Courier New", monospace;
  text-shadow: 0 0 6px rgba(0, 255, 255, 0.45);
  white-space: nowrap;
}

.yolo-worker-badge {
  position: relative;
  top: auto;
  left: auto;
  right: auto;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border: 1px solid #39ff14;
  border-radius: 6px;
  background: rgba(0, 20, 0, 0.72);
  color: #39ff14;
  font-size: clamp(10px, 0.9vw, 12px);
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 0 12px rgba(57, 255, 20, 0.45);
  white-space: nowrap;
  pointer-events: none;
  text-transform: uppercase;
}

.yolo-worker-badge.online { border-color: #39ff14; color: #39ff14; box-shadow: 0 0 12px rgba(57, 255, 20, 0.45); }
.yolo-worker-badge.offline { border-color: #ff4444; color: #ff4444; background: rgba(20, 0, 0, 0.65); box-shadow: 0 0 12px rgba(255, 68, 68, 0.45); }
.yolo-worker-badge.error { border-color: #ffaa00; color: #ffaa00; background: rgba(20, 15, 0, 0.65); box-shadow: 0 0 12px rgba(255, 170, 0, 0.45); }

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #39ff14;
  box-shadow: 0 0 8px rgba(57, 255, 20, 0.9);
  flex-shrink: 0;
}

.online .status-dot { animation: status-pulse 2s infinite; }

@keyframes status-pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}

@media (max-width: 768px) {
  .mobile-hide { display: none; }
  .cyber-btn { padding: 8px 12px; font-size: 12px; }
  .cyber-btn-group { padding: 6px 10px; gap: 8px; }
  .options-menu { width: 90vw; max-height: 80vh; }
  .class-list { grid-template-columns: 1fr; }
  .class-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .class-search-input {
    width: 100%;
  }
  .hud-top-left { 
    top: 10px; 
    left: 10px; 
    padding: 8px 10px; 
    gap: 6px; 
    max-width: calc(100vw - 20px); 
  } 

  .hud-title { 
    font-size: 11px; 
    white-space: normal; 
  } 

  .hud-subtitle { 
    flex-direction: column; 
    gap: 2px; 
    font-size: 10px; 
  } 

  .yolo-worker-badge { 
    font-size: 10px; 
    padding: 4px 8px; 
  } 
}
.cyber-camera-controls { display: flex; flex-direction: column; align-items: center; gap: 12px; max-width: 100%; }
.options-menu { position: absolute; bottom: auto; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(470px, calc(100% - 24px)); max-height: calc(100% - 130px); padding: 14px; box-sizing: border-box; }
.settings-hint { color: #a8adbf; font-size: 11px; line-height: 1.6; margin-top: 12px; }
.mobile-camera-page { position: fixed; inset: 0; height: 100dvh; z-index: 1000; }
@media (max-width: 900px) {
  .cyber-camera-controls { width: 100%; padding: 0 8px; bottom: max(14px, env(safe-area-inset-bottom)); gap: 8px; box-sizing: border-box; }
  .cyber-btn-group { max-width: 100%; flex-wrap: wrap; border-radius: 12px; gap: 6px; padding: 7px; }
  .cyber-btn { padding: 7px 9px; font-size: 11px; }
  .cyber-btn svg { width: 18px; height: 18px; }
  .options-menu { width: calc(100% - 24px); max-width: 470px; max-height: calc(100% - 120px); }
  .class-list { grid-template-columns: 1fr 1fr; min-height: 230px; gap: 8px; }
  .class-item { flex-wrap: wrap; font-size: 12px; gap: 5px; }
  .class-id { font-size: 10px; }
}
@media (max-width: 600px) {
  .hud-top-left { max-width: calc(100% - 185px); box-sizing: border-box; }
  .hud-title { font-size: 10px; overflow-wrap: anywhere; }
  .hud-subtitle { font-size: 9px; }
}
@media (max-height: 520px) {
  .hud-top-left { top: 6px; padding: 5px 8px; }
  .hud-title { font-size: 11px; }
  .options-menu { max-height: calc(100% - 24px); }
}
.cyber-camera-video.mirrored { transform: scaleX(-1); }
</style>
