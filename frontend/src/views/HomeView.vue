<template>
  <div class="home">
    <section class="banner" :style="{ backgroundImage: `url('/static/images/banner.jpg')` }">
      <h1 class="banner-title">刚刚，重磅消息</h1>
    </section>

    <div class="container">
      <nav class="category-filter">
        <a 
          @click="selectCategory(null)" 
          :class="['category-btn', { active: !selectedCategory }]"
        >全部</a>
        <a 
          v-for="cat in categories" 
          :key="cat.id"
          @click="selectCategory(cat.slug)"
          :class="['category-btn', { active: selectedCategory === cat.slug }]"
        >{{ cat.name }}</a>
      </nav>

      <div class="post-list">
        <router-link 
          v-for="article in articles" 
          :key="article.id"
          :to="{ name: 'post-detail', params: { slug: article.slug } }" 
          class="post-card"
        >
          <div class="post-card-content">
            <h2 class="post-card-title">{{ article.title }}</h2>
            <div class="post-card-meta">
              <span><UserIcon style="width:14px;height:14px;vertical-align:middle;margin-right:4px;" />{{ article.author.username }}</span>
              <span><CalendarIcon style="width:14px;height:14px;vertical-align:middle;margin-right:4px;" />{{ formatDate(article.created_at) }}</span>
            </div>
          </div>
        </router-link>
        <div v-if="articles.length === 0" class="empty-msg">暂无文章</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { User as UserIcon, Calendar as CalendarIcon } from 'lucide-vue-next';
import api from '../api';

const route = useRoute();
const articles = ref([]);
const categories = ref([]);
const selectedCategory = ref(null);

const fetchArticles = async () => {
  try {
    const params = {};
    if (selectedCategory.value) params.category = selectedCategory.value;
    if (route.query.q) params.q = route.query.q;
    
    const res = await api.get('/articles/', { params });
    articles.value = res.data;
  } catch (err) {
    console.error('Failed to fetch articles', err);
  }
};

const fetchCategories = async () => {
  try {
    const res = await api.get('/categories/');
    categories.value = res.data;
  } catch (err) {
    console.error('Failed to fetch categories', err);
  }
};

const selectCategory = (slug) => {
  selectedCategory.value = slug;
  fetchArticles();
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN');
};

onMounted(() => {
  fetchCategories();
  fetchArticles();
});

watch(() => route.query.q, () => {
  fetchArticles();
});
</script>
