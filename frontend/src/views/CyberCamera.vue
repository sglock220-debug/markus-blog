<template>
  <div class="cyber-camera-page">
    <!-- HTTPS Warning -->
    <div v-if="!isSecure" class="cyber-camera-warning">
      <p>检测到非安全环境。请使用 HTTPS 或 localhost 访问以获取摄像头权限。</p>
    </div>

    <div class="cyber-camera-container" ref="containerRef">
      <!-- Video Element (Hidden but active) -->
      <video 
        ref="videoRef" 
        autoplay 
        playsinline 
        class="cyber-camera-video"
      ></video>

      <!-- Canvas Overlay for HUD -->
      <canvas ref="canvasRef" class="cyber-camera-hud"></canvas>

      <!-- Controls UI -->
      <div class="cyber-camera-controls">
        <button v-if="!isStreaming" @click="startCamera" class="cyber-btn primary">
          <CameraIcon /> 开启视觉系统
        </button>
        <div v-else class="cyber-btn-group">
          <button @click="stopCamera" class="cyber-btn danger">
            <XIcon /> 关闭
          </button>
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

      <!-- Error Message -->
      <div v-if="errorMsg" class="cyber-camera-error">
        {{ errorMsg }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { 
  Camera as CameraIcon, 
  X as XIcon, 
  RefreshCw as RefreshCwIcon, 
  Download as DownloadIcon,
  Maximize as MaximizeIcon
} from '@lucide/vue';

const containerRef = ref(null);
const videoRef = ref(null);
const canvasRef = ref(null);
const isStreaming = ref(false);
const errorMsg = ref('');
const isSecure = ref(window.isSecureContext || window.location.hostname === 'localhost');
const currentFacingMode = ref('environment'); // Default to rear camera

let stream = null;
let animationId = null;
let lastTime = 0;
let fps = 0;
let scanY = 0;

// Initialize HUD drawing
const initHud = () => {
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  
  const draw = (time) => {
    // Calculate FPS
    const deltaTime = time - lastTime;
    if (deltaTime >= 1000) {
      fps = Math.round(1000 / (deltaTime / (lastFrameCount || 1)));
      lastFrameCount = 0;
      lastTime = time;
    }
    lastFrameCount++;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // 2. Draw Scan Line
    scanY = (scanY + 2) % h;
    ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.fillRect(0, scanY, w, 2);

    // 3. Draw Four Corners
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    const cornerSize = 30;
    // Top Left
    ctx.beginPath(); ctx.moveTo(20, 20 + cornerSize); ctx.lineTo(20, 20); ctx.lineTo(20 + cornerSize, 20); ctx.stroke();
    // Top Right
    ctx.beginPath(); ctx.moveTo(w - 20 - cornerSize, 20); ctx.lineTo(w - 20, 20); ctx.lineTo(w - 20, 20 + cornerSize); ctx.stroke();
    // Bottom Left
    ctx.beginPath(); ctx.moveTo(20, h - 20 - cornerSize); ctx.lineTo(20, h - 20); ctx.lineTo(20 + cornerSize, h - 20); ctx.stroke();
    // Bottom Right
    ctx.beginPath(); ctx.moveTo(w - 20 - cornerSize, h - 20); ctx.lineTo(w - 20, h - 20); ctx.lineTo(w - 20, h - 20 - cornerSize); ctx.stroke();

    // 4. Center Crosshair
    ctx.beginPath();
    ctx.moveTo(w/2 - 20, h/2); ctx.lineTo(w/2 + 20, h/2);
    ctx.moveTo(w/2, h/2 - 20); ctx.lineTo(w/2, h/2 + 20);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w/2, h/2, 10, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Header HUD
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('NEURAL VISION // CYBER CAMERA v1.0', 40, 40);
    
    // Right Top Info
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${fps}`, w - 40, 40);
    ctx.fillText(`STATUS: ${isStreaming.value ? 'ONLINE' : 'OFFLINE'}`, w - 40, 60);
    ctx.fillText(new Date().toLocaleTimeString(), w - 40, 80);

    // 6. Bottom HUD
    ctx.textAlign = 'left';
    ctx.fillText(`MODE: LOCAL CAMERA`, 40, h - 40);
    ctx.fillText(`DEVICE: ${/Mobile|Android/i.test(navigator.userAgent) ? 'MOBILE' : 'DESKTOP'}`, 40, h - 60);
    
    ctx.textAlign = 'right';
    ctx.fillText('HUD ACTIVE // SIGNAL SECURE', w - 40, h - 40);

    animationId = requestAnimationFrame(draw);
  };

  let lastFrameCount = 0;
  animationId = requestAnimationFrame(draw);
};

const startCamera = async () => {
  errorMsg.value = '';
  try {
    const constraints = {
      video: { 
        facingMode: currentFacingMode.value,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };
    
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoRef.value.srcObject = stream;
    isStreaming.value = true;
    
    // Adjust canvas to match video or container
    handleResize();
  } catch (err) {
    console.error('Camera error:', err);
    if (currentFacingMode.value === 'environment') {
      // Fallback to default
      currentFacingMode.value = 'user';
      startCamera();
    } else {
      errorMsg.value = `初始化失败: ${err.message || '请检查摄像头权限'}`;
    }
  }
};

const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  isStreaming.value = false;
};

const switchCamera = () => {
  currentFacingMode.value = currentFacingMode.value === 'user' ? 'environment' : 'user';
  stopCamera();
  startCamera();
};

const captureFrame = () => {
  const canvas = canvasRef.value;
  const video = videoRef.value;
  
  // Create temporary canvas to combine video and HUD
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  // Draw video frame
  tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
  // Draw HUD overlay
  tempCtx.drawImage(canvas, 0, 0);
  
  const link = document.createElement('a');
  link.download = `cyber-capture-${Date.now()}.png`;
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    containerRef.value.requestFullscreen().catch(err => {
      errorMsg.value = `无法全屏: ${err.message}`;
    });
  } else {
    document.exitFullscreen();
  }
};

const handleResize = () => {
  if (canvasRef.value && containerRef.value) {
    canvasRef.value.width = containerRef.value.clientWidth;
    canvasRef.value.height = containerRef.value.clientHeight;
  }
};

onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize);
  initHud();
});

onBeforeUnmount(() => {
  stopCamera();
  window.removeEventListener('resize', handleResize);
  if (animationId) cancelAnimationFrame(animationId);
});
</script>

<style scoped>
.cyber-camera-page {
  width: 100%;
  height: calc(100vh - 70px); /* Adjust based on navbar height */
  background: #000;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cyber-camera-warning {
  background: #ff0055;
  color: #fff;
  padding: 10px;
  text-align: center;
  font-weight: bold;
  z-index: 2000;
}

.cyber-camera-container {
  flex: 1;
  position: relative;
  background: #050505;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cyber-camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(1); /* Mirror for front camera can be added if needed */
}

.cyber-camera-hud {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.cyber-camera-controls {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}

.cyber-btn-group {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: center;
}

.cyber-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid #00ffff;
  background: rgba(0, 255, 255, 0.1);
  color: #00ffff;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.3s;
  backdrop-filter: blur(5px);
}

.cyber-btn:hover {
  background: rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 15px #00ffff;
}

.cyber-btn.danger { border-color: #ff0055; color: #ff0055; background: rgba(255, 0, 85, 0.1); }
.cyber-btn.danger:hover { background: rgba(255, 0, 85, 0.3); box-shadow: 0 0 15px #ff0055; }

.cyber-btn.success { border-color: #00ff66; color: #00ff66; background: rgba(0, 255, 102, 0.1); }
.cyber-btn.success:hover { background: rgba(0, 255, 102, 0.3); box-shadow: 0 0 15px #00ff66; }

.cyber-camera-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 0, 85, 0.8);
  color: #fff;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  max-width: 80%;
}

@media (max-width: 768px) {
  .cyber-camera-page {
    height: calc(100vh - 60px);
  }
  .cyber-camera-controls {
    bottom: 80px;
    width: 90%;
  }
  .cyber-btn {
    padding: 8px 15px;
    font-size: 12px;
  }
}
</style>
