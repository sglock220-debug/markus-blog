<template>
  <MobileDetailModal 
    v-if="isMobile" 
    v-bind="props" 
    @close="$emit('close')" 
    @toggle-learned="$emit('toggle-learned', word)" 
  />
  <DesktopDetailModal 
    v-else 
    v-bind="props" 
    @close="$emit('close')" 
    @toggle-learned="$emit('toggle-learned', word)" 
  />
</template>

<script setup>
import { useResponsiveLayout } from '../../composables/useResponsiveLayout';
import DesktopDetailModal from './desktop/VocabularyDetailModal.vue';
import MobileDetailModal from './mobile/VocabularyDetailModal.vue';

const props = defineProps({
  show: Boolean,
  word: Object,
  isLearned: Boolean
});

const emit = defineEmits(['close', 'toggle-learned']);
const { isMobile } = useResponsiveLayout();
</script>
