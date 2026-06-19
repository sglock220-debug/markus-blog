<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-container">
        <div class="modal-header">
          <h3>编辑个人资料</h3>
          <button class="close-btn" @click="$emit('close')"><X :size="20" /></button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>显示名称</label>
            <input v-model="form.display_name" placeholder="设置你的昵称" maxlength="100" />
          </div>

          <div class="form-group">
            <label>个人简介</label>
            <textarea v-model="form.bio" placeholder="向大家介绍一下自己吧" rows="3" maxlength="500"></textarea>
            <div class="char-count">{{ form.bio?.length || 0 }}/500</div>
          </div>

          <div class="form-group">
            <label>所在地</label>
            <input v-model="form.location" placeholder="你在哪里？" maxlength="100" />
          </div>

          <div class="form-row">
            <div class="toggle-group">
              <label class="toggle">
                <input type="checkbox" v-model="form.show_location" />
                <span class="slider"></span>
                <span class="label-text">公开显示所在地</span>
              </label>
            </div>
            
            <div class="toggle-group">
              <label class="toggle">
                <input type="checkbox" v-model="form.is_public" />
                <span class="slider"></span>
                <span class="label-text">公开个人主页</span>
              </label>
            </div>
          </div>

          <div class="toggle-group">
            <label class="toggle">
              <input type="checkbox" v-model="form.show_dating_profile" />
              <span class="slider"></span>
              <span class="label-text">开启交友模式</span>
            </label>
            <p class="hint">开启后将在主页展示交友资料页签</p>
          </div>

          <!-- Privacy Settings Section -->
          <div class="privacy-section">
            <h4 class="section-title">隐私设置</h4>
            
            <div class="privacy-grid">
              <div class="toggle-group">
                <label class="toggle">
                  <input type="checkbox" v-model="form.show_notes_public" />
                  <span class="slider"></span>
                  <span class="label-text">公开笔记</span>
                </label>
              </div>

              <div class="toggle-group">
                <label class="toggle">
                  <input type="checkbox" v-model="form.show_bookmarks_public" />
                  <span class="slider"></span>
                  <span class="label-text">公开收藏</span>
                </label>
              </div>

              <div class="toggle-group">
                <label class="toggle">
                  <input type="checkbox" v-model="form.show_following_public" />
                  <span class="slider"></span>
                  <span class="label-text">公开关注列表</span>
                </label>
              </div>

              <div class="toggle-group">
                <label class="toggle">
                  <input type="checkbox" v-model="form.show_followers_public" />
                  <span class="slider"></span>
                  <span class="label-text">公开粉丝列表</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="cancel-btn" @click="$emit('close')">取消</button>
          <button class="save-btn" :disabled="saving" @click="handleSave">
            {{ saving ? '保存中...' : '保存更改' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps({
  show: Boolean,
  initialData: Object,
  saving: Boolean
});

const emit = defineEmits(['close', 'save']);

const form = ref({});

watch(() => props.show, (newVal) => {
  if (newVal) {
    form.value = { ...props.initialData };
  }
});

const handleSave = () => {
  emit('save', { ...form.value });
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: #fff;
  width: 500px;
  max-width: 90vw;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.form-group input, .form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.2s;
}

.form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: #1a1a1a;
}

.char-count {
  font-size: 11px;
  color: #999;
  text-align: right;
  margin-top: 4px;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.toggle-group {
  margin-bottom: 16px;
}

.toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 12px;
}

.toggle input {
  display: none;
}

.slider {
  width: 40px;
  height: 20px;
  background: #ddd;
  border-radius: 20px;
  position: relative;
  transition: 0.3s;
}

.slider::before {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  left: 2px;
  top: 2px;
  background: #fff;
  border-radius: 50%;
  transition: 0.3s;
}

input:checked + .slider {
  background: #07c160;
}

input:checked + .slider::before {
  transform: translateX(20px);
}

.label-text {
  font-size: 14px;
  color: #333;
}

.hint {
  font-size: 12px;
  color: #999;
  margin: 4px 0 0 52px;
}

.privacy-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: #1a1a1a;
}

.privacy-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  padding: 8px 24px;
  background: #f5f5f5;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
}

.save-btn {
  padding: 8px 24px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
