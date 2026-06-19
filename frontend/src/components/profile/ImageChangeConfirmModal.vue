<template>
  <Teleport to="body">
    <div v-if="show" class="confirm-overlay" @click.self="handleCancel">
      <div class="confirm-modal">
        <!-- Image Preview Area -->
        <div class="preview-area">
          <img 
            :src="previewUrl || defaultPlaceholder" 
            class="preview-image"
            :class="{ 'is-placeholder': !previewUrl, 'can-download': mode === 'replace' }"
            @click="handleImageClick"
            title="点击查看/下载原图"
          />
        </div>

        <div class="content-area">
          <p class="message">{{ currentMessage }}</p>
          <p v-if="mode === 'replace'" class="hint">上传图片不得超过 5MB</p>
          <div class="actions">
            <button class="btn cancel-btn" @click="handleLeftBtnClick">
              <ArrowLeft v-if="mode === 'download'" :size="32" />
              <X v-else :size="32" />
            </button>
            <button class="btn confirm-btn" @click="handleRightBtnClick">
              <Download v-if="mode === 'download'" :size="32" />
              <Check v-else :size="32" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Check, X, Download, ArrowLeft } from 'lucide-vue-next';

const props = defineProps({
  show: Boolean,
  message: String,
  previewUrl: String,
  type: {
    type: String,
    default: 'avatar' // 'avatar' or 'cover'
  }
});

const emit = defineEmits(['confirm', 'cancel']);

const mode = ref('replace'); // 'replace' or 'download'

const currentMessage = computed(() => {
  return mode.value === 'download' ? '要下载原图吗？' : props.message;
});

const defaultPlaceholder = computed(() => {
  return props.type === 'avatar' ? '/default-avatar.png' : '';
});

const handleImageClick = () => {
  if (mode.value === 'replace') {
    mode.value = 'download';
  }
};

const handleLeftBtnClick = () => {
  if (mode.value === 'download') {
    mode.value = 'replace';
  } else {
    handleCancel();
  }
};

const handleRightBtnClick = () => {
  if (mode.value === 'download') {
    handleDownload();
  } else {
    emit('confirm');
  }
};

const handleDownload = () => {
  if (!props.previewUrl) return;
  const link = document.createElement('a');
  link.href = props.previewUrl;
  link.download = props.type === 'avatar' ? 'avatar-original' : 'cover-original';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handleCancel = () => {
  mode.value = 'replace';
  emit('cancel');
};

const handleEsc = (e) => {
  if (e.key === 'Escape' && props.show) {
    handleCancel();
  }
};

// Reset mode when show changes
watch(() => props.show, (newVal) => {
  if (!newVal) {
    mode.value = 'replace';
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleEsc);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEsc);
});
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  backdrop-filter: blur(8px);
}

.confirm-modal {
  background: #fff;
  width: min(820px, 86vw);
  max-height: 86vh;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.preview-area {
  width: 100%;
  height: 58vh;
  max-height: 620px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  overflow: hidden;
  flex-shrink: 0;
}

.preview-image {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.preview-image.can-download {
  cursor: pointer;
  transition: opacity 0.2s;
}

.preview-image.can-download:hover {
  opacity: 0.9;
}

.is-placeholder {
  opacity: 0.5;
}

.content-area {
  padding: 32px 0 36px;
  text-align: center;
  background: #fff;
}

.message {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1a1a1a;
}

.hint {
  font-size: 14px;
  color: #999;
  margin-bottom: 24px;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 48px;
}

.btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
}

.btn:active {
  transform: scale(0.95);
}

.cancel-btn {
  background: #ff4d4f;
  color: #fff;
}

.confirm-btn {
  background: #07c160;
  color: #fff;
}

@media (max-width: 768px) {
  .confirm-modal {
    width: 92vw;
  }

  .preview-area, .preview-image {
    max-height: 50vh;
  }

  .btn {
    width: 64px;
    height: 64px;
  }

  .message {
    font-size: 18px;
    padding: 0 20px;
  }
}
</style>
