<template>
  <MobileLogin v-if="isMobile" />
  <DesktopLogin v-else />
</template>

<script setup>
import { useResponsiveLayout } from '../composables/useResponsiveLayout';
import DesktopLogin from './desktop/LoginView.vue';
import MobileLogin from './mobile/LoginView.vue';

const { isMobile } = useResponsiveLayout();
</script>
