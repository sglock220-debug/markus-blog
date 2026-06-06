<template>
  <MobileDetail v-if="isMobile" />
  <DesktopDetail v-else />
</template>

<script setup>
import { useResponsiveLayout } from '../composables/useResponsiveLayout';
import DesktopDetail from './desktop/DictionaryDetail.vue';
import MobileDetail from './mobile/DictionaryDetail.vue';

const { isMobile } = useResponsiveLayout();
</script>
