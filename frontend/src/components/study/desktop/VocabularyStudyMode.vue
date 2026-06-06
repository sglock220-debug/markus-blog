<template>
  <div class="study-mode">
    <div class="study-container">
      <!-- Back to selection button -->
      <button class="mode-back-btn" @click="$emit('back')" title="返回模式选择">
        <ArrowLeftIcon size="20" />
      </button>

      <!-- Tabs -->
      <div class="study-tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'unlearned' }]" 
          @click="activeTab = 'unlearned'"
        >
          未学 <span class="count">{{ unlearnedWords.length }}</span>
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'learned' }]" 
          @click="activeTab = 'learned'"
        >
          已学 <span class="count">{{ learnedWords.length }}</span>
        </button>
      </div>

      <!-- List Area -->
      <div class="study-content">
        <VocabularyList 
          v-if="activeTab === 'unlearned'"
          :words="unlearnedWords"
          :expanded-ids="expandedMeaningIds"
          :is-learned-list="false"
          @toggle-meaning="toggleMeaning"
          @show-detail="showDetail"
          @toggle-learned="requestToggleLearned"
        />
        <VocabularyList 
          v-else
          :words="learnedWords"
          :expanded-ids="expandedMeaningIds"
          :is-learned-list="true"
          @toggle-meaning="toggleMeaning"
          @show-detail="showDetail"
          @toggle-learned="requestToggleLearned"
        />
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
import { ArrowLeft as ArrowLeftIcon } from '@lucide/vue';
import VocabularyList from '../VocabularyList.vue';
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
  toggleMeaning,
  showDetail,
  confirmMessage,
  requestToggleLearned,
  executeToggleLearned,
  cancelToggleLearned
} = useStudyMode(props, emit);
</script>

<style scoped>
.study-mode {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
}

.study-container {
  width: 100%;
  max-width: 800px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  position: relative;
  height: calc(100vh - 250px);
  min-height: 500px;
  box-shadow: var(--card-shadow);
}

.mode-back-btn {
  position: absolute;
  left: -50px;
  top: 0;
  width: 40px;
  height: 40px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: var(--text-color);
  transition: all 0.2s;
}

.mode-back-btn:hover {
  background: var(--border-color);
  transform: translateX(-4px);
}

.study-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  background: rgba(var(--accent-rgb), 0.02);
  border-radius: 16px 16px 0 0;
}

.tab-btn {
  flex: 1;
  padding: 16px;
  border: none;
  background: transparent;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--secondary-text);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.tab-btn.active {
  color: var(--accent-color);
  background: var(--card-bg);
  position: relative;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent-color);
}

.count {
  font-size: 0.85rem;
  background: var(--bg-color);
  color: var(--secondary-text);
  padding: 2px 8px;
  border-radius: 10px;
  min-width: 30px;
  text-align: center;
}

.tab-btn.active .count {
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent-color);
}

.study-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
