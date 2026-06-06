<template>
  <MobilePlaceholder v-if="isMobile" title="笔记" icon="📝" />
  <div v-else class="container placeholder-container">
    <div class="placeholder-content">
      <div class="placeholder-icon">📝</div>
      <h1 class="placeholder-title">笔记</h1>
      <p class="placeholder-text">笔记功能正在建设中，敬请期待...</p>
      <div class="placeholder-progress">
        <div class="progress-bar"></div>
      </div>
      <router-link to="/" class="back-home">返回首页</router-link>
    </div>
  </div>
</template>

<script setup>
import { useResponsiveLayout } from '../composables/useResponsiveLayout';
import MobilePlaceholder from '../components/shared/MobilePlaceholder.vue';
import '../assets/placeholder-page.css';

const { isMobile } = useResponsiveLayout();
</script>
