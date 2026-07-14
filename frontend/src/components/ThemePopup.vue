<template>
  <div class="theme-overlay" @click="$emit('close')">
    <div class="theme-panel" @click.stop>
      <div class="theme-header">
        <h3>壁纸主题</h3>
        <div class="header-actions">
          <button 
            v-if="view === 'custom'" 
            class="manage-btn"
            :class="{ 'is-managing': isManaging }"
            @click="isManaging = !isManaging"
          >
            {{ isManaging ? '完成' : '管理' }}
          </button>
          <button class="close-btn" @click="$emit('close')">
            <XIcon size="20" />
          </button>
        </div>
      </div>

      <div class="theme-content">
        <!-- Main Grid (9 Slots) -->
        <div v-if="view === 'main'" class="theme-grid">
          <!-- 1-7: Default Wallpapers -->
          <div 
            v-for="i in 7" 
            :key="'default-' + i" 
            class="theme-slot wallpaper-slot"
            :class="{ active: currentWallpaper === getDefaultPath(i) }"
            @click="selectWallpaper(getDefaultPath(i))"
          >
            <div class="slot-preview default-preview" :style="{ backgroundImage: `url(${getDefaultPath(i)})` }">
              <div v-if="currentWallpaper === getDefaultPath(i)" class="active-badge">使用中</div>
            </div>
            <span class="slot-label">默认 {{ i }}</span>
          </div>

          <!-- 8: Custom Folder -->
          <div class="theme-slot folder-slot" @click="view = 'custom'">
            <div class="slot-preview folder-preview">
              <FolderIcon size="32" />
              <span class="count-badge" v-if="userWallpapers.length">{{ userWallpapers.length }}</span>
            </div>
            <span class="slot-label">自定义夹</span>
          </div>

          <!-- 9: Upload Slot -->
          <div class="theme-slot upload-slot" @click="triggerUpload">
            <div class="slot-preview upload-preview">
              <PlusIcon size="32" />
              <input 
                type="file" 
                ref="fileInput" 
                style="display: none" 
                accept="image/jpeg,image/png,image/webp"
                @change="handleUpload"
              />
            </div>
            <span class="slot-label">上传壁纸</span>
          </div>
        </div>

        <!-- Custom Wallpapers View -->
        <div v-else-if="view === 'custom'" class="custom-view">
          <button class="back-btn" @click="view = 'main'; isManaging = false">
            <ChevronLeftIcon size="20" /> 返回
          </button>
          
          <div v-if="userWallpapers.length === 0" class="empty-custom">
            <ImageIcon size="48" />
            <p>还没有上传过壁纸哦</p>
          </div>
          
          <div v-else class="theme-grid">
            <div 
              v-for="wp in userWallpapers" 
              :key="wp.id" 
              class="theme-slot wallpaper-slot"
              :class="{ 
                active: currentWallpaper === wp.image,
                'is-managing': isManaging 
              }"
              @click="handleCustomClick(wp)"
            >
              <div class="slot-preview" :style="{ backgroundImage: `url(${wp.image})` }">
                <div v-if="currentWallpaper === wp.image" class="active-badge">使用中</div>
                <button 
                  v-if="isManaging" 
                  class="delete-btn" 
                  @click.stop="confirmDelete(wp)"
                >
                  <Trash2Icon size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="theme-footer">
        <p class="hint" v-if="view === 'main'">点击壁纸立即应用，登录后可同步至云端</p>
        <p class="hint" v-else>自定义壁纸最多 9 张，每张不超过 4MB</p>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <Teleport to="body">
      <div v-if="deleteConfirmWp" class="confirm-overlay" @click="deleteConfirmWp = null">
        <div class="confirm-dialog" @click.stop>
          <h4>确认删除</h4>
          <p>确定要删除这张自定义壁纸吗？</p>
          <div class="confirm-actions">
            <button class="btn-cancel" @click="deleteConfirmWp = null">取消</button>
            <button class="btn-delete" @click="deleteWallpaper">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { 
  X as XIcon, 
  Folder as FolderIcon, 
  Plus as PlusIcon, 
  ChevronLeft as ChevronLeftIcon,
  Image as ImageIcon,
  Trash2 as Trash2Icon
} from '@lucide/vue';
import api from '../api';

const props = defineProps({
  currentWallpaper: String,
  user: Object
});

const emit = defineEmits(['close', 'select-wallpaper']);

const view = ref('main');
const isManaging = ref(false);
const userWallpapers = ref([]);
const fileInput = ref(null);
const deleteConfirmWp = ref(null);

const getDefaultPath = (i) => `/wallpapers/default${i}.png`;

const fetchWallpapers = async () => {
  if (!props.user) return;
  try {
    const res = await api.get('/theme/wallpapers/');
    userWallpapers.value = res.data.user_wallpapers;
  } catch (err) {
    console.error('Failed to fetch wallpapers', err);
  }
};

const selectWallpaper = async (path) => {
  emit('select-wallpaper', path);
  if (props.user) {
    try {
      await api.post('/theme/wallpapers/set/', { wallpaper: path });
    } catch (err) {
      console.error('Failed to save wallpaper preference', err);
    }
  }
};

const triggerUpload = () => {
  if (!props.user) {
    alert('请先登录后再上传壁纸');
    return;
  }
  if (userWallpapers.value.length >= 9) {
    alert('自定义壁纸最多上传 9 张');
    return;
  }
  fileInput.value.click();
};

const handleUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 4 * 1024 * 1024) {
    alert('图片大小不能超过 4MB');
    return;
  }

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await api.post('/wallpapers/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    userWallpapers.value.unshift(res.data);
    selectWallpaper(res.data.image);
    view.value = 'custom';
  } catch (err) {
    alert(err.response?.data?.error || '上传失败');
  } finally {
    event.target.value = '';
  }
};

const handleCustomClick = (wp) => {
  if (isManaging.value) return;
  selectWallpaper(wp.image);
};

const confirmDelete = (wp) => {
  deleteConfirmWp.value = wp;
};

const deleteWallpaper = async () => {
  if (!deleteConfirmWp.value) return;
  
  const wpToDelete = deleteConfirmWp.value;
  try {
    await api.delete(`/wallpapers/${wpToDelete.id}/`);
    userWallpapers.value = userWallpapers.value.filter(w => w.id !== wpToDelete.id);
    
    // If deleting current wallpaper, revert to default
    if (props.currentWallpaper === wpToDelete.image) {
      selectWallpaper(getDefaultPath(1));
    }
  } catch (err) {
    alert('删除失败');
  } finally {
    deleteConfirmWp.value = null;
  }
};

onMounted(() => {
  fetchWallpapers();
});
</script>

<style scoped>
.theme-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  z-index: 4000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.theme-panel {
  background: var(--card-bg);
  border-radius: 32px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px rgba(0,0,0,0.3);
  animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

@keyframes pop {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.theme-header {
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.theme-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-color);
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.manage-btn {
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-color);
  font-size: 0.85rem;
  cursor: pointer;
}

.manage-btn.is-managing {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.close-btn {
  background: none;
  border: none;
  color: var(--secondary-text);
  cursor: pointer;
  padding: 4px;
}

.theme-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.theme-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.theme-slot:hover {
  transform: translateY(-4px);
}

.slot-preview {
  width: 100%;
  aspect-ratio: 16 / 9;
  background-size: cover;
  background-position: center;
  background-color: var(--bg-color);
  border-radius: 12px;
  border: 2px solid transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.theme-slot.active .slot-preview {
  border-color: var(--accent-color);
}

.active-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: var(--accent-color);
  color: white;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: 4px;
}

.folder-preview, .upload-preview {
  background: var(--bg-color);
  border: 2px dashed var(--border-color);
  color: var(--secondary-text);
}

.count-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--accent-color);
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 0.7rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.slot-label {
  font-size: 0.8rem;
  color: var(--secondary-text);
}

.custom-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.back-btn {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--accent-color);
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.empty-custom {
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--secondary-text);
  gap: 12px;
}

.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(255, 59, 48, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 10;
}

.theme-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-color);
}

.hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--secondary-text);
  text-align: center;
}

/* Confirm Dialog */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 5000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.confirm-dialog {
  background: var(--card-bg);
  padding: 24px;
  border-radius: 20px;
  width: 280px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

.confirm-dialog h4 {
  margin: 0 0 12px 0;
}

.confirm-dialog p {
  color: var(--secondary-text);
  margin-bottom: 24px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

.confirm-actions button {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  cursor: pointer;
}

.btn-cancel {
  background: var(--bg-color);
  color: var(--text-color);
}

.btn-delete {
  background: #ff3b30;
  color: white;
}

@media (max-width: 480px) {
  .theme-grid {
    gap: 12px;
  }
  .slot-label {
    font-size: 0.7rem;
  }
}
</style>
