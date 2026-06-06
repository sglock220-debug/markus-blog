<template>
  <MobileHome v-if="isMobile" />
  <DesktopHome v-else />
</template>

<script setup>
import { useResponsiveLayout } from '../composables/useResponsiveLayout';
import DesktopHome from './desktop/HomeView.vue';
import MobileHome from './mobile/HomeView.vue';

const { isMobile } = useResponsiveLayout();
</script>
