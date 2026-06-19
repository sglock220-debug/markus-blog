<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast-wrapper">
        <div class="toast-content">
          <Lock :size="16" class="lock-icon" />
          <span>{{ message }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import { Lock } from 'lucide-vue-next';

const visible = ref(false);
const message = ref('');
let timer = null;

const show = (msg, duration = 1800) => {
  message.value = msg;
  visible.value = true;
  
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    visible.value = false;
  }, duration);
};

defineExpose({ show });
</script>

<style scoped>
.toast-wrapper {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  pointer-events: none;
}

.toast-content {
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  color: #fff;
  padding: 10px 20px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.lock-icon {
  opacity: 0.9;
}

/* Transition */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -40%);
}
</style>