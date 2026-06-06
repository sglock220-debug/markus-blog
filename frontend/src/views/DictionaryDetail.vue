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
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft as ArrowLeftIcon } from '@lucide/vue';
import VocabularyStudyMode from '../components/study/VocabularyStudyMode.vue';
import { vocabularyDb } from '../db/vocabularyDb';
import axios from 'axios';

const route = useRoute();
const router = useRouter();

const activeMode = ref('selection');
const vocabulary = ref([]);
const loading = ref(false);
const errorMessage = ref('');
const metadata = ref({});
const userId = ref(null);

const vocabularyFileMap = {
  german: {
    A1: '/a1_vocabulary_new_1500.json',
    A2: '/a2_vocabulary_new_1500.json',
    B1: '/b1_vocabulary_new_2000.json',
    B2: '/b2_vocabulary_new_3000.json',
    C1: '/c1_vocabulary_new_3000.json'
  }
};

const langMap = {
  english: '英语词典',
  german: '德语词典',
  japanese: '日语词典',
  chinese: '中文词典'
};

const langKey = computed(() => {
  const routeLanguage = 
    route.params.language || 
    route.params.lang || 
    route.params.dictionary;

  if (routeLanguage) {
    return String(routeLanguage).toLowerCase();
  }

  const pathParts = route.path.split('/').filter(Boolean);
  return String(pathParts[pathParts.length - 1] || '').toLowerCase();
});

const dictionaryTitle = computed(() => langMap[langKey.value] || '词典');
const currentLevel = computed(() => String(route.query.level || 'A1').toUpperCase());

const goBack = () => {
  router.push('/study/language');
};

const showComingSoon = () => {
  alert('该功能正在火热开发中，敬请期待！');
};

const fetchUserInfo = async () => {
  try {
    const response = await axios.get('/api/user/');
    if (response.data && response.data.id) {
      userId.value = response.data.id;
      // Save to localStorage for sync service fallback
      localStorage.setItem('user_info', JSON.stringify(response.data));
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    // If not logged in, we might want to redirect to login
    // but for now we just allow offline mode if data exists
  }
};

const loadVocabulary = async () => {
  if (activeMode.value !== 'study') return;
  
  loading.value = true;
  errorMessage.value = '';
  
  const language = langKey.value;
  const level = currentLevel.value;

  try {
    if (!language) {
      throw new Error('无法从当前路由识别词典语言');
    }

    // 1. Try to load from IndexedDB first (Offline-first)
    const cached = await vocabularyDb.getVocabulary(language, level);
    if (cached && Array.isArray(cached.vocabulary)) {
      console.log('Loaded vocabulary from IndexedDB');
      vocabulary.value = [...cached.vocabulary].sort((a, b) => Number(a.id) - Number(b.id));
      metadata.value = cached.metadata || {};
      
      // If we have cached data, we can stop loading state early
      loading.value = false;
    }

    // 2. If online, fetch latest from server
    if (navigator.onLine) {
      const filePath = vocabularyFileMap?.[language]?.[level];
      if (!filePath) {
        if (!vocabulary.value.length) {
          throw new Error(`暂未配置 ${language} ${level} 的词汇文件`);
        }
        return;
      }

      console.log('Fetching latest vocabulary from:', filePath);
      const response = await fetch(filePath, { cache: 'no-cache' });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          if (data && Array.isArray(data.vocabulary)) {
            const sortedVocab = [...data.vocabulary].sort((a, b) => Number(a.id) - Number(b.id));
            
            // Update IndexedDB cache
            await vocabularyDb.saveVocabulary(language, level, {
              vocabulary: sortedVocab,
              metadata: data.metadata || {}
            });

            // Update reactive state
            vocabulary.value = sortedVocab;
            metadata.value = data.metadata || {};
            console.log('Updated vocabulary from server and cached');
          }
        }
      }
    } else if (!vocabulary.value.length) {
      throw new Error('当前处于离线状态且没有本地缓存，请联网后重试');
    }
  } catch (error) {
    console.error('Failed to load vocabulary:', error);
    if (!vocabulary.value.length) {
      errorMessage.value = error instanceof Error ? error.message : String(error);
    }
  } finally {
    loading.value = false;
  }
};

watch(activeMode, (newMode) => {
  if (newMode === 'study') {
    loadVocabulary();
  }
});

watch(
  () => [langKey.value, route.query.level],
  () => {
    if (activeMode.value === 'study') {
      loadVocabulary();
    }
  }
);

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

/* Mode Selection */
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
  box-shadow: var(--card-shadow);
}

.mode-card:hover:not(.disabled) {
  transform: translateY(-10px);
  border-color: var(--accent-color);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
}

.mode-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mode-icon {
  font-size: 3.5rem;
  margin-bottom: 20px;
}

.mode-card h3 {
  font-size: 1.5rem;
  margin-bottom: 12px;
  color: var(--text-color);
}

.mode-card p {
  color: var(--secondary-text);
}

/* Study View */
.study-view {
  flex: 1;
  display: flex;
  flex-direction: column;
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
  border: 4px solid rgba(var(--accent-rgb), 0.1);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state p {
  color: #ff4d4f;
  font-weight: 600;
}

@media (max-width: 768px) {
  .mode-cards {
    grid-template-columns: 1fr;
  }
}
</style>
