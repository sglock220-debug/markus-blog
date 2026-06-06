<template>
  <MobilePost v-if="isMobile" />
  <DesktopPost v-else />
</template>

<script setup>
import { useResponsiveLayout } from '../composables/useResponsiveLayout';
import DesktopPost from './desktop/PostDetail.vue';
import MobilePost from './mobile/PostDetail.vue';

const { isMobile } = useResponsiveLayout();
</script>
