import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { vocabularyDb } from '../db/vocabularyDb';
import axios from 'axios';

export function useDictionary() {
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
    const routeLanguage = route.params.language || route.params.lang || route.params.dictionary;
    if (routeLanguage) return String(routeLanguage).toLowerCase();
    const pathParts = route.path.split('/').filter(Boolean);
    return String(pathParts[pathParts.length - 1] || '').toLowerCase();
  });

  const dictionaryTitle = computed(() => langMap[langKey.value] || '词典');
  const currentLevel = computed(() => String(route.query.level || 'A1').toUpperCase());

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get('/api/user/');
      if (response.data && response.data.id) {
        userId.value = response.data.id;
        localStorage.setItem('user_info', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  const loadVocabulary = async () => {
    if (activeMode.value !== 'study') return;
    loading.value = true;
    errorMessage.value = '';
    const language = langKey.value;
    const level = currentLevel.value;

    try {
      if (!language) throw new Error('无法从当前路由识别词典语言');

      const cached = await vocabularyDb.getVocabulary(language, level);
      if (cached && Array.isArray(cached.vocabulary)) {
        vocabulary.value = [...cached.vocabulary].sort((a, b) => Number(a.id) - Number(b.id));
        metadata.value = cached.metadata || {};
        loading.value = false;
      }

      if (navigator.onLine) {
        const filePath = vocabularyFileMap?.[language]?.[level];
        if (!filePath) {
          if (!vocabulary.value.length) throw new Error(`暂未配置 ${language} ${level} 的词汇文件`);
          return;
        }

        const response = await fetch(filePath, { cache: 'no-cache' });
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            if (data && Array.isArray(data.vocabulary)) {
              const sortedVocab = [...data.vocabulary].sort((a, b) => Number(a.id) - Number(b.id));
              await vocabularyDb.saveVocabulary(language, level, {
                vocabulary: sortedVocab,
                metadata: data.metadata || {}
              });
              vocabulary.value = sortedVocab;
              metadata.value = data.metadata || {};
            }
          }
        }
      } else if (!vocabulary.value.length) {
        throw new Error('当前处于离线状态且没有本地缓存，请联网后重试');
      }
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
      if (!vocabulary.value.length) errorMessage.value = error instanceof Error ? error.message : String(error);
    } finally {
      loading.value = false;
    }
  };

  watch(activeMode, (newMode) => {
    if (newMode === 'study') loadVocabulary();
  });

  watch(() => [langKey.value, route.query.level], () => {
    if (activeMode.value === 'study') loadVocabulary();
  });

  return {
    activeMode,
    vocabulary,
    loading,
    errorMessage,
    metadata,
    userId,
    langKey,
    dictionaryTitle,
    currentLevel,
    fetchUserInfo,
    loadVocabulary
  };
}
