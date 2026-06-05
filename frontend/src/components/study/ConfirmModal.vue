<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click="handleCancel">
      <div class="modal-container" @click.stop>
        <div class="modal-content">
          <p class="message">{{ message }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="handleCancel">取消 (Esc)</button>
            <button class="btn btn-primary" @click="handleConfirm">确定 (Enter)</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  show: Boolean,
  message: String
});

const emit = defineEmits(['confirm', 'cancel']);

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
};

const handleKeydown = (e) => {
  if (!props.show) return;
  if (e.key === 'Enter') {
    handleConfirm();
  } else if (e.key === 'Escape') {
    handleCancel();
  }
};

watch(() => props.show, (newVal) => {
  if (newVal) {
    window.addEventListener('keydown', handleKeydown);
  } else {
    window.removeEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: var(--card-bg);
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 90%;
  border: 1px solid var(--border-color);
}

.message {
  font-size: 1.1rem;
  margin-bottom: 24px;
  text-align: center;
  color: var(--text-color);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--border-color);
  color: var(--text-color);
}

.btn-secondary:hover {
  background: #ccc;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}
</style>
