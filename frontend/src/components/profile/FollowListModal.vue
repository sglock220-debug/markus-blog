<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-container">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" @click="$emit('close')"><X :size="20" /></button>
        </div>

        <div class="modal-body">
          <div v-if="loading" class="loading-state">
            <Loader2 class="spin" />
            <span>加载中...</span>
          </div>

          <div v-else-if="users.length === 0" class="empty-state">
            <UserPlus :size="48" />
            <p>{{ emptyText }}</p>
          </div>

          <div v-else class="user-list">
            <div v-for="user in users" :key="user.public_id" class="user-item">
              <div class="user-info" @click="goToProfile(user.public_id)">
                <img :src="user.avatar || '/default-avatar.png'" class="user-avatar" />
                <div class="user-details">
                  <div class="user-name">{{ user.display_name || user.username }}</div>
                  <div class="user-id">ID: {{ user.public_id }}</div>
                  <div v-if="user.bio" class="user-bio">{{ truncate(user.bio, 40) }}</div>
                </div>
              </div>

              <div class="user-action" v-if="!isMe(user.public_id)">
                <button 
                  class="action-btn" 
                  :class="getButtonClass(user.relation_status)"
                  @click="handleFollowAction(user)"
                >
                  {{ getButtonText(user.relation_status) }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { X, Loader2, UserPlus } from 'lucide-vue-next';
import api from '../../api';

const props = defineProps({
  show: Boolean,
  title: String,
  publicId: String,
  type: String, // 'following' or 'followers'
  mePublicId: String
});

const emit = defineEmits(['close', 'relation-changed']);

const router = useRouter();
const users = ref([]);
const loading = ref(false);

const emptyText = computed(() => props.type === 'following' ? '还没有关注任何人' : '还没有粉丝');

const fetchUsers = async () => {
  if (!props.publicId || !props.type) return;
  loading.value = true;
  try {
    const res = await api.get(`/users/${props.publicId}/${props.type}/`);
    users.value = res.data;
  } catch (err) {
    console.error('Failed to fetch follow list', err);
  } finally {
    loading.value = false;
  }
};

watch(() => props.show, (newVal) => {
  if (newVal) {
    fetchUsers();
  }
});

const isMe = (publicId) => publicId === props.mePublicId;

const getButtonText = (status) => {
  if (status === 'mutual') return '已互关';
  if (status === 'following') return '已关注';
  if (status === 'follower') return '回关';
  return '关注';
};

const getButtonClass = (status) => {
  if (status === 'mutual' || status === 'following') return 'btn-following';
  if (status === 'follower') return 'btn-follower';
  return 'btn-follow';
};

const handleFollowAction = async (user) => {
  const isFollowing = user.relation_status === 'following' || user.relation_status === 'mutual';
  const method = isFollowing ? 'delete' : 'post';
  
  try {
    const res = await api({
      method,
      url: `/users/${user.public_id}/follow/`
    });
    
    // Update local state
    user.relation_status = res.data.relation_status;
    emit('relation-changed');
  } catch (err) {
    console.error('Follow action failed', err);
  }
};

const goToProfile = (publicId) => {
  emit('close');
  router.push(`/u/${publicId}`);
};

const truncate = (text, len) => {
  if (!text) return '';
  return text.length > len ? text.substring(0, len) + '...' : text;
};

import { computed } from 'vue';
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2500;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: #fff;
  width: 450px;
  max-width: 90vw;
  height: 600px;
  max-height: 80vh;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.loading-state, .empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ccc;
  gap: 12px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.user-list {
  display: flex;
  flex-direction: column;
}

.user-item {
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
}

.user-item:hover {
  background: #f9f9f9;
}

.user-info {
  display: flex;
  gap: 12px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.user-details {
  min-width: 0;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.user-id {
  font-size: 12px;
  color: #999;
}

.user-bio {
  font-size: 13px;
  color: #666;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-btn {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-follow {
  background: #1a1a1a;
  color: #fff;
  border: none;
}

.btn-follower {
  background: #f5f5f5;
  color: #1a1a1a;
  border: 1px solid #ddd;
}

.btn-following {
  background: #fff;
  color: #999;
  border: 1px solid #eee;
}

.btn-following:hover {
  background: #fff1f0;
  color: #f5222d;
  border-color: #ffa39e;
}

.btn-following:hover::after {
  content: "";
}
</style>
