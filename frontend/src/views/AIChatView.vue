<template>
  <MobilePlaceholder v-if="isMobile" title="AI 聊天" icon="🤖" />
  <div v-else class="ai-page-wrapper">
    <div class="wechat-container" @click="closeContextMenu">
      <!-- Column 1: Icon Rail (72px) -->
      <div class="icon-rail">
        <div class="rail-top">
          <img 
            :src="userProfile?.avatar || '/default-avatar.png'" 
            class="rail-user-avatar" 
            @click="showProfileModal = true"
            @error="handleAvatarError"
            title="个人资料"
          />
          <div class="rail-nav">
            <div class="nav-item active">
              <MessageCircle :size="24" />
            </div>
          </div>
        </div>
        <div class="rail-bottom">
          <button class="rail-btn" @click="openSnapshotManager" title="聊天记录同步">
            <Cloud :size="24" />
          </button>
          <button class="rail-btn" @click="openSettingsModal" title="设置">
            <Settings :size="24" />
          </button>
        </div>
      </div>

      <!-- Column 2: Conversation List (300px) -->
      <div class="conv-sidebar">
        <div class="sidebar-header-wechat">
          <div class="search-box-wechat">
            <Search :size="16" />
            <input type="text" v-model="searchQuery" placeholder="搜索" />
          </div>
          <button class="add-char-btn" title="添加角色" @click="openAddCharacterModal">
            <Plus :size="20" />
          </button>
        </div>

        <div class="character-list-container custom-scrollbar">
          <div v-if="characters.length === 0" class="empty-list-wechat">
            <p>暂无聊天对象</p>
            <button @click="openAddCharacterModal" class="text-btn-wechat">点击添加角色</button>
          </div>
          <div 
            v-for="char in filteredCharacters" 
            :key="char.id" 
            :class="['character-item-wechat', { active: selectedCharacter?.id === char.id, pinned: char.is_pinned }]"
            @click="selectCharacter(char)"
            @contextmenu.prevent="openCharacterContextMenu($event, char)"
          >
            <img 
              :src="char.avatar || '/default-ai-avatar.png'" 
              class="char-avatar-wechat" 
              @error="handleAvatarError"
            />
            <div class="char-info-wechat">
              <div class="char-name-time-wechat">
                <span class="char-name-wechat">{{ char.name }}</span>
                <span class="char-time-wechat">{{ formatTime(char.last_message_at) }}</span>
              </div>
              <div class="char-last-msg-wechat">{{ char.last_message || '暂无消息' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Column 3: Chat Area (flex: 1) -->
      <div class="chat-main">
        <template v-if="selectedCharacter">
          <div class="chat-header">
            <div class="header-info">
              <div class="header-text">
                <div class="header-name">{{ selectedCharacter.name }}</div>
                <div class="header-model">{{ selectedCharacter.model_name }}</div>
              </div>
            </div>
            <div class="header-actions">
              <button class="icon-btn" title="多选" @click="toggleMultiSelect"><CheckCircle2 :size="18" /></button>
              <button class="icon-btn" title="编辑角色" @click="editCharacter(selectedCharacter)"><Edit3 :size="18" /></button>
            </div>
          </div>

          <div class="chat-messages custom-scrollbar" ref="messageContainer">
            <template v-for="(msg, index) in processedMessages" :key="msg.id || index">
              <div v-if="msg.showDateDivider" class="date-divider">
                <span>{{ msg.dateLabel }}</span>
              </div>
              <div 
                class="message-row"
                :class="[msg.role, { 
                  'selected': isMultiSelectMode && selectedMessageIds.has(msg.id),
                  'selecting': isMultiSelectMode 
                }]"
                @contextmenu.prevent="openMessageContextMenu($event, msg)"
                @click="isMultiSelectMode && toggleMessageSelection(msg)"
              >
                <input 
                  v-if="isMultiSelectMode"
                  type="checkbox" 
                  class="message-select-checkbox"
                  :checked="selectedMessageIds.has(msg.id)" 
                  @click.stop="toggleMessageSelection(msg)"
                />

                <div class="message-wrapper" :class="msg.role">
                  <img 
                    v-if="msg.role === 'assistant'" 
                    :src="selectedCharacter.avatar || '/default-ai-avatar.png'" 
                    class="msg-avatar" 
                    @error="handleAvatarError"
                  />
                  <img 
                    v-else 
                    :src="userProfile?.avatar || '/default-avatar.png'" 
                    class="msg-avatar" 
                    @error="handleAvatarError"
                  />
                  <div class="message-content">
                    <div v-if="msg.quote" class="message-quote">
                      <span class="quote-sender">{{ msg.quote.sender_name }}:</span>
                      <span class="quote-text">{{ msg.quote.content }}</span>
                    </div>
                    <div class="message-bubble">{{ msg.content }}</div>
                    <div v-if="msg.showTime" class="message-time">{{ msg.timeLabel }}</div>
                  </div>
                </div>
              </div>
            </template>
            <div v-if="isTyping" class="message-row assistant">
              <div class="message-wrapper assistant">
                <img 
                  :src="selectedCharacter.avatar || '/default-ai-avatar.png'" 
                  class="msg-avatar" 
                  @error="handleAvatarError"
                />
                <div class="message-content">
                  <div class="message-bubble typing">
                    <span>.</span><span>.</span><span>.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        <div class="chat-input-area">
          <div v-if="isMultiSelectMode" class="multi-select-toolbar">
            <span class="select-count">已选择 {{ selectedMessageIds.size }} 条消息</span>
            <div class="toolbar-btns">
              <button @click="batchDeleteMessages" class="danger-btn"><Trash2 :size="16" /> 删除</button>
              <button @click="batchCopyMessages"><Copy :size="16" /> 复制</button>
              <button @click="cancelMultiSelect">取消</button>
            </div>
          </div>
          <template v-else>
            <div v-if="quotedMessage" class="quote-preview">
              <div class="quote-content">
                <span class="quote-sender">{{ quotedMessage.role === 'assistant' ? selectedCharacter.name : (userProfile?.display_name || '我') }}:</span>
                <span class="quote-text">{{ quotedMessage.content }}</span>
              </div>
              <button class="quote-close" @click="quotedMessage = null"><X :size="14" /></button>
            </div>
            <div class="input-toolbar">
              <button class="icon-btn" title="清空会话" @click="clearConversation"><Trash2 :size="18" /></button>
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
          </template>
        </div>
        </template>
        <div v-else class="welcome-screen">
          <div class="welcome-content">
            <Bot :size="64" />
            <h2>欢迎使用 AI 聊天助手</h2>
            <p>请选择一个 AI 角色开始聊天</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Context Menu -->
    <div v-if="contextMenu.visible" 
      class="context-menu" 
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      v-click-outside="closeContextMenu"
    >
      <template v-if="contextMenu.type === 'character'">
        <div class="menu-item" @click="togglePinCharacter(contextMenu.target)">
          <PinOff v-if="contextMenu.target.is_pinned" :size="16" />
          <Pin v-else :size="16" />
          {{ contextMenu.target.is_pinned ? '取消置顶' : '置顶' }}
        </div>
        <div class="menu-item" @click="editCharacter(contextMenu.target)">
          <Edit3 :size="16" /> 编辑角色
        </div>
        <div class="menu-item" @click.stop="handleSnapshotDetailClick">
          <Save :size="16" /> 保存版本
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item danger" @click="confirmDeleteCharacter(contextMenu.target)">
          <Trash2 :size="16" /> 删除角色
        </div>
      </template>

      <template v-if="contextMenu.type === 'message'">
        <div class="menu-item" @click="copyMessage(contextMenu.target)">
          <Copy :size="16" /> 复制
        </div>
        <div class="menu-item" @click="quoteMessage(contextMenu.target)">
          <Quote :size="16" /> 引用
        </div>
        <div class="menu-item" @click="toggleMultiSelect">
          <CheckCircle2 :size="16" /> 多选
        </div>
        <div v-if="contextMenu.target.role === 'assistant'" class="menu-item" @click="regenerateMessage(contextMenu.target)">
          <RotateCcw :size="16" /> 重新生成
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item danger" @click="deleteSingleMessage(contextMenu.target)">
          <Trash2 :size="16" /> 删除
        </div>
      </template>
    </div>

    <!-- Confirm Modal -->
    <div v-if="confirmModal.visible" class="modal-overlay" @click.self="confirmModal.visible = false">
      <div class="modal-content confirm-modal">
        <div class="modal-header">
          <h3>{{ confirmModal.title }}</h3>
          <button class="close-btn" @click="confirmModal.visible = false"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <p>{{ confirmModal.message }}</p>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="confirmModal.visible = false">{{ confirmModal.cancelText }}</button>
          <button :class="['confirm-btn', { 'danger': confirmModal.danger }]" @click="confirmModal.onConfirm">
            {{ confirmModal.confirmText }}
          </button>
        </div>
      </div>
    </div>

    <!-- Snapshot Modal -->
    <div v-if="showSnapshotModal" class="modal-overlay" style="z-index: 4000;" @click.self="showSnapshotModal = false">
      <div class="modal-content snapshot-modal" style="z-index: 4100;">
        <div class="modal-header">
          <h3>
            <button v-if="snapshotViewLevel === 'slots'" class="back-btn" @click="backToSnapshotGroups"><ChevronLeft :size="20" /></button>
            聊天记录云同步
          </h3>
          <button class="close-btn" @click="showSnapshotModal = false"><X :size="20" /></button>
        </div>
        <div class="modal-body custom-scrollbar">
          <!-- Level 1: Groups (Character List) -->
          <div v-if="snapshotViewLevel === 'groups'" class="snapshot-groups-layer">
            <div v-if="snapshotGroups.length === 0" class="empty-snapshots">
              <Archive :size="32" />
              <p>暂无已存档的人物记录</p>
            </div>
            <div v-else class="snapshot-group-list">
              <div v-for="group in snapshotGroups" :key="group.ai_uid" class="snapshot-group-item">
                <img :src="group.avatar_url || '/default-ai-avatar.png'" class="group-avatar" />
                <div class="group-info">
                  <div class="snapshot-character-title">
                    <span class="snapshot-character-name">{{ group.character_name }}</span>
                    <span class="snapshot-character-id">({{ group.ai_uid }})</span>
                  </div>
                  <div class="snapshot-meta">
                    <span>已存档 {{ group.snapshot_count }}/3</span>
                    <span class="dot">·</span>
                    <span>最后保存: {{ formatDate(group.last_saved_at) }}</span>
                  </div>
                </div>
                <div class="group-actions">
                  <button class="ss-btn" @click="enterSnapshotGroup(group)">查看存档</button>
                  <button class="ss-btn danger" @click="deleteSnapshotGroup(group)">删除全部</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Level 2: Slots (Individual Character Slots) -->
          <div v-if="snapshotViewLevel === 'slots' && selectedSnapshotGroup" class="snapshot-slots-layer">
            <div class="snapshot-target-info">
              <img :src="selectedSnapshotGroup.avatar_url || '/default-ai-avatar.png'" class="target-avatar" />
              <div class="target-text">
                <div class="snapshot-character-title">
                  <span class="snapshot-character-name">{{ selectedSnapshotGroup.character_name }}</span>
                  <span class="snapshot-character-id">({{ selectedSnapshotGroup.ai_uid }})</span>
                </div>
                <div class="snapshot-meta">
                  <span class="target-hint">每个角色固定 3 个存档槽位</span>
                </div>
              </div>
            </div>

            <div class="snapshot-list-section">
              <div class="snapshot-item" v-for="ss in snapshotSlots" :key="ss.slot_index">
                <div class="ss-info">
                  <div class="ss-name-row">
                    <span class="ss-name" :title="ss.custom_name || ss.name || `存档 ${ss.slot_index}`">
                      {{ ss.custom_name || ss.name || `存档 ${ss.slot_index}` }}
                    </span>
                    <span v-if="ss.exists" class="ss-date">{{ formatDate(ss.saved_at) }}</span>
                    <span v-else class="ss-empty-tag">空存档槽</span>
                  </div>
                  <div v-if="ss.exists" class="ss-meta">{{ ss.message_count }} 条消息</div>
                  <div v-else class="ss-meta">等待保存内容</div>
                </div>
                <div class="ss-actions">
                  <template v-if="ss.exists">
                    <button class="ss-btn" @click="confirmRestoreSnapshot(ss)" title="从云端存档下载并覆盖当前聊天记录">
                      <RotateCcw :size="14" /> 下载恢复
                    </button>
                    <button 
                      class="ss-btn" 
                      :disabled="!canSaveSnapshot"
                      @click="confirmUploadOverwrite(ss)" 
                      :title="!canSaveSnapshot ? '当前聊天记录为空，无法保存' : '把当前聊天记录上传并覆盖该存档'"
                    >
                      <Cloud :size="14" /> 上传覆盖
                    </button>
                    <button class="ss-btn" @click="openRenameSnapshotModal(ss)" title="重命名存档">
                      <Edit3 :size="14" />
                    </button>
                    <button class="ss-btn danger" @click="deleteSnapshot(ss.id)" title="删除存档">
                      <Trash2 :size="14" />
                    </button>
                  </template>
                  <button 
                    v-else 
                    class="ss-btn primary" 
                    :disabled="!canSaveSnapshot"
                    @click="openSaveSnapshotModal(ss.slot_index)"
                    :title="!canSaveSnapshot ? '当前聊天记录为空，无法保存' : '保存到此槽'"
                  >
                    <Save :size="14" /> 保存到此槽
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Snapshot Modal -->
    <div v-if="showSaveSnapshotModal" class="modal-overlay" style="z-index: 4200;" @click.self="showSaveSnapshotModal = false">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3>保存聊天存档</h3>
          <button class="close-btn" @click="showSaveSnapshotModal = false"><X :size="20" /></button>
        </div>
        <div class="settings-form">
          <div class="form-group">
            <label>存档位置：存档 {{ saveSnapshotForm.slot_index }}</label>
          </div>
          <div class="form-group">
            <label>存档自定义名称 (可选)</label>
            <input v-model="saveSnapshotForm.custom_name" maxlength="15" placeholder="例如：德语练习前" />
            <div class="input-count">{{ saveSnapshotForm.custom_name.length }}/15</div>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="showSaveSnapshotModal = false">取消</button>
            <button class="confirm-btn" @click="saveNewSnapshot">立即保存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rename Snapshot Modal -->
    <div v-if="showRenameSnapshotModal" class="modal-overlay" style="z-index: 4200;" @click.self="showRenameSnapshotModal = false">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3>重命名存档</h3>
          <button class="close-btn" @click="showRenameSnapshotModal = false"><X :size="20" /></button>
        </div>
        <div class="settings-form">
          <div class="form-group">
            <label>存档名称</label>
            <input v-model="renameSnapshotForm.custom_name" maxlength="15" placeholder="请输入新的存档名称" />
            <div class="input-count">{{ renameSnapshotForm.custom_name.length }}/15</div>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="showRenameSnapshotModal = false">取消</button>
            <button class="confirm-btn" @click="submitRenameSnapshot">保存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="confirmModal.visible" class="modal-overlay confirm-overlay" style="z-index: 5000;" @click.self="confirmModal.visible = false">
          <div class="modal-content confirm-modal" style="z-index: 5100;">
            <div class="modal-header">
              <h3>{{ confirmModal.title }}</h3>
            </div>
            <div class="modal-body">
              <p>{{ confirmModal.message }}</p>
            </div>
            <div class="modal-footer">
              <button class="cancel-btn" @click="confirmModal.visible = false">{{ confirmModal.cancelText }}</button>
              <button :class="['confirm-btn', { danger: confirmModal.danger }]" @click="confirmModal.onConfirm">
                {{ confirmModal.confirmText }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Image Cropper Modal -->
    <ImageCropperModal
      v-model:visible="showCropper"
      :image-src="cropperSource"
      @confirm="onCropperConfirm"
    />

    <!-- Profile Modal -->
    <div v-if="showProfileModal" class="modal-overlay" @click.self="showProfileModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>个人资料设置</h3>
          <button class="close-btn" @click="showProfileModal = false"><X :size="20" /></button>
        </div>
        <div class="profile-form">
          <div class="avatar-upload-section">
            <img 
              :src="profileForm.avatar || '/default-avatar.png'" 
              class="large-avatar-preview" 
              @error="handleAvatarError"
            />
            <div class="upload-btn-group">
              <input type="file" ref="avatarInput" @change="e => onFileSelect(e, 'user')" hidden accept="image/*" />
              <button class="upload-btn" @click="$refs.avatarInput.click()">更换头像</button>
              <p class="upload-hint">支持 jpg/png/webp 格式</p>
            </div>
          </div>
          <div class="form-group">
            <label>显示昵称</label>
            <input v-model="profileForm.display_name" placeholder="设置你的显示昵称" />
          </div>
          <div class="form-group">
            <label>个人简介</label>
            <textarea v-model="profileForm.bio" placeholder="向 AI 介绍一下你自己..."></textarea>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="showProfileModal = false">取消</button>
            <button class="confirm-btn" @click="saveProfile">保存修改</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Character Modal -->
    <div v-if="showCharacterModal" class="modal-overlay" @click.self="showCharacterModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ characterForm.id ? '编辑 AI 角色' : '新建 AI 角色' }}</h3>
          <button class="close-btn" @click="showCharacterModal = false"><X :size="20" /></button>
        </div>
        <div class="character-form">
          <div class="avatar-upload-section">
            <img 
              :src="characterForm.avatar || '/default-ai-avatar.png'" 
              class="large-avatar-preview" 
              @error="handleAvatarError"
            />
            <div class="upload-btn-group">
              <input type="file" ref="charAvatarInput" @change="e => onFileSelect(e, 'char')" hidden accept="image/*" />
              <button class="upload-btn" @click="$refs.charAvatarInput.click()">上传头像</button>
            </div>
          </div>
          <div class="form-group">
            <label>角色名称</label>
            <input v-model="characterForm.name" placeholder="给你的 AI 起个名字" />
          </div>
          <div v-if="characterForm.ai_uid" class="form-group">
            <label>角色码</label>
            <input :value="characterForm.ai_uid" readonly style="background: #f5f5f5; color: #888;" />
            <p class="form-hint">永久识别码，不可修改</p>
          </div>
          <div class="form-group">
            <label>系统提示词 (System Prompt)</label>
            <textarea v-model="characterForm.system_prompt" placeholder="定义 AI 的身份、语气 and 专业知识范围..."></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>模型选择</label>
              <select v-model="characterForm.model_name" class="wechat-select">
                <option value="deepseek-chat">deepseek-chat</option>
                <option value="deepseek-reasoner">deepseek-reasoner</option>
              </select>
            </div>
            <div class="form-group">
              <label>Temperature (0-1)</label>
              <input type="number" v-model="characterForm.temperature" step="0.1" min="0" max="1" />
            </div>
          </div>
          <div class="form-group">
            <label>备注 (可选)</label>
            <input v-model="characterForm.remark" placeholder="仅自己可见的备注" />
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="showCharacterModal = false">取消</button>
            <button class="confirm-btn" @click="saveCharacter">确定发布</button>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Settings Modal -->
    <div v-if="showSettingsModal" class="modal-overlay" @click.self="showSettingsModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>AI 接口服务设置</h3>
          <button class="close-btn" @click="showSettingsModal = false"><X :size="20" /></button>
        </div>
        <div class="settings-form">
          <div class="form-group">
            <label>服务提供商</label>
            <input v-model="settingsForm.provider_name" placeholder="DeepSeek" />
          </div>
          <div class="form-group">
            <label>API Base URL</label>
            <input v-model="settingsForm.base_url" placeholder="https://api.deepseek.com" />
          </div>
          <div class="form-group">
            <label>API Key</label>
            <div class="password-input">
              <input 
                :type="showKey ? 'text' : 'password'" 
                v-model="settingsForm.api_key" 
                :placeholder="settingsForm.has_api_key ? '已保存密钥，留空则不修改' : '请输入 API Key'" 
              />
              <div class="eye-icon" @click="showKey = !showKey">
                <Eye v-if="!showKey" :size="18" />
                <EyeOff v-else :size="18" />
              </div>
            </div>
            <p class="form-hint">密钥将加密保存在后端，不会泄露给前端 localStorage</p>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>默认模型</label>
              <select v-model="settingsForm.default_model" class="wechat-select">
                <option value="deepseek-chat">deepseek-chat</option>
                <option value="deepseek-reasoner">deepseek-reasoner</option>
              </select>
            </div>
            <div class="form-group">
              <label>默认 Temperature</label>
              <input type="number" v-model="settingsForm.temperature" step="0.1" min="0" max="1" />
            </div>
          </div>
          <div class="form-group">
            <label>启用状态</label>
            <select v-model="settingsForm.enabled" class="wechat-select">
              <option :value="true">已启用</option>
              <option :value="false">已禁用</option>
            </select>
          </div>
          <div class="test-connection-box">
            <button class="test-btn" @click="testConnection" :disabled="testing">
              <Plug :size="14" /> {{ testing ? '正在连接...' : '测试连接' }}
            </button>
            <div v-if="testResult" :class="['test-status', testResult.ok ? 'success' : 'error']">
              {{ testResult.message }}
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="showSettingsModal = false">取消</button>
            <button class="confirm-btn" @click="saveSettings">保存配置</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toast.visible" :class="['toast-message', toast.type]">
        <CheckCircle2 v-if="toast.type === 'success'" :size="18" />
        <AlertCircle v-else :size="18" />
        <span class="toast-text">{{ toast.message }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useResponsiveLayout } from '../composables/useResponsiveLayout';
import MobilePlaceholder from '../components/shared/MobilePlaceholder.vue';
import ImageCropperModal from '../components/shared/ImageCropperModal.vue';
import { 
  Search, Plus, Settings, MessageCircle, Edit3, Trash2, X, Eye, EyeOff, Plug, Bot, 
  Cloud, Database, Save, Archive, Pin, PinOff, Type, Share, MoreVertical, CheckCircle2, Copy, Quote, RotateCcw, AlertCircle, ChevronLeft
} from 'lucide-vue-next';
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
const showKey = ref(false);

// Multi-select state
const isMultiSelectMode = ref(false);
const selectedMessageIds = ref(new Set());

const toggleMessageSelection = (msg) => {
  if (!msg.id) return;
  const newSet = new Set(selectedMessageIds.value);
  if (newSet.has(msg.id)) {
    newSet.delete(msg.id);
  } else {
    newSet.add(msg.id);
  }
  selectedMessageIds.value = newSet;
};

// Context menu state
const contextMenu = ref({ visible: false, x: 0, y: 0, type: 'message', target: null });

// Quote state
const quotedMessage = ref(null);

// Date & Time Helpers
const shouldShowDateDivider = (msg, prev) => {
  if (!prev) return true;
  const currDate = new Date(msg.created_at).toDateString();
  const prevDate = new Date(prev.created_at).toDateString();
  return currDate !== prevDate;
};

const formatDateDivider = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) return '今天';
  if (msgDate.getTime() === yesterday.getTime()) return '昨天';
  
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const shouldShowMessageTime = (index, allMsgs) => {
  if (index === 0) return true;
  const curr = allMsgs[index];
  const prev = allMsgs[index - 1];
  
  const currTime = new Date(curr.created_at);
  const prevTime = new Date(prev.created_at);
  
  // Show time if different minute
  return currTime.getHours() !== prevTime.getHours() || 
         currTime.getMinutes() !== prevTime.getMinutes();
};

const formatMessageTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const processedMessages = computed(() => {
  return messages.value.map((msg, index) => {
    const prev = messages.value[index - 1];
    return {
      ...msg,
      showDateDivider: shouldShowDateDivider(msg, prev),
      dateLabel: formatDateDivider(msg.created_at),
      showTime: shouldShowMessageTime(index, messages.value),
      timeLabel: formatMessageTime(msg.created_at)
    };
  });
});

// Confirm modal state
const confirmModal = ref({ visible: false, title: '', message: '', danger: false, confirmText: '确定', cancelText: '取消', onConfirm: () => {} });

const showConfirm = (options) => {
  confirmModal.value = {
    visible: true,
    title: options.title || '确认提示',
    message: options.message || '',
    danger: options.danger || false,
    confirmText: options.confirmText || '确定',
    cancelText: options.cancelText || '取消',
    onConfirm: options.onConfirm || (() => { confirmModal.value.visible = false; })
  };
};

// Snapshot state
const showSnapshotModal = ref(false);
const snapshotViewLevel = ref('groups'); // 'groups' or 'slots'
const snapshotGroups = ref([]);
const selectedSnapshotGroup = ref(null); // The group object being viewed

const showSaveSnapshotModal = ref(false);
const showRenameSnapshotModal = ref(false);
const snapshots = ref([]);
const saveSnapshotForm = ref({ slot_index: 1, custom_name: '' });
const renameSnapshotForm = ref({ id: null, custom_name: '' });

const snapshotSlots = computed(() => {
  const slots = [1, 2, 3].map(slot => {
    const existing = snapshots.value.find(s => s.slot_index === slot);
    return {
      slot_index: slot,
      exists: !!existing,
      ...existing
    };
  });
  return slots.reverse(); // Display 3, 2, 1
});

const canSaveSnapshot = computed(() => {
  return !!selectedSnapshotGroup.value?.ai_uid && 
         selectedCharacter.value?.ai_uid === selectedSnapshotGroup.value.ai_uid && 
         !!activeConversation.value?.id && 
         messages.value.length > 0;
});

// Toast state
const toast = ref({ visible: false, message: '', type: 'success' });
let toastTimer = null;

const showToast = (message, type = 'success') => {
  toast.value = { visible: true, message, type };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value.visible = false;
  }, 3000);
};

// Modal state
const showProfileModal = ref(false);
const showCharacterModal = ref(false);
const showSettingsModal = ref(false);
const testing = ref(false);
const testResult = ref(null);

// Cropper state
const showCropper = ref(false);
const cropperSource = ref('');
const cropperTarget = ref(''); // 'user' or 'char'

const profileForm = ref({ display_name: '', bio: '', avatar: '' });
const characterForm = ref({ id: null, name: '', system_prompt: '', model_name: 'deepseek-chat', temperature: 0.7, avatar: '', remark: '' });
const settingsForm = ref({ provider_name: 'DeepSeek', base_url: '', api_key: '', default_model: '', temperature: 0.7, enabled: true, has_api_key: false });

const filteredCharacters = computed(() => {
  if (!searchQuery.value) return characters.value;
  return characters.value.filter(c => 
    c.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// Methods
const handleAvatarError = (e) => {
  if (e.target.dataset.errorHandled) return;
  e.target.dataset.errorHandled = "true";
  const isUser = e.target.className.includes('user') || (e.target.className.includes('msg-avatar') && !e.target.parentElement.className.includes('assistant'));
  e.target.src = isUser ? '/default-avatar.png' : '/default-ai-avatar.png';
};

const fetchProfile = async () => {
  try {
    const res = await api.get('/user/profile/');
    userProfile.value = res.data;
    profileForm.value = { 
      display_name: res.data.display_name || '',
      bio: res.data.bio || '',
      avatar: res.data.avatar || ''
    };
  } catch (err) {
    console.error('Failed to fetch profile', err);
  }
};

const fetchCharacters = async () => {
  try {
    const res = await api.get('/ai/characters/');
    // Sort by last_message_at descending
    characters.value = res.data.sort((a, b) => {
      const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Failed to fetch characters', err);
  }
};

const loadConversationForCharacter = async (char) => {
  if (!char) return;
  selectedCharacter.value = char;
  
  // Show loading state or clear old messages
  messages.value = [];

  try {
    const convRes = await api.get('/ai/conversations/');
    let conv = convRes.data.find(c => c.character === char.id);

    if (!conv) {
      const createRes = await api.post('/ai/conversations/', {
        character: char.id,
        title: `与 ${char.name} 的对话`
      });
      conv = createRes.data;
    }

    activeConversation.value = conv;

    const msgRes = await api.get(`/ai/messages/${conv.id}/`);
    messages.value = msgRes.data || [];
    
    await nextTick();
    scrollToBottom();
    
    if (messages.value.length === 0) {
      console.log('activeConversation', activeConversation.value);
      console.log('messages length', messages.value.length);
      console.log('messages', messages.value);
    }
  } catch (err) {
    console.error('Failed to load conversation', err);
    showToast('加载聊天记录失败', 'error');
  }
};

const selectCharacter = async (char) => {
  await loadConversationForCharacter(char);
};

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isTyping.value || !activeConversation.value) return;
  const content = inputMessage.value;
  const quoteData = quotedMessage.value ? {
    id: quotedMessage.value.id,
    role: quotedMessage.value.role,
    content: quotedMessage.value.content,
    sender_name: quotedMessage.value.role === 'assistant' ? selectedCharacter.value.name : (userProfile.value?.display_name || '我')
  } : null;

  const tempMsg = { role: 'user', content, quote: quoteData };
  messages.value.push(tempMsg);
  inputMessage.value = '';
  quotedMessage.value = null; // Clear quote after sending
  scrollToBottom();
  
  isTyping.value = true;
  try {
    const res = await api.post('/ai/chat/', {
      conversation_id: activeConversation.value.id,
      message: content,
      quote: quoteData
    });
    
    // Replace temp message with the one from backend to get its ID
    const index = messages.value.indexOf(tempMsg);
    if (index !== -1 && res.data.user_message) {
      messages.value[index] = { ...res.data.user_message, quote: quoteData };
    }
    
    // Add assistant message
    if (res.data.assistant_message) {
      messages.value.push(res.data.assistant_message);
      
      // Update character's last message info for sidebar
      if (selectedCharacter.value) {
        selectedCharacter.value.last_message = res.data.assistant_message.content;
        selectedCharacter.value.last_message_at = res.data.assistant_message.created_at;
        
        // Re-sort characters list to move this one to top
        characters.value.sort((a, b) => {
          const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return timeB - timeA;
        });
      }
    }
  } catch (err) {
    console.error('Chat failed', err);
    messages.value.push({ 
      role: 'assistant', 
      content: '⚠️ 消息发送失败，请检查网络连接或 AI 设置。' 
    });
  } finally {
    isTyping.value = false;
    scrollToBottom();
  }
};

const openAddCharacterModal = () => {
  characterForm.value = { id: null, ai_uid: '', name: '', system_prompt: '', model_name: 'deepseek-chat', temperature: 0.7, avatar: '', remark: '' };
  showCharacterModal.value = true;
};

const editCharacter = (char) => {
  characterForm.value = { ...char };
  showCharacterModal.value = true;
};

const saveCharacter = async () => {
  try {
    const formData = new FormData();
    formData.append('name', characterForm.value.name);
    formData.append('system_prompt', characterForm.value.system_prompt);
    formData.append('model_name', characterForm.value.model_name);
    formData.append('temperature', characterForm.value.temperature);
    formData.append('remark', characterForm.value.remark || '');
    if (characterForm.value.avatarBlob) {
      formData.append('avatar', characterForm.value.avatarBlob, 'avatar.jpg');
    }

    if (characterForm.value.id) {
      await api.put(`/ai/characters/${characterForm.value.id}/`, formData);
    } else {
      await api.post('/ai/characters/', formData);
    }
    showCharacterModal.value = false;
    fetchCharacters();
  } catch (err) {
    alert('保存失败');
  }
};

const deleteCharacter = async (char) => {
  if (!confirm(`确定要删除角色 "${char.name}" 吗？所有对话记录将无法找回。`)) return;
  try {
    await api.delete(`/ai/characters/${char.id}/`);
    if (selectedCharacter.value?.id === char.id) {
      selectedCharacter.value = null;
      activeConversation.value = null;
    }
    fetchCharacters();
  } catch (err) {
    alert('删除失败');
  }
};

const openSettingsModal = async () => {
  try {
    const res = await api.get('/ai/settings/');
    settingsForm.value = { ...res.data, api_key: '' };
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
    alert('设置保存失败');
  }
};

const testConnection = async () => {
  testing.value = true;
  testResult.value = null;
  try {
    const res = await api.post('/ai/test-connection/', settingsForm.value);
    testResult.value = res.data;
  } catch (err) {
    testResult.value = { ok: false, message: '无法连接到服务器' };
  } finally {
    testing.value = false;
  }
};

// Image Processing
const onFileSelect = (e, target) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (ev) => {
    cropperSource.value = ev.target.result;
    cropperTarget.value = target;
    showCropper.value = true;
  };
  reader.readAsDataURL(file);
  e.target.value = ''; // Reset file input
};

const onCropperConfirm = async (blob) => {
  if (cropperTarget.value === 'user') {
    const formData = new FormData();
    formData.append('avatar', blob, 'avatar.jpg');
    try {
      const res = await api.post('/user/avatar/', formData);
      profileForm.value.avatar = res.data.avatar;
      fetchProfile();
      showCropper.value = false;
    } catch (err) {
      alert('头像上传失败');
    }
  } else if (cropperTarget.value === 'char') {
    characterForm.value.avatarBlob = blob;
    characterForm.value.avatar = URL.createObjectURL(blob);
    showCropper.value = false;
  }
};

const saveProfile = async () => {
  try {
    await api.put('/user/profile/', {
      display_name: profileForm.value.display_name,
      bio: profileForm.value.bio
    });
    showProfileModal.value = false;
    fetchProfile();
  } catch (err) {
    alert('资料保存失败');
  }
};

const clearConversation = async () => {
  if (!activeConversation.value) return;
  
  confirmModal.value = {
    visible: true,
    title: '清空会话',
    message: '确定要清空此角色的所有聊天记录吗？清空后无法恢复，建议先“保存版本”。',
    danger: true,
    confirmText: '确认清空',
    cancelText: '取消',
    onConfirm: async () => {
      try {
        await api.post(`/ai/conversations/${activeConversation.value.id}/clear_messages/`);
        messages.value = [];
        confirmModal.value.visible = false;
      } catch (err) {
        alert('清空失败');
      }
    }
  };
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
  
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isYesterday) {
    return '昨天';
  }

  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  }

  return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
};

const formatDate = (timeStr) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
};

// Context Menu Methods
const openCharacterContextMenu = (e, char) => {
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    type: 'character',
    target: char
  };
};

const openMessageContextMenu = (e, msg) => {
  if (isMultiSelectMode.value) return;
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    type: 'message',
    target: msg
  };
};

const closeContextMenu = () => {
  contextMenu.value.visible = false;
};

// Character Actions
const togglePinCharacter = async (char) => {
  char.is_pinned = !char.is_pinned;
  closeContextMenu();
  // TODO: Save pin state to backend if model supports it
};

const confirmDeleteCharacter = (char) => {
  closeContextMenu();
  confirmModal.value = {
    visible: true,
    title: '删除 AI 角色',
    message: `确定要删除角色 "${char.name}" 吗？该角色的聊天记录和保存的版本也会被删除，无法恢复。`,
    danger: true,
    confirmText: '彻底删除',
    cancelText: '取消',
    onConfirm: async () => {
      await deleteCharacter(char);
      confirmModal.value.visible = false;
    }
  };
};

// Message Actions
const copyMessage = (msg) => {
  navigator.clipboard.writeText(msg.content);
  closeContextMenu();
};

const quoteMessage = (msg) => {
  quotedMessage.value = msg;
  closeContextMenu();
};

const deleteSingleMessage = async (msg) => {
  closeContextMenu();
  confirmModal.value = {
    visible: true,
    title: '删除消息',
    message: '确定要删除这条消息吗？',
    danger: true,
    confirmText: '删除',
    cancelText: '取消',
    onConfirm: async () => {
      try {
        // Assuming backend has a way to delete single message
        // If not, we can implement it or just remove from local
        messages.value = messages.value.filter(m => m.id !== msg.id);
        // await api.delete(`/ai/messages/${msg.id}/`);
        confirmModal.value.visible = false;
      } catch (err) {
        console.error('Failed to delete message', err);
      }
    }
  };
};

const regenerateMessage = async (msg) => {
  closeContextMenu();
  // 1. Remove this message and all messages after it
  const index = messages.value.indexOf(msg);
  if (index > -1) {
    const lastUserMsg = messages.value.slice(0, index).reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      messages.value = messages.value.slice(0, index);
      // 2. Resend the last user message
      inputMessage.value = lastUserMsg.content;
      await sendMessage();
    }
  }
};

// Multi-select Methods
const toggleMultiSelect = () => {
  isMultiSelectMode.value = !isMultiSelectMode.value;
  selectedMessageIds.value = new Set();
  closeContextMenu();
};

const cancelMultiSelect = () => {
  isMultiSelectMode.value = false;
  selectedMessageIds.value = new Set();
};

const batchDeleteMessages = async () => {
  if (selectedMessageIds.value.size === 0) return;
  showConfirm({
    title: '批量删除消息',
    message: `确定要删除选中的 ${selectedMessageIds.value.size} 条消息吗？`,
    danger: true,
    confirmText: '确认删除',
    onConfirm: async () => {
      messages.value = messages.value.filter(m => !selectedMessageIds.value.has(m.id));
      cancelMultiSelect();
      confirmModal.value.visible = false;
    }
  });
};

const batchCopyMessages = () => {
  const content = messages.value
    .filter(m => selectedMessageIds.value.has(m.id))
    .map(m => `[${m.role}] ${m.content}`)
    .join('\n\n');
  navigator.clipboard.writeText(content);
  cancelMultiSelect();
};

const handleSnapshotDetailClick = async () => {
  const char = contextMenu.value.target;
  if (!char) return;
  await openSnapshotDetailForCharacter(char);
};

const openSnapshotDetailForCharacter = async (char) => {
  if (!char) return;
  const targetChar = { ...char };
  closeContextMenu();
  
  // Force load conversation and messages for the character
  await loadConversationForCharacter(targetChar);
  
  selectedSnapshotGroup.value = {
    character_name: targetChar.name,
    avatar_url: targetChar.avatar || '/default-ai-avatar.png',
    character_id: targetChar.id,
    ai_uid: targetChar.ai_uid
  };
  snapshotViewLevel.value = 'slots';
  fetchSnapshotsByAiUid(targetChar.ai_uid);
  showSnapshotModal.value = true;
};

// Snapshot Methods
const fetchSnapshotGroups = async () => {
  try {
    const res = await api.get('/ai/snapshots/groups/');
    snapshotGroups.value = res.data;
  } catch (err) {
    console.error('Failed to fetch snapshot groups', err);
  }
};

const fetchSnapshotsByAiUid = async (aiUid) => {
  try {
    const res = await api.get(`/ai/snapshots/?ai_uid=${aiUid}`);
    snapshots.value = res.data;
  } catch (err) {
    console.error('Failed to fetch snapshots', err);
  }
};

const openSnapshotManager = () => {
  snapshotViewLevel.value = 'groups';
  fetchSnapshotGroups();
  showSnapshotModal.value = true;
};

const enterSnapshotGroup = (group) => {
  selectedSnapshotGroup.value = group;
  fetchSnapshotsByAiUid(group.ai_uid);
  snapshotViewLevel.value = 'slots';
};

const backToSnapshotGroups = async () => {
  snapshotViewLevel.value = 'groups';
  selectedSnapshotGroup.value = null;
  await fetchSnapshotGroups();
};

const deleteSnapshotGroup = (group) => {
  showConfirm({
    title: '删除全部存档',
    message: `确定删除“${group.character_name}”的全部聊天存档吗？3 个槽位中的记录都会被删除，无法恢复。`,
    danger: true,
    confirmText: '确认删除',
    onConfirm: async () => {
      try {
        await api.post('/ai/snapshots/delete-group/', { ai_uid: group.ai_uid });
        showToast('已删除该人物的所有存档');
        fetchSnapshotGroups();
        confirmModal.value.visible = false;
      } catch (err) {
        showToast('删除失败', 'error');
      }
    }
  });
};

const openSaveSnapshotModal = (slotIndex) => {
  // Use canSaveSnapshot computed property for validation
  if (!canSaveSnapshot.value) {
    if (!selectedCharacter.value || selectedCharacter.value.id !== selectedSnapshotGroup.value?.character_id) {
      showToast('该人物当前没有打开的聊天，不能上传当前记录', 'error');
    } else if (!activeConversation.value) {
      showToast('当前角色还没有会话，无法保存', 'error');
    } else if (messages.value.length === 0) {
      showToast('当前聊天记录为空，无法保存', 'error');
    }
    return;
  }
  saveSnapshotForm.value = { slot_index: slotIndex, custom_name: '' };
  showSaveSnapshotModal.value = true;
};

const saveNewSnapshot = async () => {
  try {
    const customName = saveSnapshotForm.value.custom_name.trim();
    const res = await api.post('/ai/snapshots/', {
      ai_uid: selectedSnapshotGroup.value.ai_uid,
      character_id: selectedSnapshotGroup.value.character_id,
      conversation_id: activeConversation.value.id,
      slot_index: saveSnapshotForm.value.slot_index,
      custom_name: customName
    });
    
    if (res.data.ok) {
      showToast(res.data.message || '保存成功');
      showSaveSnapshotModal.value = false;
      await fetchSnapshotsByAiUid(selectedSnapshotGroup.value.ai_uid);
      await fetchSnapshotGroups(); // Refresh level 1
    } else {
      showToast(res.data.message || '保存失败', 'error');
    }
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error || err.message || '保存失败';
    showToast(msg, 'error');
  }
};

const openRenameSnapshotModal = (ss) => {
  renameSnapshotForm.value = { id: ss.id, custom_name: ss.custom_name || ss.name };
  showRenameSnapshotModal.value = true;
};

const submitRenameSnapshot = async () => {
  try {
    const customName = renameSnapshotForm.value.custom_name.trim();
    const res = await api.patch(`/ai/snapshots/${renameSnapshotForm.value.id}/`, { 
      custom_name: customName 
    });
    if (res.data.ok) {
      showToast('重命名成功');
      showRenameSnapshotModal.value = false;
      fetchSnapshotsByAiUid(selectedSnapshotGroup.value.ai_uid);
    }
  } catch (err) {
    showToast(err.response?.data?.message || '重命名失败', 'error');
  }
};

const confirmUploadOverwrite = (ss) => {
  if (selectedCharacter.value?.ai_uid !== selectedSnapshotGroup.value?.ai_uid) {
    showConfirm({
      title: '无法覆盖',
      message: `当前打开的是「${selectedCharacter.value?.name || '未知'}」，不能覆盖「${selectedSnapshotGroup.value?.character_name || '未知'}」的存档。请先切换到对应 AI 角色。`,
      confirmText: '我知道了',
      onConfirm: () => { confirmModal.value.visible = false; }
    });
    return;
  }
  showConfirm({
    title: '上传覆盖存档',
    message: `确定要用当前聊天记录覆盖“${ss.custom_name || ss.name}”吗？原存档内容会被替换。`,
    danger: true,
    confirmText: '确认覆盖',
    onConfirm: async () => {
      try {
        const res = await api.post('/ai/snapshots/', {
          ai_uid: selectedSnapshotGroup.value.ai_uid,
          character_id: selectedSnapshotGroup.value.character_id,
          conversation_id: activeConversation.value.id,
          slot_index: ss.slot_index,
          custom_name: ss.custom_name || ss.name
        });
        if (res.data.ok) {
          showToast('覆盖保存成功');
          await fetchSnapshotsByAiUid(selectedSnapshotGroup.value.ai_uid);
          await fetchSnapshotGroups(); // Refresh level 1
        }
        confirmModal.value.visible = false;
      } catch (err) {
        showToast('覆盖失败', 'error');
      }
    }
  });
};

const confirmRestoreSnapshot = (ss) => {
  showConfirm({
    title: '下载恢复存档',
    message: `确定要将聊天记录恢复到“${ss.custom_name || ss.name}”吗？当前未保存的对话将丢失。`,
    onConfirm: async () => {
      try {
        // First try to restore directly
        const res = await api.post(`/ai/snapshots/${ss.id}/restore/`, {
          conversation_id: activeConversation.value?.id
        });
        
        if (res.data.ok) {
          showToast('恢复成功');
          
          // 1. Update current conversation ID if it changed
          if (res.data.conversation_id) {
            activeConversation.value = {
              ...(activeConversation.value || {}),
              id: res.data.conversation_id
            };
          }
          
          // 2. Load restored messages
          if (res.data.messages) {
            messages.value = res.data.messages;
          } else if (res.data.conversation_id) {
            const msgRes = await api.get(`/ai/messages/${res.data.conversation_id}/`);
            messages.value = msgRes.data || [];
          }
          
          // 3. UI refinements - Refresh sidebar and re-match character
          await fetchCharacters(); 
          
          // If we restored to a character that was just rebuilt or exists,
          // find it in the fresh characters list and select it
          const freshChar = characters.value.find(c => c.ai_uid === ss.ai_uid);
          if (freshChar) {
            selectedCharacter.value = freshChar;
          }
          
          await nextTick();
          scrollToBottom();
          showSnapshotModal.value = false;
        }
        confirmModal.value.visible = false;
      } catch (err) {
        showToast('恢复失败', 'error');
      }
    }
  });
};

const deleteSnapshot = (id) => {
  const ss = snapshots.value.find(s => s.id === id);
  showConfirm({
    title: '删除存档版本',
    message: `确定要删除“${ss?.custom_name || ss?.name}”吗？删除后无法恢复。`,
    danger: true,
    confirmText: '确认删除',
    onConfirm: async () => {
      try {
        await api.delete(`/ai/snapshots/${id}/`);
        showToast('删除成功');
        await fetchSnapshotsByAiUid(selectedSnapshotGroup.value.ai_uid);
        await fetchSnapshotGroups(); // Refresh level 1
        confirmModal.value.visible = false;
      } catch (err) {
        showToast('删除失败', 'error');
      }
    }
  });
};

onMounted(() => {
  fetchProfile();
  fetchCharacters();
});
</script>

<style scoped>
.snapshot-character-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.snapshot-character-name {
  font-weight: 600;
  font-size: 16px;
  color: #333;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snapshot-character-id {
  font-size: 12px;
  color: #aaa;
  font-weight: 400;
  flex-shrink: 0;
}

.snapshot-meta {
  margin-top: 4px;
  font-size: 13px;
  color: #999;
}

.ai-page-wrapper {
  height: calc(100vh - var(--navbar-height) - var(--footer-height) - 40px);
  min-height: 500px;
  max-height: 850px;
  margin: 20px auto;
  max-width: 1180px;
  width: calc(100% - 80px);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.wechat-container {
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  display: flex;
  overflow: hidden;
  border: 1px solid var(--border-color);
  position: relative;
}

/* Context Menu Styles */
.context-menu {
  position: fixed;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.15);
  padding: 5px 0;
  min-width: 150px;
  z-index: 5000;
  border: 1px solid #eee;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 15px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: #f5f5f5;
}

.menu-item.danger {
  color: #ff4d4f;
}

.menu-item.danger:hover {
  background: #fff1f0;
}

.menu-divider {
  height: 1px;
  background: #eee;
  margin: 5px 0;
}

/* Multi-select Mode Styles */
.multi-select-toolbar {
  height: 60px;
  background: #fff;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 25px;
}

.toolbar-btns {
  display: flex;
  gap: 12px;
}

.toolbar-btns button {
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-btns button.danger-btn {
  color: #ff4d4f;
  border-color: #ff4d4f;
}

/* Snapshot Styles */
.ss-empty-tag {
  font-size: 11px;
  background: #f0f0f0;
  color: #999;
  padding: 2px 6px;
  border-radius: 4px;
}

.ss-btn.primary {
  color: #07c160;
  border-color: rgba(7, 193, 96, 0.2);
}

.ss-btn.primary:hover {
  background: rgba(7, 193, 96, 0.05);
}

.ss-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(1);
}

.back-btn {
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  margin-right: 8px;
}

.back-btn:hover {
  color: #333;
}

.snapshot-groups-layer {
  padding: 10px 0;
}

.snapshot-group-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.snapshot-group-item {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #eee;
  transition: all 0.2s;
}

.snapshot-group-item:hover {
  background: #f0f0f0;
  border-color: #ddd;
}

.group-avatar {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  margin-right: 15px;
  object-fit: cover;
}

.group-info {
  flex: 1;
}

.group-actions {
  display: flex;
  gap: 10px;
}

.slot-selector {
  display: flex;
  gap: 10px;
  margin-top: 5px;
}

.slot-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.slot-btn:hover {
  border-color: #07c160;
  color: #07c160;
}

.slot-btn.active {
  background: #07c160;
  color: #fff;
  border-color: #07c160;
}

.warning-tip {
  font-size: 12px;
  color: #faad14;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  padding: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}

/* Confirm Modal Specific */
.confirm-modal {
  max-width: 320px !important;
}

.confirm-modal .modal-body {
  padding: 20px;
  text-align: center;
}

.confirm-modal .modal-body p {
  margin: 0;
  font-size: 15px;
  color: #333;
  line-height: 1.5;
}

.confirm-modal .modal-footer {
  padding: 15px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 10px;
}

.confirm-modal .modal-footer button {
  flex: 1;
}

.confirm-btn.danger {
  background: #ff4d4f !important;
  border-color: #ff4d4f !important;
}

.confirm-btn.danger:hover {
  background: #ff7875 !important;
}

/* Quote Styles */
.quote-preview {
  padding: 8px 15px;
  background: #f7f7f7;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.quote-content {
  flex: 1;
  border-left: 3px solid #ccc;
  padding-left: 10px;
  font-size: 12px;
  color: #666;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.5;
}

.quote-sender {
  font-weight: bold;
  margin-right: 5px;
  color: #888;
}

.quote-close {
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quote-close:hover {
  color: #666;
}

.message-quote {
  font-size: 12px;
  color: #777;
  background: rgba(0, 0, 0, 0.04);
  padding: 6px 10px;
  border-radius: 4px;
  border-left: 2px solid #bbb;
  margin-bottom: 4px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-btns button.danger-btn:hover {
  background: #fff1f0;
}

/* Snapshot Modal Styles */
.snapshot-modal {
  width: 550px;
}

.snapshot-target-info {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f8f8f8;
  border-radius: 8px;
  margin-bottom: 20px;
}

.target-avatar {
  width: 44px;
  height: 44px;
  border-radius: 6px;
}

.target-text {
  display: flex;
  flex-direction: column;
}

.target-hint {
  font-size: 12px;
  color: #999;
}

.snapshot-list-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.save-new-btn {
  padding: 6px 12px;
  background: #07c160;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.empty-snapshots {
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #ccc;
}

.snapshot-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border: 1px solid #eee;
  border-radius: 8px;
  transition: border-color 0.2s;
}

.snapshot-item:hover {
  border-color: #07c160;
}

.ss-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.ss-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.ss-name {
  font-weight: 500;
  font-size: 14px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.ss-date {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
}

.ss-meta {
  font-size: 12px;
  color: #888;
}

.ss-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.ss-btn {
  padding: 4px 10px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.input-count {
  font-size: 12px;
  color: #999;
  text-align: right;
  margin-top: 4px;
}

.ss-btn.danger:hover {
  color: #ff4d4f;
  border-color: #ff4d4f;
}

/* Confirm Modal Specifics */
.confirm-modal {
  width: 400px;
}

.confirm-modal .modal-body {
  padding: 20px 25px;
}

.confirm-modal .modal-body p {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

.confirm-btn.danger {
  background: #ff4d4f;
}

.confirm-btn.danger:hover {
  background: #ff7875;
}

.character-item-wechat.pinned {
  background: #f2f2f2;
}

/* Column 1: Icon Rail (72px) */
.icon-rail {
  width: 72px;
  background: #e9e9e9; /* Light gray as requested */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  flex-shrink: 0;
  border-right: 1px solid #ddd;
}

.rail-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 25px;
}

.rail-user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  cursor: pointer;
  object-fit: cover;
  transition: transform 0.2s;
  border: 1px solid #ddd;
}

.rail-user-avatar:hover {
  transform: scale(1.05);
}

.rail-nav {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.nav-item {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-size: 22px;
  cursor: pointer;
  transition: color 0.2s;
}

.nav-item.active {
  color: #07c160;
}

.rail-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.rail-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 22px;
  cursor: pointer;
  padding: 8px;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rail-btn:hover {
  color: #000;
}

/* Column 2: Conversation Sidebar (300px) */
.conv-sidebar {
  width: 300px;
  background: #f7f7f7;
  border-right: 1px solid #e7e7e7;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header-wechat {
  height: 72px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f7f7f7;
  border-bottom: 1px solid #eee;
}

.search-box-wechat {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-box-wechat svg {
  position: absolute;
  left: 10px;
  color: #888;
}

.search-box-wechat input {
  width: 100%;
  height: 32px;
  padding: 0 10px 0 32px;
  border: none;
  border-radius: 6px;
  background: #e2e2e2;
  font-size: 13px;
  outline: none;
  color: #333;
}

.add-char-btn {
  width: 32px;
  height: 32px;
  background: #e2e2e2;
  border: none;
  border-radius: 6px;
  color: #555;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  outline: none;
}

.add-char-btn:hover {
  background: #d1d1d1;
  color: #000;
}

.character-list-container {
  flex: 1;
  overflow-y: auto;
}

.character-item-wechat {
  display: flex;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.character-item-wechat:hover {
  background: #ebebeb;
}

.character-item-wechat.active {
  background: #c5c5c5;
}

.char-avatar-wechat {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  margin-right: 12px;
  object-fit: cover;
  flex-shrink: 0;
}

.char-info-wechat {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.char-name-time-wechat {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2px;
}

.char-name-wechat {
  font-weight: 500;
  color: #333;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.char-time-wechat {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
}

.char-last-msg-wechat {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Column 3: Main Chat Area */
.chat-main {
  flex: 1;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  position: relative;
}

.chat-header {
  height: 64px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e7e7e7;
  background: #f5f5f5;
}

.icon-btn {
  background: transparent;
  border: none;
  color: #666;
  font-size: 16px;
  cursor: pointer;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
  outline: none;
}

.icon-btn:hover {
  background: #e2e2e2;
  color: #333;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-row .form-group {
  flex: 1;
}

.form-hint, .upload-hint {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
}

.wechat-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: #fff;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
}

.wechat-select:focus {
  border-color: #07c160;
}

.password-input {
  position: relative;
  display: flex;
  align-items: center;
}

.eye-icon {
  position: absolute;
  right: 12px;
  cursor: pointer;
  color: #999;
  display: flex;
  align-items: center;
}

.eye-icon:hover {
  color: #666;
}

.empty-list-wechat {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  gap: 10px;
  font-size: 14px;
}

.text-btn-wechat {
  border: none;
  background: transparent;
  color: #07c160;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  transition: all 0.2s;
  outline: none;
}

.text-btn-wechat:hover {
  color: #05a854;
  text-decoration: underline;
}

.header-info {
  display: flex;
  flex-direction: column;
}

.header-name {
  font-weight: bold;
  font-size: 16px;
  color: #333;
}

.header-model {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message-row {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  transition: background-color 0.2s;
}

.message-row.selecting {
  cursor: pointer;
}

.message-row.selecting:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.message-row.selected {
  background-color: rgba(7, 193, 96, 0.05);
}

.message-row.selected .message-bubble {
  outline: 2px solid rgba(7, 193, 96, 0.3);
}

.message-select-checkbox {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.message-row.assistant .message-select-checkbox {
  left: -12px;
}

.message-row.user .message-select-checkbox {
  right: -12px;
}

.message-wrapper {
  display: flex;
  max-width: 85%;
  transition: all 0.2s ease;
}

.message-wrapper.user {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.message-wrapper.assistant {
  align-self: flex-start;
}

.date-divider {
  text-align: center;
  color: #999;
  font-size: 12px;
  margin: 16px 0;
}

.date-divider span {
  background: rgba(0, 0, 0, 0.06);
  padding: 4px 10px;
  border-radius: 10px;
}

.message-time {
  font-size: 11px;
  color: #aaa;
  margin-top: 4px;
}

.message-wrapper.user .message-time {
  text-align: right;
}

.message-wrapper.assistant .message-time {
  text-align: left;
}

.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  margin: 0 10px;
  flex-shrink: 0;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.6;
  position: relative;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.user .message-bubble {
  background: #95ec69;
  color: #000;
}

.assistant .message-bubble {
  background: #fff;
  color: #333;
  border: 1px solid #eee;
}

.chat-input-area {
  height: 180px;
  border-top: 1px solid #e7e7e7;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.input-toolbar {
  padding: 8px 15px;
  display: flex;
  gap: 12px;
}

.chat-input-area textarea {
  flex: 1;
  border: none;
  background: transparent;
  padding: 5px 20px;
  font-size: 14px;
  resize: none;
  outline: none;
  font-family: inherit;
  color: #333;
}

.input-footer {
  padding: 10px 20px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 15px;
}

.hint {
  font-size: 11px;
  color: #999;
}

.send-btn {
  padding: 6px 20px;
  background: #e9e9e9;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #07c160;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #07c160;
  color: #fff;
  border-color: #07c160;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4000;
}

.modal-content {
  background: #fff;
  border-radius: 8px;
  width: 480px;
  max-width: 90%;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
}

.profile-form, .character-form, .settings-form {
  padding: 20px;
}

.avatar-upload-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.large-avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #eee;
}

.upload-btn {
  padding: 6px 12px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
}

.form-group input, .form-group textarea, .form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-btn {
  padding: 6px 16px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-btn {
  padding: 6px 16px;
  background: #07c160;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.password-input {
  position: relative;
}

.password-input i {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: #999;
}

.test-connection-box {
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.test-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.test-status {
  font-size: 12px;
}

.test-status.success { color: #07c160; }
.test-status.error { color: #f44336; }

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.1);
  border-radius: 10px;
}

.typing span {
  animation: blink 1.4s infinite both;
  font-size: 18px;
}

@keyframes blink {
  0% { opacity: 0.2; }
  20% { opacity: 1; }
  100% { opacity: 0.2; }
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
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.2;
}

@media (max-width: 900px) {
  .ai-page-wrapper {
    width: 100%;
    margin: 0;
    height: calc(100vh - var(--navbar-height));
  }
  .wechat-container {
    border-radius: 0;
  }
}

/* Toast Styles */
.toast-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 9999;
  font-size: 14px;
  min-width: 200px;
  justify-content: center;
}

.toast-message.success {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

.toast-message.error {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}

.toast-text {
  font-weight: 500;
}

/* Toast Transition */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>

