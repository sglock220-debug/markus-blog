import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import api from '../api';

export function useCyberCamera(videoRef, canvasRef) {
  const isStreaming = ref(false);
  const errorMsg = ref('');
  const isSecure = ref(window.isSecureContext || window.location.hostname === 'localhost');
  const currentFacingMode = ref('environment');
  const visionStyle = ref('default');
  const showStyleMenu = ref(false);
  const showDetectMenu = ref(false);
  const showOptionMenu = ref(false);
  const detectMode = ref('none');
  const detections = ref([]);
  const yoloSourceSize = ref({ width: 0, height: 0 });
  const showReticle = ref(true);
  const workerStatus = ref('offline');
  let yoloSocket = null;
  let animationFrameId = null;

  // COCO Classes
  const allYoloClasses = ref([ 
    { id: 0, name: "person", label: "人", enabled: true }, 
    { id: 67, name: "cell phone", label: "手机", enabled: true },
    // ... Simplified for now, can be expanded
  ]);

  const classSearchQuery = ref('');
  const classPage = ref(1);
  const classPageSize = 10;

  const startCamera = async () => {
    errorMsg.value = '';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: currentFacingMode.value,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      if (videoRef.value) {
        videoRef.value.srcObject = stream;
        isStreaming.value = true;
        startHUDLoop();
      }
    } catch (err) {
      errorMsg.value = `无法访问摄像头: ${err.message}`;
    }
  };

  const stopCamera = () => {
    if (videoRef.value && videoRef.value.srcObject) {
      videoRef.value.srcObject.getTracks().forEach(track => track.stop());
      videoRef.value.srcObject = null;
    }
    isStreaming.value = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (yoloSocket) yoloSocket.close();
  };

  const startHUDLoop = () => {
    const render = () => {
      drawHUD();
      animationFrameId = requestAnimationFrame(render);
    };
    render();
  };

  const drawHUD = () => {
    if (!canvasRef.value || !videoRef.value || !isStreaming.value) return;
    const ctx = canvasRef.value.getContext('2d');
    const v = videoRef.value;
    
    canvasRef.value.width = v.videoWidth;
    canvasRef.value.height = v.videoHeight;
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);

    // Draw detections
    if (detectMode.value === 'yolo' && detections.value.length > 0) {
      detections.value.forEach(det => {
        const { x1, y1, x2, y2, label, score } = det;
        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.fillStyle = '#00ff41';
        ctx.font = '14px monospace';
        ctx.fillText(`${label} ${Math.round(score * 100)}%`, x1, y1 > 20 ? y1 - 5 : y1 + 15);
      });
    }

    // Draw reticle
    if (showReticle.value) {
      const cx = canvasRef.value.width / 2;
      const cy = canvasRef.value.height / 2;
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.5)';
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy); ctx.lineTo(cx + 20, cy);
      ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 20);
      ctx.stroke();
    }
  };

  const toggleYoloClass = (id) => {
    const cls = allYoloClasses.value.find(c => c.id === id);
    if (cls) cls.enabled = !cls.enabled;
  };

  onBeforeUnmount(() => {
    stopCamera();
  });

  return {
    isStreaming, errorMsg, isSecure, visionStyle, showStyleMenu, showDetectMenu, showOptionMenu,
    detectMode, detections, showReticle, workerStatus, allYoloClasses,
    classSearchQuery, classPage,
    startCamera, stopCamera, toggleYoloClass
  };
}
