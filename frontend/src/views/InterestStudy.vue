<template>
  <div class="study-page container">
    <header class="page-header">
      <h1>🎯 兴趣学习</h1>
      <p class="subtitle">探索多元世界的无限可能</p>
    </header>
    
    <div class="placeholder-content">
      <div class="empty-state">
        <div class="icon">🎨</div>
        <h3>正在建设中...</h3>
        <p>个人爱好记录、灵感收集与跨领域学习空间。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
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

.placeholder-content {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 60px 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-state {
  text-align: center;
}

.empty-state .icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin-bottom: 10px;
  color: var(--text-color);
}

.empty-state p {
  color: var(--secondary-text);
}
</style>
