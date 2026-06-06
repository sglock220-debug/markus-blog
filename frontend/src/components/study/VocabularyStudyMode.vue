<template>
  <MobileStudyMode v-if="isMobile" v-bind="props" @back="$emit('back')" />
  <DesktopStudyMode v-else v-bind="props" @back="$emit('back')" />
</template>

<script setup>
import { useResponsiveLayout } from '../../composables/useResponsiveLayout';
import DesktopStudyMode from './desktop/VocabularyStudyMode.vue';
import MobileStudyMode from './mobile/VocabularyStudyMode.vue';

const props = defineProps({
  vocabulary: {
    type: Array,
    required: true
  },
  language: String,
  level: String,
  userId: [Number, String]
});

const emit = defineEmits(['back']);
const { isMobile } = useResponsiveLayout();
</script>
