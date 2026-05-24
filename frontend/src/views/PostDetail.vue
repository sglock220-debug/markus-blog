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
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api';

const route = useRoute();
const article = ref(null);
const loading = ref(true);

const fetchArticle = async () => {
  try {
    const res = await api.get(`/articles/${route.params.slug}/`);
    article.value = res.data;
  } catch (err) {
    console.error('Failed to fetch article', err);
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN');
};

const formatContent = (content) => {
  // Basic newline to br conversion for demo
  return content.replace(/\n/g, '<br>');
};

onMounted(() => {
  fetchArticle();
});
</script>
