import { ref, computed, onMounted, watch } from 'vue';
import { vocabularyProgressService } from '../services/vocabularyProgressService';

export function useStudyMode(props, emit) {
  const activeTab = ref('unlearned');
  const learnedIds = ref([]);
  const expandedMeaningIds = ref(new Set());
  const selectedWord = ref(null);
  const showConfirm = ref(false);
  const confirmActionWord = ref(null);

  const loadProgress = async () => {
    if (!props.userId) return;
    try {
      await vocabularyProgressService.migrateFromLocalStorage(props.userId);
      const progressMap = await vocabularyProgressService.getProgress(
        props.userId, 
        props.language, 
        props.level
      );
      learnedIds.value = Object.keys(progressMap)
        .filter(id => progressMap[id])
        .map(id => parseInt(id));
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  onMounted(() => {
    loadProgress();
  });

  watch(() => props.userId, (newUserId) => {
    if (newUserId) loadProgress();
    else learnedIds.value = [];
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
    if (expandedMeaningIds.value.has(id)) expandedMeaningIds.value.delete(id);
    else expandedMeaningIds.value.add(id);
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
      if (newLearnedState) learnedIds.value.push(word.id);
      else {
        const index = learnedIds.value.indexOf(word.id);
        if (index > -1) learnedIds.value.splice(index, 1);
      }
      
      await vocabularyProgressService.saveWordProgress(
        props.userId, props.language, props.level, word.id, newLearnedState
      );
      
      showConfirm.value = false;
      confirmActionWord.value = null;
      selectedWord.value = null;
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const cancelToggleLearned = () => {
    showConfirm.value = false;
    confirmActionWord.value = null;
  };

  return {
    activeTab,
    learnedIds,
    expandedMeaningIds,
    selectedWord,
    showConfirm,
    confirmActionWord,
    learnedWords,
    unlearnedWords,
    isSelectedWordLearned,
    toggleMeaning,
    showDetail,
    confirmMessage,
    requestToggleLearned,
    executeToggleLearned,
    cancelToggleLearned
  };
}
