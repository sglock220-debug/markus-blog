<template>
  <MobileProfile v-if="isMobile" />
  <DesktopProfile v-else />
</template>

<script setup>
import { useResponsiveLayout } from '../composables/useResponsiveLayout';
import DesktopProfile from './desktop/ProfileView.vue';
import MobileProfile from './mobile/ProfileView.vue';

const { isMobile } = useResponsiveLayout();
</script>
