<template>
  <div class="placeholder-view container">
    <header class="page-header">
      <button @click="goBack" class="back-btn">
        <ArrowLeftIcon size="20" />
        返回首页
      </button>
      <h1>交友</h1>
    </header>
    
    <div class="content-card">
      <div class="empty-state">
        <div class="icon">👥</div>
        <h3>社交广场正在连接...</h3>
        <p>好友互动、即时通讯与社区分享功能即将开启。</p>
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
