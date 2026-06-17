<template>
  <MobilePlaceholder v-if="isMobile" title="AI 聊天" icon="🤖" />
  <div v-else class="ai-chat-container">
    <!-- Left Sidebar: AI Characters List -->
    <div class="chat-sidebar">
      <div class="sidebar-header">
        <div class="user-info">
          <img :src="userProfile?.avatar || '/default-avatar.png'" class="user-avatar" @click="showProfileModal = true" />
          <div class="sidebar-actions">
            <button class="icon-btn" title="添加角色" @click="openAddCharacterModal">
              <i class="fas fa-plus"></i>
            </button>
            <button class="icon-btn" title="AI设置" @click="openSettingsModal">
              <i class="fas fa-cog"></i>
            </button>
          </div>
        </div>
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input type="text" v-model="searchQuery" placeholder="搜索角色..." />
        </div>
      </div>

      <div class="character-list">
        <div v-if="characters.length === 0" class="empty-list">
          <p>暂无聊天对象</p>
          <button @click="openAddCharacterModal" class="text-btn">点击添加角色</button>
        </div>
        <div 
          v-for="char in filteredCharacters" 
          :key="char.id" 
          :class="['character-item', { active: selectedCharacter?.id === char.id }]"
          @click="selectCharacter(char)"
        >
          <img :src="char.avatar || '/default-ai-avatar.png'" class="char-avatar" />
          <div class="char-info">
            <div class="char-name-time">
              <span class="char-name">{{ char.name }}</span>
              <span class="char-time">{{ formatTime(char.updated_at) }}</span>
            </div>
            <div class="char-last-msg">{{ char.last_message || '暂无消息' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Chat Area -->
    <div class="chat-main">
      <template v-if="selectedCharacter">
        <div class="chat-header">
          <div class="header-info">
            <img :src="selectedCharacter.avatar || '/default-ai-avatar.png'" class="header-avatar" />
            <div class="header-text">
              <div class="header-name">{{ selectedCharacter.name }}</div>
              <div class="header-model">{{ selectedCharacter.model_name }}</div>
            </div>
          </div>
          <div class="header-actions">
            <button class="icon-btn" title="删除角色" @click="deleteCharacter(selectedCharacter)"><i class="fas fa-trash"></i></button>
          </div>
        </div>

        <div class="chat-messages" ref="messageContainer">
          <div v-for="(msg, index) in messages" :key="index" :class="['message-wrapper', msg.role]">
            <img 
              v-if="msg.role === 'assistant'" 
              :src="selectedCharacter.avatar || '/default-ai-avatar.png'" 
              class="msg-avatar" 
            />
            <img 
              v-else 
              :src="userProfile?.avatar || '/default-avatar.png'" 
              class="msg-avatar" 
            />
            <div class="message-content">
              <div class="message-bubble">{{ msg.content }}</div>
            </div>
          </div>
          <div v-if="isTyping" class="message-wrapper assistant">
            <img :src="selectedCharacter.avatar || '/default-ai-avatar.png'" class="msg-avatar" />
            <div class="message-content">
              <div class="message-bubble typing">
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-input-area">
          <div class="input-toolbar">
            <button class="icon-btn" title="清空会话" @click="clearConversation"><i class="fas fa-broom"></i></button>
          </div>
          <textarea 
            v-model="inputMessage" 
            placeholder="输入消息..." 
            @keydown.enter.prevent="sendMessage"
          ></textarea>
          <div class="input-footer">
            <span class="hint">Enter 发送</span>
            <button class="send-btn" :disabled="!inputMessage.trim() || isTyping" @click="sendMessage">
              发送
            </button>
          </div>
        </div>
      </template>
      <div v-else class="welcome-screen">
        <div class="welcome-content">
          <i class="fas fa-robot"></i>
          <h2>欢迎使用 AI 聊天助手</h2>
          <p>请选择一个 AI 角色开始聊天</p>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <div v-if="showProfileModal" class="modal-overlay" @click.self="showProfileModal = false">
      <div class="modal-content">
        <h3>个人资料</h3>
        <div class="profile-form">
          <div class="avatar-upload">
            <img :src="userProfile?.avatar || '/default-avatar.png'" class="large-avatar" />
            <input type="file" ref="avatarInput" @change="handleAvatarUpload" hidden />
            <button @click="$refs.avatarInput.click()">更换头像</button>
          </div>
          <div class="form-group">
            <label>显示名称</label>
            <input v-model="profileForm.display_name" placeholder="设置你的昵称" />
          </div>
          <div class="form-group">
            <label>个人简介</label>
            <textarea v-model="profileForm.bio" placeholder="写点什么吧..."></textarea>
          </div>
          <div class="modal-actions">
            <button @click="showProfileModal = false">取消</button>
            <button class="primary" @click="saveProfile">保存</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCharacterModal" class="modal-overlay" @click.self="showCharacterModal = false">
      <div class="modal-content">
        <h3>{{ characterForm.id ? '编辑角色' : '添加 AI 角色' }}</h3>
        <div class="character-form">
          <div class="avatar-upload">
            <img :src="characterForm.avatar || '/default-ai-avatar.png'" class="large-avatar" />
            <input type="file" ref="charAvatarInput" @change="handleCharAvatarUpload" hidden />
            <button @click="$refs.charAvatarInput.click()">设置头像</button>
          </div>
          <div class="form-group">
            <label>角色名</label>
            <input v-model="characterForm.name" placeholder="例如：翻译专家" />
          </div>
          <div class="form-group">
            <label>系统提示词 (System Prompt)</label>
            <textarea v-model="characterForm.system_prompt" placeholder="定义角色的行为和知识范围..."></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>模型名</label>
              <input v-model="characterForm.model_name" placeholder="deepseek-chat" />
            </div>
            <div class="form-group">
              <label>Temperature (0-1)</label>
              <input type="number" v-model="characterForm.temperature" step="0.1" min="0" max="1" />
            </div>
          </div>
          <div class="modal-actions">
            <button @click="showCharacterModal = false">取消</button>
            <button class="primary" @click="saveCharacter">确定</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showSettingsModal" class="modal-overlay" @click.self="showSettingsModal = false">
      <div class="modal-content">
        <h3>AI 服务设置</h3>
        <div class="settings-form">
          <div class="form-group">
            <label>API Base URL</label>
            <input v-model="settingsForm.base_url" placeholder="https://api.deepseek.com" />
          </div>
          <div class="form-group">
            <label>API Key</label>
            <input type="password" v-model="settingsForm.api_key" placeholder="sk-..." />
          </div>
          <div class="form-group">
            <label>默认模型</label>
            <input v-model="settingsForm.default_model" placeholder="deepseek-chat" />
          </div>
          <div class="test-connection">
            <button @click="testConnection" :disabled="testing">
              {{ testing ? '检测中...' : '检测连接' }}
            </button>
            <span v-if="testResult" :class="['test-msg', testResult.success ? 'success' : 'error']">
              {{ testResult.message }}
            </span>
          </div>
          <div class="modal-actions">
            <button @click="showSettingsModal = false">取消</button>
            <button class="primary" @click="saveSettings">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useResponsiveLayout } from '../composables/useResponsiveLayout';
import MobilePlaceholder from '../components/shared/MobilePlaceholder.vue';
import api from '../api';

const { isMobile } = useResponsiveLayout();

// State
const searchQuery = ref('');
const characters = ref([]);
const selectedCharacter = ref(null);
const activeConversation = ref(null);
const messages = ref([]);
const inputMessage = ref('');
const isTyping = ref(false);
const userProfile = ref(null);
const messageContainer = ref(null);

// Modal state
const showProfileModal = ref(false);
const showCharacterModal = ref(false);
const showSettingsModal = ref(false);
const testing = ref(false);
const testResult = ref(null);

const profileForm = ref({ display_name: '', bio: '' });
const characterForm = ref({ name: '', system_prompt: '', model_name: 'deepseek-chat', temperature: 0.7 });
const settingsForm = ref({ base_url: '', api_key: '', default_model: '' });

const filteredCharacters = computed(() => {
  if (!searchQuery.value) return characters.value;
  return characters.value.filter(c => 
    c.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// Methods
const fetchProfile = async () => {
  try {
    const res = await api.get('/user/profile/');
    userProfile.value = res.data;
    profileForm.value = { ...res.data };
  } catch (err) {
    console.error('Failed to fetch profile', err);
  }
};

const fetchCharacters = async () => {
  try {
    const res = await api.get('/ai/characters/');
    characters.value = res.data;
  } catch (err) {
    console.error('Failed to fetch characters', err);
  }
};

const selectCharacter = async (char) => {
  selectedCharacter.value = char;
  messages.value = [];
  
  try {
    // 1. Find or create conversation for this character
    const convRes = await api.get('/ai/conversations/');
    let conv = convRes.data.find(c => c.character === char.id);
    
    if (!conv) {
      const createRes = await api.post('/ai/conversations/', { 
        character: char.id,
        title: `Chat with ${char.name}`
      });
      conv = createRes.data;
    }
    
    activeConversation.value = conv;
    
    // 2. Fetch messages
    const msgRes = await api.get(`/ai/messages/${conv.id}/`);
    messages.value = msgRes.data;
    
    scrollToBottom();
  } catch (err) {
    console.error('Failed to setup conversation', err);
  }
};

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isTyping.value || !activeConversation.value) return;
  
  const content = inputMessage.value;
  messages.value.push({ role: 'user', content });
  inputMessage.value = '';
  scrollToBottom();
  
  isTyping.value = true;
  try {
    const res = await api.post('/ai/chat/', {
      conversation_id: activeConversation.value.id,
      message: content
    });
    messages.value.push(res.data);
  } catch (err) {
    console.error('Chat failed', err);
    messages.value.push({ 
      role: 'assistant', 
      content: '抱歉，我现在无法处理您的请求。请检查您的 AI 设置。' 
    });
  } finally {
    isTyping.value = false;
    scrollToBottom();
  }
};

const openAddCharacterModal = () => {
  characterForm.value = { name: '', system_prompt: '', model_name: 'deepseek-chat', temperature: 0.7 };
  showCharacterModal.value = true;
};

const saveCharacter = async () => {
  try {
    const formData = new FormData();
    formData.append('name', characterForm.value.name);
    formData.append('system_prompt', characterForm.value.system_prompt);
    formData.append('model_name', characterForm.value.model_name);
    formData.append('temperature', characterForm.value.temperature);
    if (characterForm.value.avatarFile) {
      formData.append('avatar', characterForm.value.avatarFile);
    }

    if (characterForm.value.id) {
      await api.put(`/ai/characters/${characterForm.value.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } else {
      await api.post('/ai/characters/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    showCharacterModal.value = false;
    fetchCharacters();
  } catch (err) {
    alert('保存失败: ' + JSON.stringify(err.response?.data || err.message));
  }
};

const deleteCharacter = async (char) => {
  if (!confirm(`确定要删除角色 "${char.name}" 吗？这也会删除相关聊天记录。`)) return;
  try {
    await api.delete(`/ai/characters/${char.id}/`);
    selectedCharacter.value = null;
    activeConversation.value = null;
    fetchCharacters();
  } catch (err) {
    alert('删除失败');
  }
};

const openSettingsModal = async () => {
  try {
    const res = await api.get('/ai/settings/');
    settingsForm.value = res.data;
    testResult.value = null;
    showSettingsModal.value = true;
  } catch (err) {
    console.error('Failed to fetch settings', err);
  }
};

const saveSettings = async () => {
  try {
    await api.post('/ai/settings/', settingsForm.value);
    showSettingsModal.value = false;
  } catch (err) {
    alert('保存失败');
  }
};

const testConnection = async () => {
  testing.value = true;
  testResult.value = null;
  try {
    const res = await api.post('/ai/test-connection/', settingsForm.value);
    testResult.value = res.data;
  } catch (err) {
    testResult.value = err.response?.data || { success: false, message: '连接失败' };
  } finally {
    testing.value = false;
  }
};

const handleAvatarUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append('avatar', file);
  
  try {
    const res = await api.post('/user/avatar/', formData);
    userProfile.value.avatar = res.data.avatar;
  } catch (err) {
    alert('上传失败');
  }
};

const handleCharAvatarUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  characterForm.value.avatarFile = file;
  // Show preview
  const reader = new FileReader();
  reader.onload = (ev) => {
    characterForm.value.avatar = ev.target.result;
  };
  reader.readAsDataURL(file);
};

const saveProfile = async () => {
  try {
    await api.put('/user/profile/', profileForm.value);
    showProfileModal.value = false;
    fetchProfile();
  } catch (err) {
    alert('保存失败');
  }
};

const clearConversation = async () => {
  if (!activeConversation.value) return;
  if (!confirm('确定要清空所有聊天记录吗？')) return;
  
  try {
    await api.post(`/ai/conversations/${activeConversation.value.id}/clear_messages/`);
    messages.value = [];
  } catch (err) {
    alert('清空失败');
  }
};

const scrollToBottom = async () => {
  await nextTick();
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
  }
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

onMounted(() => {
  fetchProfile();
  fetchCharacters();
});
</script>

<style scoped>
.ai-chat-container {
  display: flex;
  height: calc(100vh - 64px);
  background: #f5f5f5;
  overflow: hidden;
}

/* Sidebar Styles */
.chat-sidebar {
  width: 280px;
  background: #ebe9e8;
  border-right: 1px solid #dcdcdc;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px 15px;
  background: #f7f7f7;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
  object-fit: cover;
}

.sidebar-actions {
  display: flex;
  gap: 10px;
}

.icon-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 18px;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: rgba(0,0,0,0.05);
  color: #333;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box i {
  position: absolute;
  left: 10px;
  color: #999;
  font-size: 14px;
}

.search-box input {
  width: 100%;
  padding: 6px 10px 6px 30px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #e2e2e2;
  font-size: 13px;
  outline: none;
}

.search-box input:focus {
  background: #fff;
  border-color: #07c160;
}

.character-list {
  flex: 1;
  overflow-y: auto;
}

.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #999;
}

.text-btn {
  background: none;
  border: none;
  color: #576b95;
  cursor: pointer;
  margin-top: 10px;
}

.character-item {
  display: flex;
  padding: 12px 15px;
  cursor: pointer;
  transition: background 0.2s;
}

.character-item:hover {
  background: #d1d1d1;
}

.character-item.active {
  background: #c5c5c5;
}

.char-avatar {
  width: 45px;
  height: 45px;
  border-radius: 4px;
  margin-right: 12px;
  object-fit: cover;
}

.char-info {
  flex: 1;
  min-width: 0;
}

.char-name-time {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.char-name {
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.char-time {
  font-size: 12px;
  color: #999;
}

.char-last-msg {
  font-size: 13px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Main Chat Area Styles */
.chat-main {
  flex: 1;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  position: relative;
}

.welcome-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
}

.welcome-content {
  text-align: center;
}

.welcome-content i {
  font-size: 80px;
  margin-bottom: 20px;
}

.chat-header {
  height: 60px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e7e7e7;
  background: #f5f5f5;
}

.header-info {
  display: flex;
  align-items: center;
}

.header-avatar {
  width: 35px;
  height: 35px;
  border-radius: 4px;
  margin-right: 12px;
}

.header-name {
  font-weight: bold;
  font-size: 16px;
}

.header-model {
  font-size: 12px;
  color: #999;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message-wrapper {
  display: flex;
  max-width: 80%;
}

.message-wrapper.user {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.message-wrapper.assistant {
  align-self: flex-start;
}

.msg-avatar {
  width: 35px;
  height: 35px;
  border-radius: 4px;
  margin: 0 10px;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 15px;
  line-height: 1.5;
  position: relative;
  word-break: break-word;
}

.user .message-bubble {
  background: #95ec69;
  color: #000;
}

.assistant .message-bubble {
  background: #fff;
  color: #000;
}

/* Typing animation */
.typing span {
  animation: blink 1.4s infinite both;
  font-size: 20px;
  line-height: 10px;
}
.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0% { opacity: 0.2; }
  20% { opacity: 1; }
  100% { opacity: 0.2; }
}

.chat-input-area {
  height: 200px;
  border-top: 1px solid #e7e7e7;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.input-toolbar {
  padding: 5px 15px;
}

.chat-input-area textarea {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 20px;
  font-size: 15px;
  resize: none;
  outline: none;
  font-family: inherit;
}

.input-footer {
  padding: 10px 20px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 15px;
}

.hint {
  font-size: 12px;
  color: #999;
}

.send-btn {
  padding: 6px 20px;
  background: #f5f5f5;
  border: 1px solid #e7e7e7;
  border-radius: 4px;
  color: #07c160;
  font-weight: 500;
  cursor: pointer;
}

.send-btn:hover:not(:disabled) {
  background: #129611;
  color: #fff;
  border-color: #129611;
}

.send-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  padding: 25px;
  border-radius: 8px;
  width: 450px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 18px;
  color: #333;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #666;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.form-group textarea {
  height: 100px;
  resize: vertical;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-row .form-group {
  flex: 1;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions button {
  padding: 8px 20px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
}

.modal-actions button.primary {
  background: #07c160;
  color: #fff;
  border-color: #07c160;
}

.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.large-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin-bottom: 10px;
  object-fit: cover;
  border: 2px solid #eee;
}

.test-connection {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.test-msg {
  font-size: 12px;
}

.test-msg.success { color: #07c160; }
.test-msg.error { color: #f44336; }

/* Scrollbar Styles */
.chat-messages::-webkit-scrollbar,
.character-list::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-thumb,
.character-list::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.1);
  border-radius: 3px;
}
</style>

