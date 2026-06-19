<template>
  <div v-if="article" class="mobile-post">
    <article class="m-post-content">
      <header class="m-post-header">
        <h1 class="m-post-title">{{ article.title }}</h1>
        <div class="m-post-meta">
          <router-link :to="'/u/' + article.author_public_id" class="m-author">{{ article.author_name }}</router-link>
          <span class="m-dot">•</span>
          <span class="m-date">{{ formatDate(article.created_at) }}</span>
        </div>
        <div class="m-post-category" v-if="article.category_name">
          {{ article.category_name }}
        </div>
      </header>
      
      <div class="m-body-content" v-html="formatContent(article.content)"></div>
    </article>
    
    <div class="m-post-footer">
      <button @click="$router.back()" class="m-back-link">返回上一页</button>
    </div>
  </div>

  <div v-else-if="loading" class="m-loading-view">
    <div class="m-spinner"></div>
    <p>正在加载文章...</p>
  </div>

  <div v-else class="m-error-view">
    <h1>404</h1>
    <p>抱歉，文章已流失在赛博空间</p>
    <router-link to="/" class="m-home-link">返回首页</router-link>
  </div>
</template>

<script setup>
import { usePostDetail } from '../../composables/usePostDetail';

const { article, loading, formatDate, formatContent } = usePostDetail();
</script>

<style scoped>
.mobile-post {
  background: var(--bg-color);
  min-height: 100%;
}

.m-post-content {
  padding: 24px 16px;
  background: var(--card-bg);
}

.m-post-header {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.m-post-title {
  font-size: 1.75rem;
  line-height: 1.3;
  margin-bottom: 12px;
  font-weight: 800;
}

.m-post-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--secondary-text);
  margin-bottom: 12px;
}

.m-author {
  color: var(--accent-color);
  text-decoration: none;
  font-weight: 700;
}

.m-post-category {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent-color);
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
}

.m-body-content {
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--text-color);
  word-break: break-word;
}

.m-post-footer {
  padding: 32px 16px;
}

.m-back-link {
  width: 100%;
  height: 48px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: 24px;
  color: var(--text-color);
  font-weight: 600;
}

.m-loading-view, .m-error-view {
  padding: 100px 20px;
  text-align: center;
}

.m-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: m-spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes m-spin { to { transform: rotate(360deg); } }

.m-home-link {
  display: inline-block;
  margin-top: 20px;
  color: var(--accent-color);
  text-decoration: underline;
}
</style>
