<template>
  <div class="profile-notes">
    <div v-if="notes.length === 0" class="empty-container">
      <slot name="empty">
        <div class="default-empty">
          <FileText :size="48" />
          <p>暂无笔记</p>
        </div>
      </slot>
    </div>
    
    <div v-else class="notes-list">
      <div v-for="note in notes" :key="note.id" class="note-card" @click="$emit('click-note', note)">
        <div class="note-header">
          <h3 class="note-title">{{ note.title }}</h3>
          <div v-if="isOwnProfile" class="status-tags">
            <span v-if="!note.is_published" class="tag draft">草稿</span>
            <span v-else-if="note.visibility === 'private'" class="tag private">私密</span>
            <span v-else-if="note.visibility === 'friends'" class="tag friends">好友</span>
          </div>
        </div>
        <p class="note-summary">{{ truncate(note.content, 100) }}</p>
        <div class="note-footer">
          <span class="note-time">{{ formatDate(note.created_at) }}</span>
          <div class="note-actions">
            <span v-if="note.category_name" class="category-tag">{{ note.category_name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { FileText } from 'lucide-vue-next';

defineProps({
  notes: Array,
  isOwnProfile: Boolean
});

defineEmits(['click-note']);

const truncate = (text, length) => {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
};
</script>

<style scoped>
.profile-notes {
  padding: 20px 0;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.note-card {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #eee;
  cursor: pointer;
  transition: all 0.2s;
}

.note-card:hover {
  border-color: #ddd;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.note-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.status-tags {
  display: flex;
  gap: 6px;
}

.tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.draft { background: #f0f0f0; color: #666; }
.private { background: #fff1f0; color: #f5222d; border: 1px solid #ffa39e; }
.friends { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }

.note-summary {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 16px;
}

.note-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #999;
}

.category-tag {
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 10px;
  color: #888;
}

.empty-container {
  padding: 60px 0;
  display: flex;
  justify-content: center;
}

.default-empty {
  text-align: center;
  color: #ccc;
}

.default-empty p {
  margin-top: 12px;
  font-size: 14px;
}
</style>
