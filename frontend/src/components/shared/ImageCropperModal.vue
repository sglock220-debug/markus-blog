<template>
  <div v-if="visible" class="cropper-overlay" @click.self="cancel">
    <div class="cropper-modal">
      <div class="cropper-header">
        <h3>裁剪图片</h3>
        <button class="close-btn" @click="cancel"><i class="fas fa-times"></i></button>
      </div>
      <div class="cropper-body">
        <div class="img-container">
          <img ref="imageRef" :src="imageSrc" alt="Source Image" />
        </div>
      </div>
      <div class="cropper-footer">
        <button class="cancel-btn" @click="cancel">取消</button>
        <button class="confirm-btn" @click="crop">确认并上传</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

const props = defineProps({
  visible: Boolean,
  imageSrc: String,
});

const emit = defineEmits(['update:visible', 'confirm', 'cancel']);

const imageRef = ref(null);
let cropper = null;

const initCropper = async () => {
  await nextTick();
  if (cropper) {
    cropper.destroy();
  }
  if (imageRef.value) {
    cropper = new Cropper(imageRef.value, {
      aspectRatio: 1,
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

watch(() => props.visible, (newVal) => {
  if (newVal && props.imageSrc) {
    initCropper();
  } else if (!newVal && cropper) {
    cropper.destroy();
    cropper = null;
  }
});

const crop = () => {
  if (!cropper) return;
  
  const canvas = cropper.getCroppedCanvas({
    width: 400,
    height: 400,
  });
  
  canvas.toBlob((blob) => {
    emit('confirm', blob);
    emit('update:visible', false);
  }, 'image/jpeg', 0.9);
};

const cancel = () => {
  emit('cancel');
  emit('update:visible', false);
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
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
  backdrop-filter: blur(2px);
}

.cropper-modal {
  background: #fff;
  border-radius: 12px;
  width: 500px;
  max-width: 95vw;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
}

.cropper-body {
  padding: 20px;
  background: #f8f8f8;
}

.img-container {
  max-height: 400px;
  width: 100%;
  background: #000;
  overflow: hidden;
}

.img-container img {
  display: block;
  max-width: 100%;
}

.cropper-footer {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  padding: 8px 20px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
}

.confirm-btn {
  padding: 8px 20px;
  background: #07c160;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.confirm-btn:hover {
  background: #129611;
}
</style>
