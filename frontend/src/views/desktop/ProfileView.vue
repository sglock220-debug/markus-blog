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
import { Mail as MailIcon, Calendar as CalendarIcon } from '@lucide/vue';
import { useProfile } from '../../composables/useProfile';

const { user, articles, formatDate } = useProfile();
</script>

<style scoped> 
.profile-container { 
  width: 100%; 
  max-width: 1180px; 
  margin: 0 auto; 
  padding: 48px 32px 80px; 
  box-sizing: border-box; 
} 
 
.profile-header-card { 
  width: 100%; 
  max-width: 900px; 
  margin: 0 auto; 
  padding: 64px 72px; 
 
  display: flex; 
  align-items: center; 
  gap: 48px; 
 
  background: #fff; 
  border-radius: 20px; 
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06); 
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
  margin: 0 0 14px; 
  font-size: 32px; 
  font-weight: 700; 
  color: #222; 
  line-height: 1.2; 
} 
 
.profile-email { 
  display: flex; 
  align-items: center; 
  gap: 6px; 
  margin: 0 0 28px; 
  color: #555; 
  font-size: 16px; 
  word-break: break-all; 
} 
 
.profile-stats { 
  display: flex; 
  align-items: center; 
  gap: 42px; 
} 
 
.stat-item { 
  display: flex; 
  flex-direction: column; 
  align-items: flex-start; 
} 
 
.stat-value { 
  font-size: 24px; 
  font-weight: 700; 
  color: #222; 
  line-height: 1.2; 
} 
 
.stat-label { 
  margin-top: 6px; 
  font-size: 15px; 
  color: #666; 
} 
 
.profile-content { 
  width: 100%; 
  max-width: 900px; 
  margin: 56px auto 0; 
} 
 
.section-title { 
  margin: 0 0 56px; 
  font-size: 30px; 
  font-weight: 700; 
  color: #222; 
} 
 
.post-list { 
  width: 100%; 
} 
 
.empty-msg { 
  text-align: center; 
  color: #666; 
  font-size: 18px; 
  margin-top: 72px; 
}

.post-card {
  display: block;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
  text-decoration: none;
  border: 1px solid #eee;
  transition: all 0.2s;
}

.post-card:hover {
  border-color: #4a90e2;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.post-card-title {
  margin: 0 0 12px;
  font-size: 20px;
  color: #333;
}

.post-card-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #888;
}
</style>
