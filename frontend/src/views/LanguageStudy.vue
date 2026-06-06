<template>
  <MobileStudy v-if="isMobile" />
  <DesktopStudy v-else />
</template>

<script setup>
import { useResponsiveLayout } from '../composables/useResponsiveLayout';
import DesktopStudy from './desktop/LanguageStudy.vue';
import MobileStudy from './mobile/LanguageStudy.vue';

const { isMobile } = useResponsiveLayout();
</script>
