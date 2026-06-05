<template>
  <div class="placeholder-view container">
    <header class="page-header">
      <button @click="goBack" class="back-btn">
        <ArrowLeftIcon size="20" />
        返回首页
      </button>
      <h1>笔记</h1>
    </header>
    
    <div class="content-card">
      <div class="empty-state">
        <div class="icon">📝</div>
        <h3>笔记功能正在建设中...</h3>
        <p>个人知识库管理、Markdown 编辑与多端同步功能即将上线。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ArrowLeft as ArrowLeftIcon } from '@lucide/vue';
const router = useRouter();
const goBack = () => router.push('/');
</script>

<style scoped>
@import "../assets/placeholder-page.css";
</style>
