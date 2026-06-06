<template>
  <div class="mobile-placeholder-view">
    <div class="placeholder-card">
      <div class="placeholder-icon">{{ icon }}</div>
      <h1>{{ title }}</h1>
      <p>手机端版本正在精心设计中</p>
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <button @click="$router.back()" class="m-back-btn">返回上一页</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  icon: String
});
</script>

<style scoped>
.mobile-placeholder-view {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.placeholder-card {
  background: var(--card-bg);
  border-radius: 24px;
  padding: 40px 24px;
  text-align: center;
  width: 100%;
  border: 1px solid var(--border-color);
  box-shadow: var(--card-shadow);
}

.placeholder-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.placeholder-card h1 {
  font-size: 1.5rem;
  margin-bottom: 12px;
}

.placeholder-card p {
  color: var(--secondary-text);
  margin-bottom: 24px;
}

.progress-bar {
  height: 6px;
  background: var(--bg-color);
  border-radius: 3px;
  margin-bottom: 32px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  width: 60%;
  background: var(--accent-color);
  border-radius: 3px;
  animation: pulse 2s infinite ease-in-out;
}

.m-back-btn {
  width: 100%;
  height: 48px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 24px;
  font-weight: bold;
}

@keyframes pulse {
  0% { opacity: 0.6; width: 40%; }
  50% { opacity: 1; width: 70%; }
  100% { opacity: 0.6; width: 40%; }
}
</style>
