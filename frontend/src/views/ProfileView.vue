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
import { Mail as MailIcon, Calendar as CalendarIcon } from 'lucide-vue-next';
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
