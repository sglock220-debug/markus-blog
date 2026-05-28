<template>
  <div v-if="user" class="container profile-container">
    <div class="profile-header-card">
      <div class="profile-avatar">
        {{ user.username.slice(0, 1).toUpperCase() }}
      </div>
      <div class="profile-info">
        <h1 class="profile-username">{{ user.username }}</h1>
        <p class="profile-email"><MailIcon style="width:16px;height:16px;" /> {{ user.email }}</p>
        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-value">{{ articles.length }}</span>
            <span class="stat-label">文章</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ formatDate(user.date_joined) }}</span>
            <span class="stat-label">注册时间</span>
          </div>
        </div>
      </div>
    </div>

    <div class="profile-content">
      <h2 class="section-title">我的文章</h2>
      <div class="post-list">
        <router-link 
          v-for="article in articles" 
          :key="article.id"
          :to="{ name: 'post-detail', params: { slug: article.slug } }" 
          class="post-card"
        >
          <div class="post-card-content">
            <h3 class="post-card-title">{{ article.title }}</h3>
            <div class="post-card-meta">
              <span><CalendarIcon style="width:14px;height:14px;vertical-align:middle;margin-right:4px;" /> {{ formatDate(article.created_at) }}</span>
              <span>{{ article.category?.name || '默认分类' }}</span>
            </div>
          </div>
        </router-link>
        <p v-if="articles.length === 0" class="empty-msg">你还没有发布过文章</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Mail as MailIcon, Calendar as CalendarIcon } from '@lucide/vue';
import api from '../api';

const user = ref(null);
const articles = ref([]);

const fetchProfile = async () => {
  try {
    const userRes = await api.get('/user/');
    user.value = userRes.data;
    
    // In a real app, you might have a specific endpoint for user articles
    // For now we filter all articles
    const articlesRes = await api.get('/articles/');
    articles.value = articlesRes.data.filter(a => a.author.username === user.value.username);
  } catch (err) {
    console.error('Failed to fetch profile', err);
  }
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN');
};

onMounted(() => {
  fetchProfile();
});
</script>

<style scoped> 
.profile-container { 
  padding-top: 48px; 
} 
 
.profile-header-card { 
  display: flex; 
  align-items: center; 
  gap: 40px; 
  width: 100%; 
  box-sizing: border-box; 
} 
 
.profile-avatar { 
  width: 130px !important; 
  height: 130px !important; 
  min-width: 130px !important; 
  min-height: 130px !important; 
  max-width: 130px !important; 
  max-height: 130px !important; 
 
  flex: 0 0 130px !important; 
  flex-shrink: 0 !important; 
  aspect-ratio: 1 / 1 !important; 
  box-sizing: border-box; 
 
  border-radius: 50%; 
  overflow: hidden; 
 
  display: flex; 
  align-items: center; 
  justify-content: center; 
 
  background: #4a90e2; 
  color: #fff; 
  font-size: 64px; 
  font-weight: 700; 
  line-height: 1; 
  text-align: center; 
} 
 
.profile-info { 
  min-width: 0; 
  flex: 1; 
} 
 
.profile-username { 
  margin: 0 0 12px; 
} 
 
.profile-email { 
  display: flex; 
  align-items: center; 
  gap: 6px; 
  word-break: break-all; 
} 
 
.profile-stats { 
  display: flex; 
  align-items: center; 
  gap: 32px; 
} 
 
.stat-item { 
  display: flex; 
  flex-direction: column; 
  align-items: flex-start; 
} 
 
@media (max-width: 768px) { 
  .profile-container { 
    padding-top: 32px; 
  } 
 
  .profile-header-card { 
    display: flex; 
    align-items: center; 
    gap: 24px; 
    padding: 32px 24px; 
  } 
 
  .profile-avatar { 
    width: 96px !important; 
    height: 96px !important; 
    min-width: 96px !important; 
    min-height: 96px !important; 
    max-width: 96px !important; 
    max-height: 96px !important; 
 
    flex: 0 0 96px !important; 
    flex-shrink: 0 !important; 
    aspect-ratio: 1 / 1 !important; 
 
    font-size: 48px; 
  } 
 
  .profile-info { 
    min-width: 0; 
    flex: 1; 
  } 
 
  .profile-email { 
    word-break: break-all; 
  } 
} 
 
@media (max-width: 480px) { 
  .profile-header-card { 
    flex-direction: column; 
    text-align: center; 
    align-items: center; 
    gap: 20px; 
  } 
 
  .profile-info { 
    width: 100%; 
  } 
 
  .profile-email { 
    justify-content: center; 
  } 
 
  .profile-stats { 
    justify-content: center; 
  } 
 
  .stat-item { 
    align-items: center; 
  } 
} 
</style>
