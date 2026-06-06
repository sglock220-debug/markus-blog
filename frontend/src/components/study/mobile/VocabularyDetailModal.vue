<template>
  <Teleport to="body">
    <transition name="slide-up">
      <div v-if="show" class="mobile-modal-overlay">
        <div class="mobile-modal-container">
          <div class="mobile-modal-header">
            <button class="header-btn" @click="handleClose">
              <ArrowLeftIcon size="24" />
            </button>
            <span class="header-title">单词详情</span>
            <button 
              class="header-btn" 
              :class="{ 'is-learned': isLearned }"
              @click.stop="$emit('toggle-learned', word)"
            >
              <CheckIcon v-if="!isLearned" size="24" />
              <RotateCcwIcon v-else size="24" />
            </button>
          </div>
          
          <div class="mobile-modal-content">
            <div class="mobile-word-card">
              <div class="word-main">
                <h2 class="word-text">
                  <span v-if="word.article" class="article">{{ word.article }} </span>
                  {{ word.word }}
                </h2>
                <div class="plural" v-if="word.plural">({{ word.plural }})</div>
              </div>
              <div class="pos-badge" v-if="word.partOfSpeech">{{ word.partOfSpeech }}</div>
            </div>

            <div class="detail-section">
              <h3>释义</h3>
              <p class="meaning-text">{{ word.meaning }}</p>
              <p v-if="word.meaningEnglish" class="meaning-en">{{ word.meaningEnglish }}</p>
            </div>

            <div class="detail-section" v-if="word.example">
              <h3>例句</h3>
              <div class="example-box" @click="showExampleMeaning = !showExampleMeaning">
                <p class="example-text">{{ word.example }}</p>
                <transition name="fade">
                  <p v-if="showExampleMeaning" class="example-translation">{{ word.exampleMeaning }}</p>
                </transition>
                <div class="tap-hint" v-if="!showExampleMeaning">点击显示翻译</div>
              </div>
            </div>

            <div class="mobile-meta-grid">
              <div v-if="word.category" class="meta-card">
                <span class="label">类别</span>
                <span class="value">{{ word.category }}</span>
              </div>
              <div v-if="word.importance" class="meta-card">
                <span class="label">重要度</span>
                <span class="value">{{ word.importance }}</span>
              </div>
            </div>
          </div>

          <div class="mobile-modal-footer">
            <button 
              class="action-btn primary" 
              :class="{ secondary: isLearned }"
              @click="$emit('toggle-learned', word)"
            >
              {{ isLearned ? '设为未学' : '掌握这个单词' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { 
  ArrowLeft as ArrowLeftIcon, 
  Check as CheckIcon, 
  RotateCcw as RotateCcwIcon 
} from '@lucide/vue';

const props = defineProps({
  show: Boolean,
  word: Object,
  isLearned: Boolean
});

const emit = defineEmits(['close', 'toggle-learned']);
const showExampleMeaning = ref(false);
const handleClose = () => emit('close');

watch(() => props.show, (newVal) => {
  if (newVal) showExampleMeaning.value = false;
});
</script>

<style scoped>
.mobile-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-color);
  z-index: 5000;
  display: flex;
  flex-direction: column;
}

.mobile-modal-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top);
}

.mobile-modal-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--card-bg);
}

.header-btn {
  background: none;
  border: none;
  color: var(--text-color);
  padding: 8px;
}

.header-btn.is-learned {
  color: var(--accent-color);
}

.header-title {
  font-weight: bold;
  font-size: 1.1rem;
}

.mobile-modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
}

.mobile-word-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid var(--border-color);
  box-shadow: var(--card-shadow);
  text-align: center;
}

.word-text {
  font-size: 2.2rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.article {
  font-size: 1rem;
  color: var(--accent-color);
}

.plural {
  font-size: 1rem;
  color: var(--secondary-text);
}

.pos-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent-color);
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: bold;
  margin-top: 8px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h3 {
  font-size: 0.9rem;
  color: var(--secondary-text);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.meaning-text {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 4px;
}

.meaning-en {
  font-size: 1rem;
  color: var(--secondary-text);
}

.example-box {
  background: var(--card-bg);
  padding: 20px;
  border-radius: 12px;
  border-left: 4px solid var(--accent-color);
  position: relative;
}

.example-text {
  font-size: 1.1rem;
  line-height: 1.6;
  font-style: italic;
}

.example-translation {
  margin-top: 12px;
  color: var(--secondary-text);
  font-size: 1rem;
}

.tap-hint {
  font-size: 0.75rem;
  color: var(--secondary-text);
  margin-top: 12px;
  text-align: center;
  opacity: 0.6;
}

.mobile-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.meta-card {
  background: var(--card-bg);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-card .label {
  font-size: 0.75rem;
  color: var(--secondary-text);
}

.meta-card .value {
  font-weight: bold;
  font-size: 0.9rem;
}

.mobile-modal-footer {
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: var(--card-bg);
  border-top: 1px solid var(--border-color);
}

.action-btn {
  width: 100%;
  height: 52px;
  border-radius: 26px;
  border: none;
  font-weight: bold;
  font-size: 1rem;
}

.action-btn.primary {
  background: var(--accent-color);
  color: white;
}

.action-btn.secondary {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  color: var(--text-color);
}

/* Transitions */
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
