<template>
  <div class="mobile-dictionary-detail">
    <header v-if="activeMode === 'selection'" class="mobile-detail-header">
      <button @click="goBack" class="mobile-back-btn">
        <ArrowLeftIcon size="20" />
      </button>
      <h1 class="mobile-title">{{ dictionaryTitle }}</h1>
      <div class="level-chip">{{ currentLevel }}</div>
    </header>

    <!-- Mode Selection -->
    <div v-if="activeMode === 'selection'" class="mobile-mode-selection">
      <div class="mobile-mode-list">
        <div class="mobile-mode-item" @click="activeMode = 'study'">
          <div class="item-icon">📖</div>
          <div class="item-info">
            <h3>背词模式</h3>
            <p>系统化学习核心词汇</p>
          </div>
          <ChevronRightIcon size="20" class="arrow" />
        </div>
        
        <div class="mobile-mode-item disabled" @click="showComingSoon">
          <div class="item-icon">✍️</div>
          <div class="item-info">
            <h3>听写模式</h3>
            <p>功能开发中...</p>
          </div>
          <ChevronRightIcon size="20" class="arrow" />
        </div>

        <div class="mobile-mode-item disabled" @click="showComingSoon">
          <div class="item-icon">🔍</div>
          <div class="item-info">
            <h3>查询模式</h3>
            <p>功能开发中...</p>
          </div>
          <ChevronRightIcon size="20" class="arrow" />
        </div>
      </div>
    </div>

    <!-- Study Mode -->
    <div v-else-if="activeMode === 'study'" class="mobile-study-view">
      <div v-if="loading" class="mobile-loading">
        <div class="spinner"></div>
        <p>词汇加载中...</p>
      </div>
      
      <div v-else-if="errorMessage" class="mobile-error">
        <h3>加载失败</h3>
        <p>{{ errorMessage }}</p>
        <button @click="loadVocabulary" class="retry-btn">重新加载</button>
        <button @click="activeMode = 'selection'" class="cancel-btn">返回</button>
      </div>

      <VocabularyStudyMode 
        v-else-if="vocabulary.length"
        :vocabulary="vocabulary"
        :language="langKey"
        :level="currentLevel"
        :title="dictionaryTitle"
        :user-id="userId"
        @back="activeMode = 'selection'"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { 
  ArrowLeft as ArrowLeftIcon, 
  ChevronRight as ChevronRightIcon 
} from '@lucide/vue';
import VocabularyStudyMode from '../../components/study/VocabularyStudyMode.vue';
import { useDictionary } from '../../composables/useDictionary';

const router = useRouter();
const route = useRoute();

const {
  activeMode,
  vocabulary,
  loading,
  errorMessage,
  userId,
  langKey,
  dictionaryTitle,
  currentLevel,
  fetchUserInfo,
  loadVocabulary
} = useDictionary();

const goBack = () => {
  router.push('/study/language');
};

const showComingSoon = () => {
  alert('该功能正在火热开发中，敬请期待！');
};

onMounted(async () => {
  await fetchUserInfo();
  if (route.query.mode === 'study') {
    activeMode.value = 'study';
  }
  if (activeMode.value === 'study') {
    loadVocabulary();
  }
});
</script>

<style scoped>
.mobile-dictionary-detail {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.mobile-detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  margin-bottom: 20px;
}

.mobile-back-btn {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
}

.mobile-title {
  font-size: 1.25rem;
  font-weight: bold;
  flex: 1;
}

.level-chip {
  background: var(--accent-color);
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: bold;
}

.mobile-mode-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mobile-mode-item {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--card-shadow);
}

.mobile-mode-item.disabled {
  opacity: 0.6;
}

.item-icon {
  font-size: 2.5rem;
}

.item-info {
  flex: 1;
}

.item-info h3 {
  font-size: 1.1rem;
  margin-bottom: 4px;
}

.item-info p {
  font-size: 0.85rem;
  color: var(--secondary-text);
}

.arrow {
  color: var(--secondary-text);
}

.mobile-loading, .mobile-error {
  padding: 40px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.retry-btn {
  width: 100%;
  height: 44px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
}

.cancel-btn {
  width: 100%;
  height: 44px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-color);
}
</style>
