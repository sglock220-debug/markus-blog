<template>
  <Teleport to="body">
    <div v-if="show" class="game-modal-overlay" @click.self="handleCancel">
      <section class="game-modal" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <header class="game-modal-header">
          <h2 :id="titleId">{{ title }}</h2>
        </header>

        <div class="game-modal-body">
          <p>{{ message }}</p>
        </div>

        <footer class="game-modal-footer">
          <button type="button" class="game-modal-btn return-btn" @click="handleCancel">
            返回
          </button>
          <button type="button" class="game-modal-btn enter-btn" @click="handleConfirm">
            <CheckIcon size="18" />
            进入
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { Check as CheckIcon } from '@lucide/vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['confirm', 'cancel']);

const titleId = computed(() => `game-modal-title-${props.title.replace(/\s+/g, '-')}`);

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.game-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.46);
  backdrop-filter: blur(4px);
}

.game-modal {
  width: min(420px, 100%);
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
}

.game-modal-header {
  padding: 22px 24px 14px;
  border-bottom: 1px solid var(--border-color);
}

.game-modal-header h2 {
  margin: 0;
  color: var(--text-color);
  font-size: 1.25rem;
  font-weight: 800;
}

.game-modal-body {
  padding: 24px;
}

.game-modal-body p {
  margin: 0;
  color: var(--secondary-text);
  font-size: 1rem;
  line-height: 1.7;
}

.game-modal-footer {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 24px 24px;
}

.game-modal-btn {
  min-width: 108px;
  height: 42px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.game-modal-btn:hover {
  transform: translateY(-1px);
}

.return-btn {
  background: #e74c3c;
  color: #fff;
}

.enter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--accent-color);
  color: #fff;
}

@media (max-width: 420px) {
  .game-modal-footer {
    flex-direction: column-reverse;
  }

  .game-modal-btn {
    width: 100%;
  }
}
</style>
