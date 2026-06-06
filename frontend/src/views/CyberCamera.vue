<template>
  <MobileCamera v-if="isMobile" />
  <DesktopCamera v-else />
</template>

<script setup>
import { useResponsiveLayout } from '../composables/useResponsiveLayout';
import DesktopCamera from './desktop/CyberCamera.vue';
import MobileCamera from './mobile/CyberCamera.vue';

const { isMobile } = useResponsiveLayout();
</script>
