<template>
  <div class="mobile-study-mode">
    <div class="mobile-study-header">
      <div class="mobile-study-tabs">
        <button 
          :class="['mobile-tab-btn', { active: activeTab === 'unlearned' }]" 
          @click="activeTab = 'unlearned'"
        >
          未学 ({{ unlearnedWords.length }})
        </button>
        <button 
          :class="['mobile-tab-btn', { active: activeTab === 'learned' }]" 
          @click="activeTab = 'learned'"
        >
          已学 ({{ learnedWords.length }})
        </button>
      </div>
    </div>

    <div class="mobile-study-content">
      <div v-if="activeTab === 'unlearned' && unlearnedWords.length === 0" class="empty-state">
        <span class="empty-icon">🎉</span>
        <p>太棒了！所有单词都学完啦</p>
      </div>
      <div v-else-if="activeTab === 'learned' && learnedWords.length === 0" class="empty-state">
        <span class="empty-icon">📝</span>
        <p>还没有标记过已学的单词哦</p>
      </div>
      
      <div v-else class="mobile-vocab-list">
        <div 
          v-for="word in (activeTab === 'unlearned' ? unlearnedWords : learnedWords)" 
          :key="word.id"
          class="mobile-vocab-item"
          @click="showDetail(word)"
        >
          <div class="item-main">
            <div class="word-info">
              <div class="word-text">{{ word.word }}</div>
              <div class="word-phonetic" v-if="word.phonetic">[{{ word.phonetic }}]</div>
            </div>
            <button 
              class="check-btn" 
              :class="{ learned: activeTab === 'learned' }"
              @click.stop="requestToggleLearned(word)"
            >
              <CheckIcon v-if="activeTab === 'unlearned'" size="20" />
              <RotateCcwIcon v-else size="20" />
            </button>
          </div>
          <div class="item-meaning" v-if="expandedMeaningIds.has(word.id)">
            {{ word.meaning }}
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <VocabularyDetailModal 
      :show="!!selectedWord"
      :word="selectedWord || {}"
      :is-learned="isSelectedWordLearned"
      @close="selectedWord = null"
      @toggle-learned="requestToggleLearned"
    />

    <ConfirmModal 
      :show="showConfirm"
      :message="confirmMessage"
      @confirm="executeToggleLearned"
      @cancel="cancelToggleLearned"
    />
  </div>
</template>

<script setup>
import { Check as CheckIcon, RotateCcw as RotateCcwIcon } from '@lucide/vue';
import VocabularyDetailModal from '../VocabularyDetailModal.vue';
import ConfirmModal from '../ConfirmModal.vue';
import { useStudyMode } from '../../../composables/useStudyMode';

const props = defineProps({
  vocabulary: Array,
  language: String,
  level: String,
  userId: [Number, String]
});

const emit = defineEmits(['back']);

const {
  activeTab,
  expandedMeaningIds,
  selectedWord,
  showConfirm,
  learnedWords,
  unlearnedWords,
  isSelectedWordLearned,
  showDetail,
  confirmMessage,
  requestToggleLearned,
  executeToggleLearned,
  cancelToggleLearned
} = useStudyMode(props, emit);
</script>

<style scoped>
.mobile-study-mode {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
}

.mobile-study-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--card-bg);
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
}

.mobile-study-tabs {
  display: flex;
  background: var(--bg-color);
  padding: 4px;
  border-radius: 8px;
}

.mobile-tab-btn {
  flex: 1;
  height: 36px;
  border: none;
  background: none;
  color: var(--secondary-text);
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: 6px;
}

.mobile-tab-btn.active {
  background: var(--card-bg);
  color: var(--accent-color);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.mobile-study-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--secondary-text);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.mobile-vocab-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-vocab-item {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--card-shadow);
}

.item-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.word-info {
  flex: 1;
}

.word-text {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--text-color);
}

.word-phonetic {
  font-size: 0.85rem;
  color: var(--secondary-text);
  margin-top: 2px;
}

.check-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--secondary-text);
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-btn.learned {
  color: var(--accent-color);
  border-color: var(--accent-color);
  background: rgba(var(--accent-rgb), 0.05);
}

.item-meaning {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);
  color: var(--secondary-text);
  font-size: 0.95rem;
}
</style>
