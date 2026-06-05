<template>
  <div class="vocabulary-row" @click="$emit('toggle-meaning', word.id)">
    <div class="word-col">
      <span class="word-text">
        <span v-if="word.article" class="article">{{ word.article }} </span>
        {{ word.word }}
      </span>
    </div>
    
    <div class="meaning-col">
      <transition name="fade">
        <span v-if="isExpanded" class="meaning-text">{{ word.meaning }}</span>
      </transition>
    </div>

    <div class="actions-col">
      <button class="action-btn detail-btn" @click.stop="$emit('show-detail', word)" title="详情">
        ⓘ
      </button>
      
      <button 
        v-if="!isLearned" 
        class="action-btn learned-btn" 
        @click.stop="$emit('toggle-learned', word)" 
        title="标记为已学"
      >
        <CheckIcon size="18" />
      </button>
      <button 
        v-else 
        class="action-btn unlearned-btn" 
        @click.stop="$emit('toggle-learned', word)" 
        title="移出已学"
      >
        <XIcon size="18" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { Check as CheckIcon, X as XIcon } from '@lucide/vue';

defineProps({
  word: Object,
  isExpanded: Boolean,
  isLearned: Boolean
});

defineEmits(['toggle-meaning', 'show-detail', 'toggle-learned']);
</script>

<style scoped>
.vocabulary-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background 0.2s;
  min-height: 56px;
}

.vocabulary-row:hover {
  background: rgba(var(--accent-rgb), 0.03);
}

.word-col {
  flex: 0 0 150px;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text-color);
}

.article {
  color: var(--accent-color);
  font-size: 0.9rem;
  font-weight: 600;
}

.meaning-col {
  flex: 1;
  padding: 0 16px;
  color: var(--secondary-text);
  font-size: 1rem;
}

.actions-col {
  flex: 0 0 100px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 6px;
  border-radius: 8px;
  transition: all 0.2s;
  color: var(--secondary-text);
}

.detail-btn {
  font-size: 1.2rem;
  color: var(--accent-color);
  background: rgba(var(--accent-rgb), 0.1);
  width: 32px;
  height: 32px;
}

.detail-btn:hover {
  background: var(--accent-color);
  color: white;
}

.learned-btn {
  color: #52c41a;
}

.learned-btn:hover {
  background: #f6ffed;
  color: #389e0d;
}

.unlearned-btn {
  color: #ff4d4f;
}

.unlearned-btn:hover {
  background: #fff1f0;
  color: #cf1322;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .word-col {
    flex: 0 0 100px;
    font-size: 1rem;
  }
}
</style>
