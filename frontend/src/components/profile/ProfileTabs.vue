<template>
  <div class="profile-tabs">
    <div 
      v-for="tab in visibleTabs" 
      :key="tab.id"
      class="tab-item"
      :class="{ 
        active: modelValue === tab.id,
        'is-locked': tab.isLocked && !isOwnProfile
      }"
      @click="handleTabClick(tab)"
    >
      <span v-if="tab.isLocked" class="lock-icon">🔒</span>
      {{ tab.label }}
      <div v-if="modelValue === tab.id" class="active-indicator"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: String,
  isOwnProfile: Boolean,
  showDating: Boolean,
  privacy: {
    type: Object,
    default: () => ({
      show_notes_public: true,
      show_bookmarks_public: false
    })
  }
});

const emit = defineEmits(['update:modelValue', 'locked-click']);

const tabs = computed(() => [
  { 
    id: 'notes', 
    label: '笔记', 
    always: true,
    isLocked: !props.privacy.show_notes_public
  },
  { 
    id: 'bookmarks', 
    label: '收藏', 
    ownOnly: true,
    isLocked: !props.privacy.show_bookmarks_public
  },
  { 
    id: 'dating', 
    label: '交友资料', 
    datingOnly: true 
  },
  { 
    id: 'about', 
    label: '关于', 
    always: true 
  },
]);

const visibleTabs = computed(() => {
  return tabs.value.filter(tab => {
    // If locked and not own profile, still show but as locked/disabled
    // Note: User requested "locked tabs don't show content or show disabled"
    // I will show them but handle click
    if (tab.always) return true;
    if (tab.ownOnly && props.isOwnProfile) return true;
    if (tab.datingOnly && props.showDating) return true;
    return false;
  });
});

const handleTabClick = (tab) => {
  if (tab.isLocked && !props.isOwnProfile) {
    emit('locked-click', tab.label);
    return;
  }
  emit('update:modelValue', tab.id);
};
</script>

<style scoped>
.profile-tabs {
  display: flex;
  border-bottom: 1px solid #eee;
  margin-top: 10px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-item {
  padding: 16px 24px;
  font-size: 15px;
  color: #666;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.lock-icon {
  font-size: 12px;
  color: #aaa;
  filter: grayscale(1);
  opacity: 0.7;
}

.tab-item:hover {
  color: #1a1a1a;
  background: #fcfcfc;
}

.tab-item.active {
  color: #1a1a1a;
  font-weight: 600;
}

.tab-item.is-locked {
  opacity: 0.8;
}

.active-indicator {
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 3px;
  background: #1a1a1a;
  border-radius: 3px 3px 0 0;
}

@media (max-width: 768px) {
  .tab-item {
    flex: 1;
    text-align: center;
    padding: 14px 0;
    font-size: 14px;
    justify-content: center;
  }
}
</style>
