<template>
  <div class="profile-page">
    <div v-if="loading" class="loading-state">
      <Loader2 class="spin" />
      <span>加载中...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-content">
        <component :is="errorIcon" :size="64" />
        <h2>{{ errorTitle }}</h2>
        <p>{{ errorMessage }}</p>
        <router-link to="/" class="back-home">返回首页</router-link>
      </div>
    </div>

    <div v-else class="profile-container">
      <!-- Profile Hero -->
    <ProfileHero 
      :profile="profile" 
      :is-own-profile="false"
      @relation-changed="handleRelationChanged"
      @view-following="openFollowModal('following')"
      @view-followers="openFollowModal('followers')"
      @locked-click="handleLockedClick"
    />

      <!-- Main Content Area -->
      <div class="profile-content">
        <ProfileTabs 
          v-model="activeTab" 
          :is-own-profile="false"
          :show-dating="profile.show_dating_profile"
          :privacy="profile"
          @locked-click="handleLockedClick"
        />

        <div class="tab-content">
          <ProfileNotes 
            v-if="activeTab === 'notes'"
            :notes="notes"
            :is-own-profile="false"
            @click-note="handleNoteClick"
          >
            <template #empty>
              <ProfileEmptyState 
                :icon="FileText"
                title="暂无公开笔记"
                description="作者还没有发布任何公开笔记"
              />
            </template>
          </ProfileNotes>

          <div v-else-if="activeTab === 'about'" class="about-tab">
            <div class="about-section">
              <h3>个人介绍</h3>
              <p>{{ profile.bio || '这个人很懒，什么都没有留下。' }}</p>
            </div>
            <div class="about-section">
              <h3>基本信息</h3>
              <ul class="info-list">
                <li><span>公开 ID</span> <span>{{ profile.public_id }}</span></li>
                <li v-if="profile.location && profile.show_location"><span>所在地</span> <span>{{ profile.location }}</span></li>
                <li><span>加入时间</span> <span>{{ formatDate(profile.created_at) }}</span></li>
              </ul>
            </div>
          </div>
          
          <div v-else-if="activeTab === 'dating'" class="dating-tab">
            <ProfileEmptyState 
              :icon="Heart"
              title="交友资料"
              description="交友详细内容正在建设中"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <FollowListModal
      :show="showFollowModal"
      :title="followModalTitle"
      :type="followModalType"
      :public-id="profile.public_id"
      :me-public-id="myProfile?.public_id"
      @close="showFollowModal = false"
      @relation-changed="handleRelationChanged"
    />

    <ProfileToast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { FileText, Heart, Loader2, UserX, AlertCircle } from 'lucide-vue-next';
import api from '../api';
import ProfileHero from '../components/profile/ProfileHero.vue';
import FollowListModal from '../components/profile/FollowListModal.vue';
import ProfileTabs from '../components/profile/ProfileTabs.vue';
import ProfileNotes from '../components/profile/ProfileNotes.vue';
import ProfileEmptyState from '../components/profile/ProfileEmptyState.vue';
import ProfileToast from '../components/profile/ProfileToast.vue';

const route = useRoute();
const router = useRouter();

const profile = ref({});
const notes = ref([]);
const activeTab = ref('notes');
const loading = ref(true);
const error = ref(null);
const myProfile = ref(null);
const toastRef = ref(null);

const showFollowModal = ref(false);
const followModalType = ref('following');
const followModalTitle = computed(() => followModalType.value === 'following' ? '他的关注' : '他的粉丝');

const handleLockedClick = (label) => {
  toastRef.value?.show(`对方已锁定${label}`);
};

const errorIcon = computed(() => error.value === 404 ? UserX : AlertCircle);
const errorTitle = computed(() => error.value === 404 ? '用户未找到' : '访问出错');
const errorMessage = computed(() => error.value === 404 ? '该用户不存在或主页未公开' : '无法加载个人资料，请稍后再试');

const fetchAll = async () => {
  loading.value = true;
  error.value = null;
  const publicId = route.params.public_id;

  try {
    // 1. Fetch Profile
    const profileRes = await api.get(`/users/${publicId}/`);
    profile.value = profileRes.data;

    // 2. Fetch Notes
    const notesRes = await api.get(`/users/${publicId}/notes/`);
    notes.value = notesRes.data;

    // Check if it's actually my own profile
    try {
      const meRes = await api.get('/profile/me/');
      myProfile.value = meRes.data;
      if (meRes.data.public_id === publicId) {
        // Redirect to my own profile if it's me
        router.replace('/profile');
      }
    } catch (e) {
      // Not logged in or failed, ignore
    }

  } catch (err) {
    if (err.response?.status === 404) {
      error.value = 404;
    } else {
      error.value = 500;
    }
  } finally {
    loading.value = false;
  }
};

const openFollowModal = (type) => {
  followModalType.value = type;
  showFollowModal.value = true;
};

const handleRelationChanged = () => {
  // Re-fetch current profile to update stats and relation status
  const publicId = route.params.public_id;
  api.get(`/users/${publicId}/`).then(res => {
    profile.value = res.data;
  });
};

const handleNoteClick = (note) => {
  // Navigation to note detail
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
};

onMounted(fetchAll);
watch(() => route.params.public_id, fetchAll);
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f8f9fa;
  padding-bottom: 50px;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #999;
}

.spin {
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-content {
  text-align: center;
}

.error-content h2 {
  margin: 16px 0 8px;
  color: #333;
}

.back-home {
  display: inline-block;
  margin-top: 24px;
  padding: 8px 24px;
  background: #1a1a1a;
  color: #fff;
  border-radius: 20px;
  text-decoration: none;
}

.profile-container {
  max-width: 1040px;
  margin: 0 auto;
  padding: 0 20px;
}

.profile-content {
  margin-top: 28px;
}

.tab-content {
  margin-top: 24px;
}

.about-tab {
  background: #fff;
  padding: 30px;
  border-radius: 12px;
  border: 1px solid #eee;
}

.about-section {
  margin-bottom: 30px;
}

.about-section h3 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 16px;
  color: #1a1a1a;
  border-left: 4px solid #1a1a1a;
  padding-left: 12px;
}

.about-section p {
  font-size: 15px;
  color: #4a4a4a;
  line-height: 1.8;
}

.info-list {
  list-style: none;
  padding: 0;
}

.info-list li {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 14px;
}

.info-list li span:first-child {
  color: #888;
}

.info-list li span:last-child {
  color: #1a1a1a;
  font-weight: 500;
}

@media (max-width: 1040px) {
  .profile-container {
    padding: 0;
  }
}

@media (max-width: 768px) {
  .profile-page {
    background: #fff;
  }
  
  .profile-content {
    margin-top: 0;
  }
}
</style>
