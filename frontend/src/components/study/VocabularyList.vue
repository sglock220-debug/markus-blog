<template>
  <div class="vocabulary-list">
    <div v-if="words.length === 0" class="empty-list">
      <p>暂无词汇</p>
    </div>
    <div v-else class="list-container">
      <VocabularyRow 
        v-for="word in words" 
        :key="word.id"
        :word="word"
        :is-expanded="expandedIds.has(word.id)"
        :is-learned="isLearnedList"
        @toggle-meaning="$emit('toggle-meaning', word.id)"
        @show-detail="$emit('show-detail', word)"
        @toggle-learned="$emit('toggle-learned', word)"
      />
    </div>
  </div>
</template>

<script setup>
import VocabularyRow from './VocabularyRow.vue';

defineProps({
  words: Array,
  expandedIds: Set,
  isLearnedList: Boolean
});

defineEmits(['toggle-meaning', 'show-detail', 'toggle-learned']);
</script>

<style scoped>
.vocabulary-list {
  height: 100%;
  overflow-y: auto;
}

.empty-list {
  padding: 40px;
  text-align: center;
  color: var(--secondary-text);
}

.list-container {
  display: flex;
  flex-direction: column;
}
</style>
