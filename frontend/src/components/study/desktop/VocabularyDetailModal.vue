<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click="handleClose">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <div class="header-actions">
            <button class="icon-btn close-btn" @click="handleClose" title="关闭">
              <XIcon size="20" />
            </button>
            <button 
              v-if="!isLearned" 
              class="icon-btn learned-btn" 
              @click.stop="$emit('toggle-learned', word)" 
              title="标记为已学"
            >
              <CheckIcon size="20" color="#52c41a" />
            </button>
            <button 
              v-else 
              class="icon-btn unlearned-btn" 
              @click.stop="$emit('toggle-learned', word)" 
              title="移出已学"
            >
              <XIcon size="20" color="#ff4d4f" />
            </button>
          </div>
        </div>
        
        <div class="modal-content" @click="toggleExampleMeaning">
          <div class="word-section">
            <h2 class="word">
              <span v-if="word.article" class="article">{{ word.article }} </span>
              {{ word.word }}
              <span v-if="word.plural" class="plural"> ({{ word.plural }})</span>
            </h2>
            <div class="pos-tag" v-if="word.partOfSpeech">{{ word.partOfSpeech }}</div>
          </div>

          <div class="meaning-section">
            <p class="meaning">{{ word.meaning }}</p>
            <p v-if="word.meaningEnglish" class="meaning-en">{{ word.meaningEnglish }}</p>
          </div>

          <div class="example-section" v-if="word.example">
            <p class="example">{{ word.example }}</p>
            <transition name="fade">
              <p v-if="showExampleMeaning" class="example-meaning">{{ word.exampleMeaning }}</p>
            </transition>
          </div>

          <div class="meta-section">
            <div v-if="word.category" class="meta-item">
              <span class="label">类别:</span> {{ word.category }}
            </div>
            <div v-if="word.importance" class="meta-item">
              <span class="label">重要度:</span> {{ word.importance }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { X as XIcon, Check as CheckIcon } from '@lucide/vue';

const props = defineProps({
  show: Boolean,
  word: Object,
  isLearned: Boolean
});

const emit = defineEmits(['close', 'toggle-learned']);
const showExampleMeaning = ref(false);
const handleClose = () => emit('close');
const toggleExampleMeaning = () => { showExampleMeaning.value = !showExampleMeaning.value; };

watch(() => props.show, (newVal) => {
  if (newVal) showExampleMeaning.value = false;
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
  z-index: 4000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: var(--card-bg);
  width: 90%;
  max-width: 500px;
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 16px;
  display: flex;
  justify-content: flex-end;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.icon-btn {
  background: var(--border-color);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-color);
}

.icon-btn:hover {
  transform: scale(1.1);
  background: #ddd;
}

.modal-content {
  padding: 0 32px 32px;
  cursor: pointer;
}

.word-section {
  margin-bottom: 20px;
}

.word {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-color);
  margin-bottom: 8px;
}

.article {
  font-size: 1.2rem;
  color: var(--accent-color);
  font-weight: 600;
}

.plural {
  font-size: 1.2rem;
  color: var(--secondary-text);
  font-weight: 400;
}

.pos-tag {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent-color);
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}

.meaning-section {
  margin-bottom: 24px;
}

.meaning {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 4px;
}

.meaning-en {
  font-size: 1rem;
  color: var(--secondary-text);
}

.example-section {
  background: var(--bg-color);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  border-left: 4px solid var(--accent-color);
}

.example {
  font-size: 1.1rem;
  font-style: italic;
  color: var(--text-color);
  line-height: 1.5;
}

.example-meaning {
  margin-top: 12px;
  font-size: 1rem;
  color: var(--secondary-text);
}

.meta-section {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 0.9rem;
  color: var(--secondary-text);
}

.meta-item .label {
  font-weight: 600;
  margin-right: 4px;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
