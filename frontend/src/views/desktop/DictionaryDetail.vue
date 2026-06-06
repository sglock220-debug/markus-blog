<template>
  <div class="dictionary-detail container">
    <header v-if="activeMode === 'selection'" class="detail-header">
      <button @click="goBack" class="back-btn">
        <ArrowLeftIcon size="20" />
        返回语言学习
      </button>
      <h1 class="title">{{ dictionaryTitle }} - {{ currentLevel }}</h1>
    </header>

    <!-- Mode Selection -->
    <div v-if="activeMode === 'selection'" class="mode-selection">
      <div class="mode-cards">
        <div class="mode-card" @click="activeMode = 'study'">
          <div class="mode-icon">📖</div>
          <h3>背词模式</h3>
          <p>系统化学习核心词汇</p>
        </div>
        <div class="mode-card disabled" @click="showComingSoon">
          <div class="mode-icon">✍️</div>
          <h3>听写模式</h3>
          <p>功能开发中...</p>
        </div>
        <div class="mode-card disabled" @click="showComingSoon">
          <div class="mode-icon">🔍</div>
          <h3>查询模式</h3>
          <p>功能开发中...</p>
        </div>
      </div>
    </div>

    <!-- Study Mode -->
    <div v-else-if="activeMode === 'study'" class="study-view">
      <header class="detail-header">
        <h1 class="title">{{ dictionaryTitle }} - {{ currentLevel }}</h1>
      </header>
      
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>词汇内容加载中...</p>
      </div>
      <div v-else-if="errorMessage" class="error-state">
        <h3>词汇加载失败</h3>
        <p>{{ errorMessage }}</p>
        <button @click="loadVocabulary" class="back-btn">重新加载</button>
        <button @click="activeMode = 'selection'" class="back-btn" style="margin-top: 10px;">返回模式选择</button>
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
      <div v-else class="error-state">
        <p>暂无词汇数据</p>
        <button @click="activeMode = 'selection'" class="back-btn">返回模式选择</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ArrowLeft as ArrowLeftIcon } from '@lucide/vue';
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
.dictionary-detail {
  padding: 20px;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-color);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--border-color);
  transform: translateX(-4px);
}

.title {
  font-size: 1.5rem;
  color: var(--text-color);
}

.mode-selection {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.mode-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  width: 100%;
  max-width: 900px;
}

.mode-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.mode-card:hover {
  transform: translateY(-10px);
  border-color: var(--accent-color);
  box-shadow: 0 12px 30px rgba(var(--accent-rgb), 0.2);
}

.mode-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mode-card.disabled:hover {
  transform: none;
  border-color: var(--border-color);
  box-shadow: none;
}

.mode-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.mode-card h3 {
  font-size: 1.5rem;
  margin-bottom: 12px;
}

.mode-card p {
  color: var(--secondary-text);
}

.loading-state, .error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
