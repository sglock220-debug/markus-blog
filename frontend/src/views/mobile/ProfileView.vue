<template>
  <div v-if="user" class="mobile-profile">
    <div class="mobile-profile-header">
      <div class="profile-main-info">
        <div class="mobile-avatar">
          {{ user.username.slice(0, 1).toUpperCase() }}
        </div>
        <div class="text-info">
          <h1 class="mobile-username">{{ user.username }}</h1>
          <p class="mobile-email"><MailIcon size="14" /> {{ user.email }}</p>
        </div>
      </div>
      
      <div class="mobile-stats-row">
        <div class="stat-card">
          <span class="stat-val">{{ articles.length }}</span>
          <span class="stat-lab">文章</span>
        </div>
        <div class="stat-card">
          <span class="stat-val">{{ formatDate(user.date_joined) }}</span>
          <span class="stat-lab">注册日期</span>
        </div>
      </div>
    </div>

    <div class="mobile-profile-content">
      <h2 class="section-title">我的发布</h2>
      <div class="mobile-post-list">
        <router-link 
          v-for="article in articles" 
          :key="article.id"
          :to="{ name: 'post-detail', params: { slug: article.slug } }" 
          class="mobile-post-card"
        >
          <h3 class="post-title">{{ article.title }}</h3>
          <div class="post-meta">
            <span class="date">{{ formatDate(article.created_at) }}</span>
            <span class="category">{{ article.category?.name || '默认' }}</span>
          </div>
        </router-link>
        <div v-if="articles.length === 0" class="mobile-empty">
          暂无文章发布
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Mail as MailIcon } from '@lucide/vue';
import { useProfile } from '../../composables/useProfile';

const { user, articles, formatDate } = useProfile();
</script>

<style scoped>
.mobile-profile {
  padding-bottom: 40px;
}

.mobile-profile-header {
  background: var(--card-bg);
  padding: 24px 16px;
  border-radius: 0 0 24px 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  margin-bottom: 24px;
}

.profile-main-info {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.mobile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--accent-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
}

.mobile-username {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 4px;
}

.mobile-email {
  font-size: 0.9rem;
  color: var(--secondary-text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.mobile-stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-card {
  background: var(--bg-color);
  padding: 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid var(--border-color);
}

.stat-val {
  font-size: 1.25rem;
  font-weight: bold;
}

.stat-lab {
  font-size: 0.8rem;
  color: var(--secondary-text);
  margin-top: 4px;
}

.mobile-profile-content {
  padding: 0 16px;
}

.section-title {
  font-size: 1.1rem;
  margin-bottom: 16px;
  padding-left: 8px;
  border-left: 4px solid var(--accent-color);
}

.mobile-post-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-post-card {
  background: var(--card-bg);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  text-decoration: none;
  color: inherit;
}

.post-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 8px;
  line-height: 1.4;
}

.post-meta {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--secondary-text);
}

.mobile-empty {
  text-align: center;
  padding: 40px;
  color: var(--secondary-text);
}
</style>
