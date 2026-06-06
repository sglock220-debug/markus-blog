<template>
  <div class="study-page container">
    <header class="page-header">
      <h1>🌍 语言学习</h1>
      <p class="subtitle">沉浸式语言习得系统</p>
    </header>

    <!-- Dictionary Cards Section -->
    <div class="dictionary-grid">
      <div 
        v-for="dict in dictionaries" 
        :key="dict.key" 
        class="dict-card"
      >
        <div class="dict-card-header">
          <span class="dict-title">{{ dict.title }}</span>
          <select v-model="selectedLevels[dict.key]" class="level-select">
            <option v-for="level in dict.levels" :key="level" :value="level">
              {{ level }}
            </option>
          </select>
        </div>
        
        <div class="dict-card-body" @click="goToDictionary(dict.key)">
          <div class="dict-image-container">
            <img 
              v-if="getDictImagePath(dict.key, selectedLevels[dict.key])"
              :src="getDictImagePath(dict.key, selectedLevels[dict.key])" 
              class="dict-cover"
              alt="词典封面"
            />
            <div class="image-overlay">
              <span class="placeholder-icon">📘</span>
              <span class="placeholder-text">点击进入</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
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

// Initialize default levels
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
.study-page {
  padding: 20px;
  min-height: 80vh;
}

.page-header {
  margin-bottom: 30px;
  border-left: 4px solid var(--accent-color);
  padding-left: 20px;
}

.page-header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  color: var(--text-color);
}

.subtitle {
  color: var(--secondary-text);
  font-size: 1.1rem;
}

/* Dictionary Grid Styles */
.dictionary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.dict-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--card-shadow);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.dict-card:hover {
  transform: translateY(-5px);
  border-color: var(--accent-color);
  box-shadow: 0 8px 24px rgba(var(--accent-rgb), 0.15);
}

.dict-card-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.dict-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-color);
}

.level-select {
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-color);
  font-size: 0.85rem;
  outline: none;
  cursor: pointer;
}

.dict-card-body {
  padding: 20px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(var(--accent-rgb), 0.02);
}

.dict-image-container {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  background: var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.dict-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 2;
}

.image-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  background: var(--border-color);
  color: var(--secondary-text);
  z-index: 1;
}

.placeholder-icon {
  font-size: 2.5rem;
}

.placeholder-text {
  font-size: 0.85rem;
  font-weight: 600;
}

.dict-card-body:hover .placeholder-text {
  color: var(--accent-color);
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .dictionary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .dictionary-grid {
    grid-template-columns: 1fr;
  }
  
  .dict-image-container {
    max-width: 200px;
    margin: 0 auto;
  }
}
</style>
