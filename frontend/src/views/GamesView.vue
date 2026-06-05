<template>
  <div class="placeholder-view container">
    <header class="page-header">
      <button @click="goBack" class="back-btn">
        <ArrowLeftIcon size="20" />
        返回首页
      </button>
      <h1>娱乐游戏</h1>
    </header>
    
    <div class="content-card">
      <div class="empty-state">
        <div class="icon">🎮</div>
        <h3>游戏中心加载中...</h3>
        <p>一系列经典的休闲小游戏与互动竞技模块正在紧锣密鼓地开发中。</p>
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
