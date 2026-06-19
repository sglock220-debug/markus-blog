<template>
  <div class="profile-page">
    <div v-if="loading" class="loading-state">
      <Loader2 class="spin" />
      <span>加载中...</span>
    </div>

    <div v-else class="profile-container">
      <!-- Profile Hero -->
      <ProfileHero 
        :profile="profile" 
        :is-own-profile="true"
        :image-version="imageVersion"
        @edit-profile="showEditModal = true"
        @change-avatar="promptChangeImage('avatar')"
        @change-cover="promptChangeImage('cover')"
        @view-following="openFollowModal('following')"
        @view-followers="openFollowModal('followers')"
        @view-bookmarks="activeTab = 'bookmarks'"
      />

      <!-- Main Content Area -->
      <div class="profile-content">
        <div class="content-left">
          <ProfileTabs 
            v-model="activeTab" 
            :is-own-profile="true"
            :show-dating="profile.show_dating_profile"
            :privacy="profile"
          />

          <div class="tab-content">
            <ProfileNotes 
              v-if="activeTab === 'notes'"
              :notes="notes"
              :is-own-profile="true"
              @click-note="handleNoteClick"
            >
              <template #empty>
                <ProfileEmptyState 
                  :icon="FileText"
                  title="还没有笔记"
                  description="记录你的想法、学习心得或生活点滴"
                  action-text="去写笔记"
                  @action="$router.push('/notes')"
                />
              </template>
            </ProfileNotes>

            <ProfileEmptyState 
              v-else-if="activeTab === 'bookmarks'"
              :icon="Bookmark"
              title="暂无收藏"
              description="收藏的文章和笔记将出现在这里"
            />

            <ProfileEmptyState 
              v-else-if="activeTab === 'dating'"
              :icon="Heart"
              title="交友资料已开启"
              description="在此处完善你的交友信息，让更多人认识你"
              action-text="完善资料"
            />

            <div v-else-if="activeTab === 'about'" class="about-tab">
              <div class="about-section">
                <h3>个人介绍</h3>
                <p>{{ profile.bio || '这个人很懒，什么都没有留下。' }}</p>
              </div>
              <div class="about-section">
                <h3>公开信息</h3>
                <ul class="info-list">
                  <li><span>公开 ID</span> <span>{{ profile.public_id }}</span></li>
                  <li><span>注册时间</span> <span>{{ formatDate(profile.created_at) }}</span></li>
                  <li v-if="profile.location"><span>所在地</span> <span>{{ profile.location }}</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <ProfileEditModal 
      :show="showEditModal"
      :initial-data="profile"
      :saving="savingProfile"
      @close="showEditModal = false"
      @save="handleProfileSave"
    />

    <FollowListModal
      :show="showFollowModal"
      :title="followModalTitle"
      :type="followModalType"
      :public-id="profile.public_id"
      :me-public-id="profile.public_id"
      @close="showFollowModal = false"
      @relation-changed="fetchProfile"
    />

    <ImageChangeConfirmModal 
      :show="showConfirmModal"
      :message="confirmMessage"
      :preview-url="currentPreviewUrl"
      :type="confirmType"
      @confirm="triggerFilePicker"
      @cancel="showConfirmModal = false"
    />

    <ImageCropModal 
      :show="showCropModal"
      :image-src="cropperSrc"
      :title="cropperTitle"
      :aspect-ratio="currentAspectRatio"
      @confirm="handleCropConfirm"
      @cancel="showCropModal = false"
    />

    <input 
      ref="fileInput"
      type="file" 
      accept="image/*" 
      style="display: none" 
      @change="onFileSelected" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { FileText, Bookmark, Heart, Loader2 } from 'lucide-vue-next';
import api from '../api';
import ProfileHero from '../components/profile/ProfileHero.vue';
import ProfileTabs from '../components/profile/ProfileTabs.vue';
import ProfileNotes from '../components/profile/ProfileNotes.vue';
import ProfileEmptyState from '../components/profile/ProfileEmptyState.vue';
import ProfileEditModal from '../components/profile/ProfileEditModal.vue';
import FollowListModal from '../components/profile/FollowListModal.vue';
import ImageChangeConfirmModal from '../components/profile/ImageChangeConfirmModal.vue';
import ImageCropModal from '../components/profile/ImageCropModal.vue';

const profile = ref({});
const notes = ref([]);
const activeTab = ref('notes');
const loading = ref(true);
const imageVersion = ref(0);

const showEditModal = ref(false);
const savingProfile = ref(false);

const showFollowModal = ref(false);
const followModalType = ref('following');
const followModalTitle = computed(() => followModalType.value === 'following' ? '我的关注' : '我的粉丝');

const showConfirmModal = ref(false);
const confirmType = ref(''); // 'avatar' or 'cover'
const confirmMessage = computed(() => confirmType.value === 'avatar' ? '要更换头像吗？' : '要更换背景图吗？');

const currentPreviewUrl = computed(() => {
  const url = confirmType.value === 'avatar' 
    ? (profile.value.avatar_original || profile.value.avatar) 
    : (profile.value.cover_image_original || profile.value.cover_image);
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${imageVersion.value}`;
});

const showCropModal = ref(false);
const cropperSrc = ref('');
const cropperTitle = computed(() => confirmType.value === 'avatar' ? '裁剪头像' : '裁剪背景图');
const currentAspectRatio = ref(1);
const selectedOriginalFile = ref(null);

const fileInput = ref(null);

const fetchProfile = async () => {
  try {
    const res = await api.get('/profile/me/');
    profile.value = res.data;
  } catch (err) {
    console.error('Failed to fetch profile', err);
  }
};

const fetchNotes = async () => {
  loading.value = true;
  try {
    if (!profile.value.public_id) await fetchProfile();
    const res = await api.get(`/users/${profile.value.public_id}/notes/`);
    notes.value = res.data;
  } catch (err) {
    console.error('Failed to fetch notes', err);
  } finally {
    loading.value = false;
  }
};

const handleProfileSave = async (data) => {
  savingProfile.value = true;
  try {
    const res = await api.patch('/profile/me/', data);
    profile.value = res.data;
    showEditModal.value = false;
  } catch (err) {
    alert('保存失败');
  } finally {
    savingProfile.value = false;
  }
};

const openFollowModal = (type) => {
  followModalType.value = type;
  showFollowModal.value = true;
};

const promptChangeImage = (type) => {
  confirmType.value = type;
  
  if (type === 'avatar') {
    currentAspectRatio.value = 1;
  } else {
    // Calculate aspect ratio of .profile-hero
    const heroEl = document.querySelector('.profile-hero');
    if (heroEl) {
      const rect = heroEl.getBoundingClientRect();
      currentAspectRatio.value = rect.width / rect.height;
      console.log('Detected Hero aspect ratio:', currentAspectRatio.value);
    } else {
      currentAspectRatio.value = 1040 / 450; // Fallback
      console.log('Hero element not found, using fallback aspect ratio:', currentAspectRatio.value);
    }
  }
  
  showConfirmModal.value = true;
};

const triggerFilePicker = () => {
  showConfirmModal.value = false;
  fileInput.value.click();
};

const onFileSelected = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_IMAGE_SIZE) {
    alert('图片不能大于 5MB');
    e.target.value = '';
    return;
  }

  selectedOriginalFile.value = file; // Store original file

  const reader = new FileReader();
  reader.onload = (ev) => {
    cropperSrc.value = ev.target.result;
    showCropModal.value = true;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
};

const handleCropConfirm = async (blob) => {
  const formData = new FormData();
  const endpoint = confirmType.value === 'avatar' ? '/profile/me/avatar/' : '/profile/me/cover/';
  const fieldName = confirmType.value === 'avatar' ? 'avatar' : 'cover';
  
  formData.append(fieldName, blob, 'image.jpg');
  if (selectedOriginalFile.value) {
    formData.append('original', selectedOriginalFile.value);
  }

  try {
    const res = await api.post(endpoint, formData);
    if (confirmType.value === 'avatar') {
      profile.value.avatar = res.data.avatar;
      profile.value.avatar_original = res.data.avatar_original;
    } else {
      profile.value.cover_image = res.data.cover_image;
      profile.value.cover_image_original = res.data.cover_image_original;
    }
    // Update image version to force reload images without refreshing page
    imageVersion.value += 1;
    showCropModal.value = false;
    selectedOriginalFile.value = null; // Clear
  } catch (err) {
    alert('上传失败: ' + (err.response?.data?.error || err.message));
  }
};

const handleNoteClick = (note) => {
  // Navigation to note detail would go here
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

onMounted(() => {
  fetchProfile();
  fetchNotes();
});
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f8f9fa;
  padding-bottom: 50px;
}

.loading-state {
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
