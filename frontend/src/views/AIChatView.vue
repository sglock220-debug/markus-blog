<template>
  <div class="placeholder-view container">
    <header class="page-header">
      <button @click="goBack" class="back-btn">
        <ArrowLeftIcon size="20" />
        返回首页
      </button>
      <h1>AI聊天助手</h1>
    </header>
    
    <div class="content-card">
      <div class="empty-state">
        <div class="icon">🤖</div>
        <h3>AI 助手正在深度学习中...</h3>
        <p>基于大语言模型的智能问答、代码辅助与多模态交互功能即将上线。</p>
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
