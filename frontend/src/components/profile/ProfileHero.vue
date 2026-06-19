<template>
  <div class="profile-hero" :style="coverStyle">
    <!-- Overlay for Gradient -->
    <div class="hero-overlay" @click="$emit('change-cover')">
      <div v-if="isOwnProfile" class="cover-edit-hint">
        <Camera :size="18" />
        <span>更换背景</span>
      </div>
    </div>

    <!-- Avatar Section -->
    <div class="avatar-section-absolute">
      <div class="avatar-wrapper" @click="$emit('change-avatar')">
        <img :src="avatarUrl" class="profile-avatar" />
        <div class="avatar-edit-hint" v-if="isOwnProfile">
          <Camera :size="18" />
        </div>
      </div>
    </div>

    <!-- Profile Text Section -->
    <div class="profile-text-section-absolute">
      <h1 class="display-name">{{ profile.display_name || profile.username }}</h1>
      <div class="public-id">ID: {{ profile.public_id }}</div>
      
      <p class="bio">{{ profile.bio || '还没有填写简介' }}</p>

      <div class="meta-row">
        <div v-if="profile.show_location && profile.location" class="meta-item">
          <MapPin :size="14" />
          <span>{{ profile.location }}</span>
        </div>
        <div class="meta-item">
          <Calendar :size="14" />
          <span>{{ formatDate(profile.created_at) }} 加入</span>
        </div>
        
        <span class="meta-separator">·</span>

        <div class="stats-group">
          <button class="compact-stat" @click="handleStatClick('following')">
            <span class="stat-value">{{ profile.following_count || 0 }}</span>
            <span class="stat-label">关注</span>
          </button>
          <button class="compact-stat" @click="handleStatClick('followers')">
            <span class="stat-value">{{ profile.followers_count || 0 }}</span>
            <span class="stat-label">粉丝</span>
          </button>
          <button v-if="isOwnProfile" class="compact-stat" @click="$emit('view-bookmarks')">
            <span class="stat-value">{{ profile.bookmarks_count || 0 }}</span>
            <span class="stat-label">收藏</span>
          </button>
          <button class="compact-stat">
            <span class="stat-value">{{ profile.likes_received || 0 }}</span>
            <span class="stat-label">获赞</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-btns-absolute">
      <template v-if="isOwnProfile">
        <button class="glass-btn edit-btn" @click="$emit('edit-profile')">编辑资料</button>
      </template>
      <template v-else>
        <button 
          class="glass-btn follow-btn" 
          :class="{ 'btn-following': profile.relation_status === 'following' || profile.relation_status === 'mutual' }"
          @click="handleHeroFollowAction"
        >
          {{ getHeroFollowText(profile.relation_status) }}
        </button>
        <button class="glass-btn message-btn disabled" disabled>私信</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Camera, MapPin, Calendar } from 'lucide-vue-next';
import api from '../../api';

const props = defineProps({
  profile: Object,
  isOwnProfile: Boolean,
  imageVersion: { type: Number, default: 0 }
});

const emit = defineEmits([
  'edit-profile', 
  'change-avatar', 
  'change-cover', 
  'relation-changed',
  'view-following',
  'view-followers',
  'view-bookmarks',
  'locked-click'
]);

const handleStatClick = (type) => {
  if (props.isOwnProfile) {
    emit(`view-${type}`);
    return;
  }

  // Privacy check for visitors
  if (type === 'following' && !props.profile.show_following_public) {
    emit('locked-click', '关注列表');
    return;
  }
  if (type === 'followers' && !props.profile.show_followers_public) {
    emit('locked-click', '粉丝列表');
    return;
  }

  emit(`view-${type}`);
};

const getHeroFollowText = (status) => {
  if (status === 'mutual') return '已互关';
  if (status === 'following') return '已关注';
  if (status === 'follower') return '回关';
  return '关注';
};

const handleHeroFollowAction = async () => {
  const isFollowing = props.profile.relation_status === 'following' || props.profile.relation_status === 'mutual';
  const method = isFollowing ? 'delete' : 'post';
  
  try {
    const res = await api({
      method,
      url: `/users/${props.profile.public_id}/follow/`
    });
    
    emit('relation-changed', res.data.relation_status);
  } catch (err) {
    console.error('Follow action failed', err);
  }
};

const getVersionedUrl = (url) => {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${props.imageVersion}`;
};

const coverStyle = computed(() => {
  if (props.profile.cover_image) {
    return { backgroundImage: `url(${getVersionedUrl(props.profile.cover_image)})` };
  }
  return { background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' };
});

const avatarUrl = computed(() => {
  return getVersionedUrl(props.profile.avatar) || '/default-avatar.png';
});

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
};
</script>

<style scoped>
.profile-hero {
  position: relative;
  height: 450px;
  background-size: cover;
  background-position: center;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

/* Integrated Gradient Overlay */
.profile-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(42, 31, 24, 0) 0%,
    rgba(42, 31, 24, 0) 42%,
    rgba(42, 31, 24, 0.22) 55%,
    rgba(42, 31, 24, 0.52) 72%,
    rgba(42, 31, 24, 0.80) 100%
  );
  pointer-events: none;
  z-index: 1;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  cursor: pointer;
  z-index: 1;
}

.cover-edit-hint {
  position: absolute;
  right: 20px;
  top: 20px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: #fff;
  padding: 6px 14px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.3s, background 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.profile-hero:hover .cover-edit-hint {
  opacity: 1;
}

.cover-edit-hint:hover {
  background: rgba(255, 255, 255, 0.3);
}

.avatar-section-absolute {
  position: absolute;
  left: 40px;
  bottom: 45px;
  z-index: 2;
}

.profile-text-section-absolute {
  position: absolute;
  left: 192px; /* 40px + 128px + 24px */
  bottom: 30px;
  z-index: 2;
  width: calc(100% - 380px); /* Leave room for action buttons and right padding */
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.action-btns-absolute {
  position: absolute;
  right: 40px;
  bottom: 42px;
  z-index: 2;
  display: flex;
  gap: 12px;
}

.avatar-wrapper {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  border: 4px solid #fff;
  background: #f0f0f0;
  position: relative;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  flex-shrink: 0;
}

.profile-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-edit-hint {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 0.3s;
}

.avatar-wrapper:hover .avatar-edit-hint {
  opacity: 1;
}

.display-name {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-id {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 2px;
}

.bio {
  margin: 10px 0;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  max-width: 600px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta-row {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  line-height: 1.2;
}

.meta-separator {
  color: rgba(255, 255, 255, 0.4);
  font-weight: 300;
  flex-shrink: 0;
  margin-bottom: 1px;
}

.stats-group {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.compact-stat {
  background: transparent;
  border: 0;
  padding: 0;
  margin: 0;
  color: rgba(255, 255, 255, 0.95);
  font-size: 16px;
  line-height: 1;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  transition: opacity 0.2s;
  transform: translateY(1px);
}

.compact-stat:hover {
  opacity: 0.8;
}

.stat-value {
  color: #fff;
  font-weight: 700;
}

.stat-label {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

/* Glass effect buttons */
.glass-btn {
  padding: 8px 22px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.edit-btn {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.follow-btn {
  background: #fff;
  color: #1a1a1a;
  border: none;
}

.message-btn {
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
}

.btn-following {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-following:hover {
  background: rgba(255, 77, 79, 0.2);
  color: #ff4d4f;
  border-color: rgba(255, 77, 79, 0.3);
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .profile-hero {
    height: 400px;
    border-radius: 0;
  }

  .avatar-section-absolute {
    left: 20px;
    bottom: 230px;
  }

  .profile-text-section-absolute {
    left: 20px;
    bottom: 25px;
    width: calc(100% - 40px);
  }

  .action-btns-absolute {
    right: 20px;
    bottom: auto;
    top: 20px;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
  }

  .avatar-wrapper {
    width: 90px;
    height: 90px;
    border-width: 3px;
  }

  .display-name {
    font-size: 22px;
  }

  .glass-btn {
    padding: 7px 18px;
    font-size: 13px;
  }

  .bio {
    font-size: 14px;
    margin: 8px 0;
  }

  .meta-row {
    gap: 15px;
    flex-wrap: wrap;
  }
}

/* Extra safety for 375px screens */
@media (max-width: 375px) {
  .profile-hero {
    height: 380px;
  }
  
  .avatar-section-absolute {
    bottom: 210px;
  }

  .display-name {
    max-width: 200px;
  }
  
  .action-btns-absolute {
    gap: 8px;
  }
}
</style>
