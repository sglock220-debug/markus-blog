<template>
  <div class="profile-empty-state">
    <div class="icon-wrapper">
      <slot name="icon">
        <component :is="icon" :size="48" />
      </slot>
    </div>
    <h3 class="title">{{ title }}</h3>
    <p class="description">{{ description }}</p>
    <div v-if="actionText" class="action-wrapper">
      <button class="action-btn" @click="$emit('action')">{{ actionText }}</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: [Object, Function],
  title: String,
  description: String,
  actionText: String
});
defineEmits(['action']);
</script>

<style scoped>
.profile-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  color: #ccc;
}

.icon-wrapper {
  margin-bottom: 16px;
  color: #ddd;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #999;
}

.description {
  margin: 8px 0 24px;
  font-size: 14px;
  color: #bbb;
}

.action-btn {
  padding: 10px 24px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.action-btn:hover {
  opacity: 0.8;
}
</style>
