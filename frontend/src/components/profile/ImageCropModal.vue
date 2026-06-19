<template>
  <Teleport to="body">
    <div v-if="show" class="cropper-overlay" @click.self="$emit('cancel')">
      <div class="cropper-modal">
        <div class="cropper-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" @click="$emit('cancel')"><X :size="20" /></button>
        </div>
        <div class="cropper-body">
          <div class="img-container">
            <img ref="imageRef" :src="imageSrc" alt="Source Image" />
          </div>
        </div>
        <div class="cropper-footer">
          <div class="zoom-controls">
            <button @click="zoom(-0.1)"><Minus :size="16" /></button>
            <button @click="zoom(0.1)"><Plus :size="16" /></button>
          </div>
          <div class="action-btns">
            <button class="cancel-btn" @click="$emit('cancel')">取消</button>
            <button class="confirm-btn" @click="handleConfirm">确认并上传</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from 'vue';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { X, Plus, Minus } from 'lucide-vue-next';

const props = defineProps({
  show: Boolean,
  imageSrc: String,
  title: { type: String, default: '裁剪图片' },
  aspectRatio: { type: Number, default: 1 }
});

const emit = defineEmits(['confirm', 'cancel']);

const imageRef = ref(null);
let cropper = null;

const initCropper = async () => {
  await nextTick();
  if (cropper) {
    cropper.destroy();
  }
  if (imageRef.value) {
    cropper = new Cropper(imageRef.value, {
      aspectRatio: props.aspectRatio,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 1,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
    });
  }
};

watch(() => props.show, (newVal) => {
  if (newVal && props.imageSrc) {
    initCropper();
  } else if (!newVal && cropper) {
    cropper.destroy();
    cropper = null;
  }
});

const zoom = (ratio) => {
  if (cropper) cropper.zoom(ratio);
};

const handleConfirm = () => {
  if (!cropper) return;
  
  // Get cropped canvas. No need to hardcode width/height here if we want quality, 
  // but we can set a reasonable max width.
  const canvas = cropper.getCroppedCanvas({
    maxWidth: 2048,
    maxHeight: 2048,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  });
  
  canvas.toBlob((blob) => {
    emit('confirm', blob);
  }, 'image/jpeg', 0.9);
};

onBeforeUnmount(() => {
  if (cropper) {
    cropper.destroy();
  }
});
</script>

<style scoped>
.cropper-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.cropper-modal {
  background: #fff;
  border-radius: 16px;
  width: 600px;
  max-width: 95vw;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 3001;
  opacity: 1;
  filter: none;
}

.cropper-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cropper-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
}

.cropper-body {
  padding: 0;
  background: #000;
}

.img-container {
  height: 400px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-container img {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.cropper-footer {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #eee;
}

.zoom-controls {
  display: flex;
  gap: 8px;
}

.zoom-controls button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #ddd;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.action-btns {
  display: flex;
  gap: 12px;
}

.cancel-btn {
  padding: 8px 24px;
  border: none;
  background: #f5f5f5;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
}

.confirm-btn {
  padding: 8px 24px;
  background: #07c160;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
}
</style>
