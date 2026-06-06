<template>
  <div v-if="article" class="container">
    <article class="post-detail">
      <header class="post-header">
        <h1 class="post-title">{{ article.title }}</h1>
        <div class="post-meta">
          <span>{{ article.author.username }}</span> • 
          <span>{{ formatDate(article.created_at) }}</span> • 
          <span>{{ article.category?.name || '默认分类' }}</span>
        </div>
      </header>
      
      <div class="post-content" v-html="formatContent(article.content)">
      </div>
    </article>
  </div>
  <div v-else-if="loading" class="container" style="text-align:center; padding:100px;">
    加载中...
  </div>
  <div v-else class="container error-page">
    <div class="error-code">404</div>
    <div class="error-msg">文章未找到</div>
    <router-link to="/" class="category-btn active">返回首页</router-link>
  </div>
</template>

<script setup>
import { usePostDetail } from '../../composables/usePostDetail';

const { article, loading, formatDate, formatContent } = usePostDetail();
</script>

<style scoped> 
.post-detail { 
  background: var(--card-bg); 
  padding: 40px; 
  border-radius: 12px; 
  box-shadow: var(--card-shadow); 
  margin: 40px 0; 
} 
 
.post-header { 
  margin-bottom: 30px; 
  padding-bottom: 20px; 
  border-bottom: 1px solid var(--border-color); 
} 
 
.post-title { 
  font-size: 2.5rem; 
  margin-bottom: 10px; 
  color: var(--text-color); 
} 
 
.post-meta { 
  color: var(--secondary-text); 
  font-size: 0.9rem; 
} 
 
.post-content { 
  font-size: 1.1rem; 
  line-height: 1.8; 
  color: var(--text-color); 
} 
 
.error-page { 
  text-align: center; 
  padding: 100px 0; 
} 
 
.error-code { 
  font-size: 6rem; 
  font-weight: bold; 
  color: var(--accent-color); 
} 
 
.error-msg { 
  font-size: 1.5rem; 
  margin-bottom: 30px; 
} 
</style>
