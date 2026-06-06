<template>
  <div class="mobile-study-page">
    <header class="mobile-page-header">
      <h1>🌍 语言学习</h1>
      <p class="subtitle">沉浸式语言习得系统</p>
    </header>

    <div class="mobile-dict-list">
      <div 
        v-for="dict in dictionaries" 
        :key="dict.key" 
        class="mobile-dict-card"
        @click="goToDictionary(dict.key)"
      >
        <div class="card-cover-wrapper">
          <img 
            v-if="getDictImagePath(dict.key, selectedLevels[dict.key])"
            :src="getDictImagePath(dict.key, selectedLevels[dict.key])" 
            class="mobile-dict-cover"
            alt="封面"
          />
          <div v-else class="mobile-placeholder">📘</div>
        </div>
        
        <div class="card-info">
          <div class="card-top">
            <h3 class="dict-title">{{ dict.title }}</h3>
            <div class="level-badge">{{ selectedLevels[dict.key] }}</div>
          </div>
          <div class="card-actions" @click.stop>
            <span class="label">当前等级:</span>
            <select v-model="selectedLevels[dict.key]" class="mobile-level-select">
              <option v-for="level in dict.levels" :key="level" :value="level">
                {{ level }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const imageModules = import.meta.glob('../../assets/study/language/dictionary/**/*.png', { 
  eager: true, 
  import: 'default' 
});

const dictionaries = [
  { key: 'english', title: '英语词典', levels: ['A1','A2','B1','B2','C1','C2'] },
  { key: 'german', title: '德语词典', levels: ['A1','A2','B1','B2','C1','C2'] },
  { key: 'japanese', title: '日语词典', levels: ['N5','N4','N3','N2','N1'] },
  { key: 'chinese', title: '中文词典', levels: ['HSK1','HSK2','HSK3','HSK4','HSK5','HSK6+'] }
];

const selectedLevels = reactive({
  english: 'A1',
  german: 'A1',
  japanese: 'N5',
  chinese: 'HSK1'
});

const getDictImagePath = (key, level) => {
  const path = `../../assets/study/language/dictionary/${key}/${level}.png`;
  return imageModules[path] || '';
};

const goToDictionary = (key) => {
  const level = selectedLevels[key];
  router.push({
    path: `/study/language/dictionary/${key}`,
    query: { level }
  });
};
</script>

<style scoped>
.mobile-study-page {
  padding: 16px;
}

.mobile-page-header {
  margin-bottom: 24px;
}

.mobile-page-header h1 {
  font-size: 1.8rem;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 0.9rem;
  color: var(--secondary-text);
}

.mobile-dict-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mobile-dict-card {
  display: flex;
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  box-shadow: var(--card-shadow);
  height: 120px;
}

.card-cover-wrapper {
  width: 90px;
  background: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-dict-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mobile-placeholder {
  font-size: 2rem;
}

.card-info {
  flex: 1;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.dict-title {
  font-size: 1.1rem;
  font-weight: bold;
}

.level-badge {
  background: var(--accent-color);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 0.85rem;
  color: var(--secondary-text);
}

.mobile-level-select {
  flex: 1;
  height: 36px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-color);
  padding: 0 8px;
  font-size: 0.9rem;
}
</style>
