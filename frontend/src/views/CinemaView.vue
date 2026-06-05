<template>
  <div class="placeholder-view container">
    <header class="page-header">
      <button @click="goBack" class="back-btn">
        <ArrowLeftIcon size="20" />
        返回首页
      </button>
      <h1>{{ title }}</h1>
    </header>
    
    <div class="content-card">
      <div class="empty-state">
        <div class="icon">{{ icon }}</div>
        <h3>{{ title }} 正在建设中...</h3>
        <p>该模块的功能将在后续版本中陆续上线。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ArrowLeft as ArrowLeftIcon } from '@lucide/vue';

const props = defineProps({
  title: String,
  icon: String
});

const router = useRouter();
const goBack = () => router.push('/');
</script>

<style scoped>
@import "../assets/placeholder-page.css";
</style>
