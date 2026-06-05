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
import { ref, computed, onMounted, watch } from 'vue';
import { ArrowLeft as ArrowLeftIcon } from '@lucide/vue';
import VocabularyList from './VocabularyList.vue';
import VocabularyDetailModal from './VocabularyDetailModal.vue';
import ConfirmModal from './ConfirmModal.vue';
import { vocabularyProgressService } from '../../services/vocabularyProgressService';

const props = defineProps({
  vocabulary: {
    type: Array,
    required: true
  },
  language: String,
  level: String,
  userId: [Number, String]
});

const emit = defineEmits(['back']);

const activeTab = ref('unlearned');
const learnedIds = ref([]);
const expandedMeaningIds = ref(new Set());
const selectedWord = ref(null);
const showConfirm = ref(false);
const confirmActionWord = ref(null);

// Load progress using the new service
const loadProgress = async () => {
  if (!props.userId) {
    console.warn('User not logged in, progress will not be saved/synced');
    return;
  }
  
  try {
    // 1. Migrate if needed
    await vocabularyProgressService.migrateFromLocalStorage(props.userId);
    
    // 2. Load progress (IndexedDB first, then background sync)
    const progressMap = await vocabularyProgressService.getProgress(
      props.userId, 
      props.language, 
      props.level
    );
    
    // Convert map to IDs array for the UI
    learnedIds.value = Object.keys(progressMap)
      .filter(id => progressMap[id])
      .map(id => parseInt(id));
      
    console.log(`Loaded ${learnedIds.value.length} learned words`);
  } catch (error) {
    console.error('Failed to load progress:', error);
  }
};

onMounted(() => {
  loadProgress();
});

// Watch for userId changes (e.g. login/logout)
watch(() => props.userId, (newUserId) => {
  if (newUserId) {
    loadProgress();
  } else {
    learnedIds.value = [];
  }
});

const learnedWords = computed(() => 
  props.vocabulary
    .filter(word => learnedIds.value.includes(word.id))
    .sort((a, b) => a.id - b.id)
);

const unlearnedWords = computed(() => 
  props.vocabulary
    .filter(word => !learnedIds.value.includes(word.id))
    .sort((a, b) => a.id - b.id)
);

const isSelectedWordLearned = computed(() => {
  if (!selectedWord.value) return false;
  return learnedIds.value.includes(selectedWord.value.id);
});

const toggleMeaning = (id) => {
  if (expandedMeaningIds.value.has(id)) {
    expandedMeaningIds.value.delete(id);
  } else {
    expandedMeaningIds.value.add(id);
  }
};

const showDetail = (word) => {
  selectedWord.value = word;
};

const confirmMessage = computed(() => {
  if (!confirmActionWord.value) return '';
  const isCurrentlyLearned = learnedIds.value.includes(confirmActionWord.value.id);
  return isCurrentlyLearned 
    ? `你确定还没有学会“${confirmActionWord.value.word}”吗？`
    : `你确定已经学会“${confirmActionWord.value.word}”吗？`;
});

const requestToggleLearned = (word) => {
  if (!props.userId) {
    alert('请先登录以保存学习进度');
    return;
  }
  confirmActionWord.value = word;
  showConfirm.value = true;
};

const executeToggleLearned = async () => {
  if (!confirmActionWord.value || !props.userId) return;
  
  const word = confirmActionWord.value;
  const isCurrentlyLearned = learnedIds.value.includes(word.id);
  const newLearnedState = !isCurrentlyLearned;
  
  try {
    // 1. Update UI immediately (Optimistic UI)
    if (newLearnedState) {
      learnedIds.value.push(word.id);
    } else {
      const index = learnedIds.value.indexOf(word.id);
      if (index > -1) learnedIds.value.splice(index, 1);
    }
    
    // 2. Save using service (IndexedDB + background sync)
    await vocabularyProgressService.saveWordProgress(
      props.userId,
      props.language,
      props.level,
      word.id,
      newLearnedState
    );
    
    showConfirm.value = false;
    confirmActionWord.value = null;
    selectedWord.value = null; // Close detail modal if it was open
  } catch (error) {
    console.error('Failed to save progress:', error);
    // In case of critical error, we might want to revert UI, 
    // but the local-first architecture should handle most cases.
  }
};

const cancelToggleLearned = () => {
  showConfirm.value = false;
  confirmActionWord.value = null;
};
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

.tab-btn .count {
  font-size: 0.9rem;
  background: var(--border-color);
  color: var(--secondary-text);
  padding: 2px 8px;
  border-radius: 10px;
}

.tab-btn.active .count {
  background: var(--accent-color);
  color: white;
}

.study-content {
  flex: 1;
  overflow: hidden;
}

@media (max-width: 900px) {
  .mode-back-btn {
    position: static;
    margin-bottom: 10px;
    align-self: flex-start;
  }
}
</style>
