<template>
  <div class="music-player-container" ref="playerRef" @click.stop>
    <!-- Trigger Button -->
    <button @click.stop="togglePopover" class="nav-icon-btn music-trigger" :class="{ active: showPopover }" title="音乐播放器">
      <MusicIcon :class="{ 'playing-icon': isPlaying }" />
    </button>

    <!-- Mini Player Popover (Desktop) -->
    <Teleport to="body">
      <div 
        v-if="showPopover && !isMobile" 
        class="music-popover" 
        :style="popoverStyle"
        @click.stop 
        @pointerdown.stop 
        @mousedown.stop
      >
        <input 
          ref="musicFileInputRef" 
          type="file" 
          accept=".mp3,.wav,.ogg,.flac,.m4a,.aac,audio/*" 
          multiple 
          hidden 
          @change="handleMusicFileSelected" 
        />
        <div class="music-player-mini">
          <div class="music-now-title" :title="currentTrack?.name">
            {{ currentTrack?.name || '暂无播放音乐' }}
          </div>

          <div class="music-progress-row">
            <span class="time">{{ formatTime(displayCurrentTime) }}</span>
            <input 
              type="range" 
              min="0" 
              :max="duration || 0" 
              :value="displayCurrentTime" 
              @pointerdown.stop="startSeeking" 
              @touchstart.stop="startSeeking" 
              @input.stop="updateSeekPreview" 
              @change.stop="commitSeek" 
              @pointerup.stop="commitSeek" 
              @touchend.stop="commitSeek"
              class="music-range"
            />
            <span class="time">{{ formatTime(duration) }}</span>
          </div>

          <div class="music-controls-row">
            <button @click="prevTrack" class="ctrl-btn" title="上一首">
              <SkipBackIcon size="18" />
            </button>
            <button @click="togglePlay" class="ctrl-btn play-btn" :title="isPlaying ? '暂停' : '播放'">
              <PauseIcon v-if="isPlaying" size="20" />
              <PlayIcon v-else size="20" />
            </button>
            <button @click="nextTrack" class="ctrl-btn" title="下一首">
              <SkipForwardIcon size="18" />
            </button>
            <button @click="togglePlayMode" class="ctrl-btn mode-btn" :title="playModeLabel">
              <RepeatIcon v-if="playMode === 'order'" size="18" />
              <ShuffleIcon v-else-if="playMode === 'random'" size="18" />
              <Repeat1Icon v-else size="18" />
              <span class="mode-text">{{ playModeLabel }}</span>
            </button>
            <button 
              @click.stop.prevent="toggleDetailPanel" 
              @pointerdown.stop 
              @mousedown.stop
              class="ctrl-btn more-btn" 
              :class="{ active: showDetail }" 
              title="播放列表"
            >
              <MoreHorizontalIcon size="18" />
            </button>
          </div>

          <div class="music-volume-row">
            <button @click.stop="toggleMute" class="ctrl-btn mute-btn" :title="isMuted ? '取消静音' : '静音'">
              <VolumeXIcon v-if="isMuted || volume === 0" size="16" />
              <Volume2Icon v-else size="16" />
            </button>
            <input 
              type="range" 
              min="0" 
              max="100" 
              v-model.number="volume" 
              @input="applyVolume" 
              class="volume-range"
            />
            <span class="volume-value">{{ isMuted ? 0 : volume }}%</span>
          </div>
        </div>

        <!-- Detail Panel (Track List) -->
        <div v-if="showDetail" class="music-detail-panel">
          <!-- Source Toggle Tabs -->
          <div class="source-tabs">
            <button 
              class="source-tab" 
              :class="{ active: activeLibrary === 'cloud' }"
              @click="switchLibrary('cloud')"
            >
              <CloudIcon size="14" /> 云端库
            </button>
            <button 
              class="source-tab" 
              :class="{ active: activeLibrary === 'local' }"
              @click="switchLibrary('local')"
            >
              <HardDriveIcon size="14" /> 本地库
            </button>
          </div>

          <div class="detail-header">
            <span class="list-title" v-if="!isManaging">
              {{ activeLibrary === 'local' ? '本地列表' : '播放列表' }}({{ currentTracks.length }})
            </span>
            <div class="batch-title" v-else>
              <span class="batch-title-main">批量管理</span>
              <span class="batch-title-sub">已选 {{ selectedIds.size }}</span>
            </div>
            
            <div class="header-actions">
              <template v-if="!isManaging">
                <!-- Local Actions -->
                <template v-if="activeLibrary === 'local'">
                  <button @click="toggleManageMode" class="manage-btn" title="批量管理">
                    <SettingsIcon size="14" /> 管理
                  </button>
                  <button @click="selectLocalFolder" class="add-btn" title="选择音乐文件夹">
                    <PlusIcon size="14" /> 添加
                  </button>
                  <button @click="scanLocalMusic" class="refresh-btn" :disabled="isScanning" title="重新扫描本地文件夹">
                    <RefreshCwIcon size="14" :class="{ 'spinning': isScanning }" /> 扫描
                  </button>
                </template>

                <!-- Cloud Actions -->
                <template v-else>
                  <button @click="toggleManageMode" class="manage-btn" title="批量管理">
                    <SettingsIcon size="14" /> 管理
                  </button>
                  <button @click="openMusicFilePicker" class="add-btn" title="添加音乐" :disabled="isUploading">
                    <PlusIcon size="14" /> 添加
                  </button>
                  <button @click="showSyncModal" class="refresh-btn" title="打开同步面板">
                    <RefreshCwIcon size="14" /> 同步
                  </button>
                </template>
              </template>

              <!-- Batch Mode Actions -->
              <template v-else>
                <button @click="selectAllTracks" class="batch-btn compact-two">
                  <span>全</span><span>选</span>
                </button>
                <button @click="clearSelection" class="batch-btn compact-two">
                  <span>清</span><span>空</span>
                </button>
                <!-- Blue folder button for local, none for cloud -->
                <button v-if="activeLibrary === 'local'" @click="selectLocalFolder" class="batch-btn folder icon-only local-folder-btn">
                  <FolderOpenIcon size="18" />
                </button>
                <button 
                  @click="askBatchDelete" 
                  class="batch-btn delete compact-two" 
                  :disabled="selectedIds.size === 0"
                >
                  <span>删</span><span>除</span>
                </button>
                <button @click="toggleManageMode" class="batch-btn exit compact-two">
                  <span>退</span><span>出</span>
                </button>
              </template>
            </div>
          </div>

          <div class="music-track-list">
            <!-- Empty / Status States for Local -->
            <template v-if="activeLibrary === 'local'">
              <div v-if="!isFileSystemSupported" class="status-empty">
                <p>当前浏览器不支持本地文件夹访问</p>
                <p class="sub">请使用 Chrome/Edge 桌面版</p>
              </div>
              <div v-else-if="!localDirHandle" class="status-empty">
                <p>尚未关联本地音乐文件夹</p>
                <button @click="selectLocalFolder" class="m-btn-primary">立即选择</button>
              </div>
              <div v-else-if="localPermission === 'prompt'" class="status-empty">
                <p>需要读取文件夹权限以加载列表</p>
                <button @click="requestLocalPermission" class="m-btn-primary">授权读取</button>
              </div>
              <div v-else-if="localTracks.length === 0" class="status-empty">
                <p>文件夹中未发现音乐文件</p>
                <p class="sub">支持: mp3, flac, wav, m4a, ogg</p>
                <button @click="scanLocalMusic" class="m-btn-secondary">重新扫描</button>
              </div>
            </template>

            <!-- Empty State for Remote -->
            <div v-else-if="cloudTracks.length === 0" class="empty-list">
              暂无云端音乐，请上传或刷新
            </div>

            <!-- Track Items (Common structure for both) -->
            <div 
              v-for="(track, index) in currentTracks" 
              :key="track.id"
              class="music-track-item"
              :class="{ 
                active: currentTrackIndex === index, 
                disabled: track.disabled,
                selected: selectedIds.has(track.id)
              }"
              @click="isManaging ? toggleSelectTrack(track.id) : null"
            >
              <div class="track-prefix" v-if="isManaging">
                <CheckSquareIcon v-if="selectedIds.has(track.id)" size="16" class="check-icon selected" />
                <SquareIcon v-else size="16" class="check-icon" />
              </div>
              <div class="track-info" @click="!isManaging ? playTrack(index) : null">
                <span class="track-name" :title="track.name">{{ track.name }}</span>
                <span v-if="track.error" class="track-error-label">损坏</span>
              </div>
              <div class="track-actions" v-if="!isManaging">
                <button 
                  v-if="track.source === 'remote'"
                  @click.stop="askRenameTrack(track, index)" 
                  class="action-btn rename-btn" 
                >
                  <PencilIcon size="14" />
                </button>
                <button 
                  @click.stop="toggleTrackDisabled(index)" 
                  class="action-btn disable-btn" 
                >
                  <VolumeXIcon v-if="!track.disabled" size="14" />
                  <Volume2Icon v-else size="14" />
                </button>
                <button @click.stop="askDeleteTrack(track, index)" class="action-btn delete-btn">
                  <Trash2Icon size="14" />
                </button>
              </div>
            </div>
          </div>

          <div class="detail-footer" v-if="!isManaging">
            <template v-if="activeLibrary === 'local' && localDirHandle">
              <span class="folder-name">📁 {{ localDirHandle.name }}</span>
              <button @click="clearLocalLibrary" class="clear-lib-btn">清除库</button>
            </template>
            <template v-else>
              云端音乐同步自 media/music 目录
            </template>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Mobile Player Overlay -->
    <Teleport to="body">
      <div 
        v-if="showPopover && isMobile" 
        class="mobile-player-overlay" 
        @click="closePopover"
      >
        <div class="mobile-player-panel" @click.stop>
          <div class="mobile-player-header">
            <span class="mobile-now-playing">正在播放</span>
            <button class="mobile-close-btn" @click="closePopover">
              <XIcon size="24" />
            </button>
          </div>

          <!-- Use shared structure for mobile too -->
          <div class="music-player-mini">
            <div class="music-now-title" :title="currentTrack?.name">
              {{ currentTrack?.name || '暂无播放音乐' }}
            </div>

            <div class="music-progress-row">
              <span class="time">{{ formatTime(displayCurrentTime) }}</span>
              <input 
                type="range" 
                min="0" 
                :max="duration || 0" 
                :value="displayCurrentTime" 
                @pointerdown.stop="startSeeking" 
                @touchstart.stop="startSeeking" 
                @input.stop="updateSeekPreview" 
                @change.stop="commitSeek" 
                @pointerup.stop="commitSeek" 
                @touchend.stop="commitSeek"
                class="music-range"
              />
              <span class="time">{{ formatTime(duration) }}</span>
            </div>

            <div class="music-controls-row">
              <button @click="prevTrack" class="ctrl-btn" title="上一首">
                <SkipBackIcon size="24" />
              </button>
              <button @click="togglePlay" class="ctrl-btn play-btn" :title="isPlaying ? '暂停' : '播放'">
                <PauseIcon v-if="isPlaying" size="28" />
                <PlayIcon v-else size="28" />
              </button>
              <button @click="nextTrack" class="ctrl-btn" title="下一首">
                <SkipForwardIcon size="24" />
              </button>
              <button @click="togglePlayMode" class="ctrl-btn mode-btn" :title="playModeLabel">
                <RepeatIcon v-if="playMode === 'order'" size="20" />
                <ShuffleIcon v-else-if="playMode === 'random'" size="20" />
                <Repeat1Icon v-else size="20" />
                <span class="mode-text">{{ playModeLabel }}</span>
              </button>
              <button @click.stop.prevent="toggleDetailPanel" class="ctrl-btn more-btn" :class="{ active: showDetail }" title="播放列表">
                <MoreHorizontalIcon size="20" />
              </button>
            </div>

            <div class="music-volume-row">
              <button @click.stop="toggleMute" class="ctrl-btn mute-btn" :title="isMuted ? '取消静音' : '静音'">
                <VolumeXIcon v-if="isMuted || volume === 0" size="18" />
                <Volume2Icon v-else size="18" />
              </button>
              <input 
                type="range" 
                min="0" 
                max="100" 
                v-model.number="volume" 
                @input="applyVolume" 
                class="volume-range"
              />
              <span class="volume-value">{{ isMuted ? 0 : volume }}%</span>
            </div>
          </div>

          <!-- Reuse same detail panel for mobile to ensure feature parity -->
          <div v-if="showDetail" class="music-detail-panel mobile-detail">
            <!-- Source Toggle Tabs -->
            <div class="source-tabs">
              <button 
                class="source-tab" 
                :class="{ active: activeLibrary === 'cloud' }"
                @click="switchLibrary('cloud')"
              >
                <CloudIcon size="14" /> 云端库
              </button>
              <button 
                class="source-tab" 
                :class="{ active: activeLibrary === 'local' }"
                @click="switchLibrary('local')"
              >
                <HardDriveIcon size="14" /> 本地库
              </button>
            </div>

            <div class="detail-header">
              <span class="list-title" v-if="!isManaging">
                {{ activeLibrary === 'local' ? '本地列表' : '播放列表' }}({{ currentTracks.length }})
              </span>
              <div class="batch-title" v-else>
                <span class="batch-title-main">批量管理</span>
                <span class="batch-title-sub">已选 {{ selectedIds.size }}</span>
              </div>
              
              <div class="header-actions">
                <template v-if="!isManaging">
                  <!-- Local Actions -->
                  <template v-if="activeLibrary === 'local'">
                    <button @click="toggleManageMode" class="manage-btn" title="批量管理">
                      <SettingsIcon size="14" /> 管理
                    </button>
                    <button @click="selectLocalFolder" class="add-btn" title="选择音乐文件夹">
                      <PlusIcon size="14" /> 添加
                    </button>
                    <button @click="scanLocalMusic" class="refresh-btn" :disabled="isScanning" title="重新扫描本地文件夹">
                      <RefreshCwIcon size="14" :class="{ 'spinning': isScanning }" /> 扫描
                    </button>
                  </template>

                  <!-- Cloud Actions -->
                  <template v-else>
                    <button @click="toggleManageMode" class="manage-btn" title="批量管理">
                      <SettingsIcon size="14" /> 管理
                    </button>
                    <button @click="openMusicFilePicker" class="add-btn" title="添加音乐" :disabled="isUploading">
                      <PlusIcon size="14" /> 添加
                    </button>
                    <button @click="showSyncModal" class="refresh-btn" title="打开同步面板">
                      <RefreshCwIcon size="14" /> 同步
                    </button>
                  </template>
                </template>

                <!-- Batch Mode Actions -->
                <template v-else>
                  <button @click="selectAllTracks" class="batch-btn compact-two">
                    <span>全</span><span>选</span>
                  </button>
                  <button @click="clearSelection" class="batch-btn compact-two">
                    <span>清</span><span>空</span>
                  </button>
                  <!-- Blue folder button for local, none for cloud -->
                  <button v-if="activeLibrary === 'local'" @click="selectLocalFolder" class="batch-btn folder icon-only local-folder-btn">
                    <FolderOpenIcon size="18" />
                  </button>
                  <button 
                    @click="askBatchDelete" 
                    class="batch-btn delete compact-two" 
                    :disabled="selectedIds.size === 0"
                  >
                    <span>删</span><span>除</span>
                  </button>
                  <button @click="toggleManageMode" class="batch-btn exit compact-two">
                    <span>退</span><span>出</span>
                  </button>
                </template>
              </div>
            </div>

            <div class="music-track-list">
              <!-- Empty / Status States for Local -->
              <template v-if="activeLibrary === 'local'">
                <div v-if="!isFileSystemSupported" class="status-empty">
                  <p>当前浏览器不支持本地文件夹访问</p>
                  <p class="sub">请使用 Chrome/Edge 桌面版</p>
                </div>
                <div v-else-if="!localDirHandle" class="status-empty">
                  <p>尚未关联本地音乐文件夹</p>
                  <button @click="selectLocalFolder" class="m-btn-primary">立即选择</button>
                </div>
                <div v-else-if="localPermission === 'prompt'" class="status-empty">
                  <p>需要读取文件夹权限以加载列表</p>
                  <button @click="requestLocalPermission" class="m-btn-primary">授权读取</button>
                </div>
                <div v-else-if="localTracks.length === 0" class="status-empty">
                  <p>文件夹中未发现音乐文件</p>
                  <p class="sub">支持: mp3, flac, wav, m4a, ogg</p>
                  <button @click="scanLocalMusic" class="m-btn-secondary">重新扫描</button>
                </div>
              </template>

              <!-- Empty State for Remote -->
              <div v-else-if="tracks.length === 0" class="empty-list">
                暂无云端音乐，请上传或刷新
              </div>

              <!-- Track Items (Common structure for both) -->
              <div 
                v-for="(track, index) in currentTracks" 
                :key="track.id"
                class="music-track-item"
                :class="{ 
                  active: currentTrackIndex === index, 
                  disabled: track.disabled,
                  selected: selectedIds.has(track.id)
                }"
                @click="isManaging ? toggleSelectTrack(track.id) : null"
              >
                <div class="track-prefix" v-if="isManaging">
                  <CheckSquareIcon v-if="selectedIds.has(track.id)" size="16" class="check-icon selected" />
                  <SquareIcon v-else size="16" class="check-icon" />
                </div>
                <div class="track-info" @click="!isManaging ? playTrack(index) : null">
                  <span class="track-name" :title="track.name">{{ track.name }}</span>
                  <span v-if="track.error" class="track-error-label">损坏</span>
                </div>
                <div class="track-actions" v-if="!isManaging">
                  <button 
                    v-if="track.source === 'remote'"
                    @click.stop="askRenameTrack(track, index)" 
                    class="action-btn rename-btn" 
                  >
                    <PencilIcon size="14" />
                  </button>
                  <button 
                    @click.stop="toggleTrackDisabled(index)" 
                    class="action-btn disable-btn" 
                  >
                    <VolumeXIcon v-if="!track.disabled" size="14" />
                    <Volume2Icon v-else size="14" />
                  </button>
                  <button @click.stop="askDeleteTrack(track, index)" class="action-btn delete-btn">
                    <Trash2Icon size="14" />
                  </button>
                </div>
              </div>
            </div>

            <div class="detail-footer" v-if="!isManaging">
              <template v-if="activeLibrary === 'local' && localDirHandle">
                <span class="folder-name">📁 {{ localDirHandle.name }}</span>
                <button @click="clearLocalLibrary" class="clear-lib-btn">清除库</button>
              </template>
              <template v-else>
                云端音乐同步自 media/music 目录
              </template>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modals -->
    <div v-if="showDeleteModal || showRenameModal || showBatchDeleteModal || showInfoModal || syncModalVisible" class="music-modal-mask" @click.self="closeMusicModal">
      
      <!-- Sync Modal -->
      <div v-if="syncModalVisible" class="music-modal sync-modal">
        <div class="modal-header">云端同步</div>
        <div class="modal-body">
          <div class="sync-quota-info">
            <div class="quota-bar-container">
              <div 
                class="quota-bar-used" 
                :style="{ width: Math.min(100, (totalSyncSize / cloudQuota.limitBytes) * 100) + '%' }"
                :class="{ 'exceeded': isQuotaExceeded }"
              ></div>
            </div>
            <div class="quota-text">
              容量: {{ formatFileSize(totalSyncSize) }} / {{ formatFileSize(cloudQuota.limitBytes) }}
              <span v-if="isQuotaExceeded" class="quota-warning"> (已超限)</span>
            </div>
          </div>

          <div class="sync-sections">
            <div v-if="syncPlan.uploadCandidates.length > 0" class="sync-section">
              <div class="section-title">待上传 ({{ syncPlan.uploadCandidates.length }})</div>
              <div class="candidate-list">
                <div 
                  v-for="track in syncPlan.uploadCandidates" 
                  :key="track.id" 
                  class="candidate-item"
                  @click="toggleSyncUpload(track.id)"
                >
                  <CheckSquareIcon v-if="syncPlan.selectedUploadIds.has(track.id)" size="14" class="check-icon selected" />
                  <SquareIcon v-else size="14" class="check-icon" />
                  <span class="name">{{ track.name }}</span>
                  <span class="size">{{ formatFileSize(track.fileSize) }}</span>
                </div>
              </div>
            </div>

            <div v-if="cloudTracks.length > 0" class="sync-section">
              <div class="section-title">待清理 ({{ cloudTracks.length }})</div>
              <div class="candidate-list">
                <div 
                  v-for="track in cloudTracks" 
                  :key="track.id" 
                  class="candidate-item delete-candidate"
                  @click="toggleSyncDelete(track.id)"
                >
                  <CheckSquareIcon v-if="syncPlan.selectedDeleteIds.has(track.id)" size="14" class="check-icon selected" />
                  <SquareIcon v-else size="14" class="check-icon" />
                  <span class="name">{{ track.name }}</span>
                  <span class="size">-{{ formatFileSize(track.fileSize) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeMusicModal" class="modal-btn cancel">取消</button>
          <button 
            @click="confirmSync" 
            class="modal-btn confirm" 
            :disabled="isQuotaExceeded || (syncPlan.selectedUploadIds.size === 0 && syncPlan.selectedDeleteIds.size === 0)"
          >
            确认同步
          </button>
        </div>
      </div>
      <!-- Info Modal -->
      <div v-if="showInfoModal" class="music-modal">
        <div class="modal-header" :class="infoModalType">
          {{ infoModalTitle }}
        </div>
        <div class="modal-body">
          <p>{{ infoModalMessage }}</p>
        </div>
        <div class="modal-footer">
          <button @click="closeMusicModal" class="modal-btn confirm">
            确定
          </button>
        </div>
      </div>

      <!-- Delete Single Modal -->
      <div v-if="showDeleteModal" class="music-modal">
        <div class="modal-header">删除音乐</div>
        <div class="modal-body">
          <p>确定要删除这首歌吗？</p>
          <div class="target-name">{{ pendingDeleteTrack?.name }}</div>
          <p class="warning-text">该操作会永久删除 media/music 中的文件</p>
        </div>
        <div class="modal-footer">
          <button @click="closeMusicModal" class="modal-btn cancel">取消</button>
          <button @click="confirmDeleteTrack" class="modal-btn confirm-delete">确认删除</button>
        </div>
      </div>

      <!-- Batch Delete Modal -->
      <div v-if="showBatchDeleteModal" class="music-modal">
        <div class="modal-header">批量删除</div>
        <div class="modal-body">
          <p>确定删除选中的 <span class="highlight">{{ selectedIds.size }}</span> 首音乐吗？</p>
          <p class="warning-text">该操作会永久删除 media/music 中的文件</p>
        </div>
        <div class="modal-footer">
          <button @click="closeMusicModal" class="modal-btn cancel">取消</button>
          <button @click="confirmBatchDelete" class="modal-btn confirm-delete">确认删除全部</button>
        </div>
      </div>

      <!-- Rename Modal -->
      <div v-if="showRenameModal" class="music-modal">
        <div class="modal-header">重命名</div>
        <div class="modal-body">
          <p>请输入新的歌曲名（不含扩展名）：</p>
          <div class="input-group">
            <input 
              v-model="renameName" 
              type="text" 
              class="modal-input" 
              placeholder="歌曲名字" 
              @keyup.enter="confirmRenameTrack"
              ref="renameInput"
            />
            <span class="extension-text">{{ splitName(pendingRenameTrack?.name || '').ext }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeMusicModal" class="modal-btn cancel">取消</button>
          <button @click="confirmRenameTrack" class="modal-btn confirm">确认重命名</button>
        </div>
      </div>
    </div>

    <!-- Hidden Audio Element -->
    <audio 
      ref="audioRef" 
      :src="audioSrc"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @ended="onTrackEnded"
      @error="onAudioError"
    ></audio>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { 
  Music as MusicIcon, 
  Play as PlayIcon, 
  Pause as PauseIcon, 
  SkipBack as SkipBackIcon, 
  SkipForward as SkipForwardIcon, 
  Repeat as RepeatIcon, 
  Repeat1 as Repeat1Icon,
  Shuffle as ShuffleIcon,
  MoreHorizontal as MoreHorizontalIcon,
  Plus as PlusIcon,
  Trash2 as Trash2Icon,
  Volume2 as Volume2Icon,
  VolumeX as VolumeXIcon,
  RefreshCw as RefreshCwIcon,
  X as XIcon,
  Pencil as PencilIcon,
  Settings as SettingsIcon,
  Check as CheckIcon,
  Square as SquareIcon,
  CheckSquare as CheckSquareIcon,
  FolderOpen as FolderOpenIcon,
  HardDrive as HardDriveIcon,
  Cloud as CloudIcon,
  ShieldAlert as ShieldAlertIcon,
  ShieldCheck as ShieldCheckIcon
} from '@lucide/vue';
import api from '../api';
import { localMusicService } from '../services/localMusicService';
import { musicDb } from '../utils/musicDb';

const audioRef = ref(null);
const playerRef = ref(null);
const showPopover = ref(false);
const showDetail = ref(false);
const triggerRect = ref(null);

const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const playMode = ref(localStorage.getItem('music_play_mode') || 'order'); // order, random, repeat
const currentTrackIndex = ref(-1);
const cloudTracks = ref([]);
const isRefreshing = ref(false);
const skipAttempts = ref(0);

// --- Local Music State ---
const activeLibrary = ref(localStorage.getItem('music_active_source') || 'cloud'); // 'cloud' | 'local'
const localTracks = ref([]);
const isScanning = ref(false);
const localDirHandle = ref(null);
const localPermission = ref('prompt'); // 'granted' | 'denied' | 'prompt'
const localAudioUrl = ref('');
const isFileSystemSupported = localMusicService.isSupported();

const currentTracks = computed(() => {
  return activeLibrary.value === 'local' ? localTracks.value : cloudTracks.value;
});

// Cloud Quota & Sync
const cloudQuota = ref({ usedBytes: 0, limitBytes: 200 * 1024 * 1024 }); // 200MB limit
const syncModalVisible = ref(false);
const syncPlan = ref({
  uploadCandidates: [],
  deleteCandidates: [],
  selectedUploadIds: new Set(),
  selectedDeleteIds: new Set()
});

const totalSyncSize = computed(() => {
  let size = cloudQuota.value.usedBytes;
  
  // Add selected uploads
  syncPlan.value.uploadCandidates.forEach(track => {
    if (syncPlan.value.selectedUploadIds.has(track.id)) {
      size += (track.fileSize || 0);
    }
  });
  
  // Subtract selected deletes
  cloudTracks.value.forEach(track => {
    if (syncPlan.value.selectedDeleteIds.has(track.id)) {
      size -= (track.fileSize || 0);
    }
  });
  
  return Math.max(0, size);
});

const isQuotaExceeded = computed(() => {
  return totalSyncSize.value > cloudQuota.value.limitBytes;
});

// Mobile state
const isMobile = ref(window.innerWidth <= 768);
const updateMobileState = () => {
  isMobile.value = window.innerWidth <= 768;
};

// Navigation & History
const loadingTrackId = ref(null);
const handlingAudioError = ref(false);
const erroredTrackIds = ref(new Set());
const playHistory = ref([]);
const MAX_HISTORY = 100;

const pushHistory = (index) => {
  if (index < 0) return;
  playHistory.value.push(index);
  if (playHistory.value.length > MAX_HISTORY) {
    playHistory.value.shift();
  }
};

// Volume state
const volume = ref(Number(localStorage.getItem('music_volume') || 70));
const isMuted = ref(localStorage.getItem('music_muted') === 'true');
const lastVolumeBeforeMute = ref(Number(localStorage.getItem('music_last_volume') || 70));

// Seek state
const isSeeking = ref(false);
const seekValue = ref(0);

const displayCurrentTime = computed(() => {
  return isSeeking.value ? seekValue.value : currentTime.value;
});

// Batch management
const isManaging = ref(false);
const selectedIds = ref(new Set());

// Modals
const showDeleteModal = ref(false);
const pendingDeleteTrack = ref(null);
const pendingDeleteIndex = ref(-1);

const showBatchDeleteModal = ref(false);

const showRenameModal = ref(false);
const pendingRenameTrack = ref(null);
const pendingRenameIndex = ref(-1);
const renameName = ref('');

// Upload state
const musicFileInputRef = ref(null);
const isUploading = ref(false);

// Info Modal state
const showInfoModal = ref(false);
const infoModalTitle = ref('');
const infoModalMessage = ref('');
const infoModalType = ref('info'); // info | success | error

const currentTrack = computed(() => {
  const list = currentTracks.value;
  if (currentTrackIndex.value >= 0 && currentTrackIndex.value < list.length) {
    return list[currentTrackIndex.value];
  }
  return null;
});

const audioSrc = computed(() => {
  if (!currentTrack.value) return '';
  
  if (currentTrack.value.source === 'local') {
    return localAudioUrl.value;
  }

  const url = currentTrack.value.url;
  if (!url) return '';

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const hostname = window.location.hostname;
  const port = window.location.port;

  const isLocalHost = 
    hostname === '127.0.0.1' || 
    hostname === 'localhost';

  const isViteDev = 
    isLocalHost && port === '5173';

  // 本地前端开发：Vite 5173 页面，需要去 Django 8000 取 media
  if (isViteDev && url.startsWith('/media/')) {
    return `http://127.0.0.1:8000${url}`;
  }

  return url;
});

const playModeLabel = computed(() => {
  const labels = {
    order: '顺序',
    random: '随机',
    repeat: '单曲'
  };
  return labels[playMode.value];
});

const updateTriggerRect = () => {
  const btn = playerRef.value?.querySelector('.music-trigger');
  if (btn) {
    triggerRect.value = btn.getBoundingClientRect();
  }
};

const popoverStyle = computed(() => {
  if (!triggerRect.value || isMobile.value) return {};
  return {
    position: 'fixed',
    top: `${triggerRect.value.bottom + 12}px`,
    right: `${window.innerWidth - triggerRect.value.right}px`,
    zIndex: 2500
  };
});

const togglePopover = () => {
  updateTriggerRect();
  showPopover.value = !showPopover.value;
  if (!showPopover.value) showDetail.value = false;
};

const toggleDetailPanel = () => {
  showDetail.value = !showDetail.value;
};

const closePopover = () => {
  showPopover.value = false;
  showDetail.value = false;
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const applyVolume = () => {
  const audio = audioRef.value;
  if (!audio) return;
  audio.volume = isMuted.value ? 0 : volume.value / 100;
};

const switchLibrary = (type) => {
  activeLibrary.value = type;
  isManaging.value = false;
  selectedIds.value.clear();
};

watch([volume, isMuted], () => {
  localStorage.setItem('music_volume', String(volume.value));
  localStorage.setItem('music_muted', String(isMuted.value));
  applyVolume();
});

watch(activeLibrary, (newSource) => {
  localStorage.setItem('music_active_source', newSource);
  currentTrackIndex.value = -1;
  isPlaying.value = false;
  if (audioRef.value) audioRef.value.pause();
  if (localAudioUrl.value) {
    URL.revokeObjectURL(localAudioUrl.value);
    localAudioUrl.value = '';
  }
});

const toggleMute = () => {
  if (!isMuted.value) {
    lastVolumeBeforeMute.value = volume.value || lastVolumeBeforeMute.value || 70;
    localStorage.setItem('music_last_volume', String(lastVolumeBeforeMute.value));
    isMuted.value = true;
  } else {
    isMuted.value = false;
    volume.value = lastVolumeBeforeMute.value || 70;
  }
  applyVolume();
};

const fetchTracks = async () => {
  isRefreshing.value = true;
  skipAttempts.value = 0; // Reset skip attempts on refresh
  erroredTrackIds.value.clear(); // Clear error set on refresh
  try {
    const res = await api.get('/music/tracks/');
    const newTracks = res.data;
    
    // Preserve disabled state if track still exists
    newTracks.forEach(nt => {
      const old = cloudTracks.value.find(ot => ot.id === nt.id);
      if (old) {
        nt.disabled = old.disabled;
      }
      nt.error = false; // Reset error state on refresh
    });
    
    cloudTracks.value = newTracks;
    
    // Update current index if needed
    if (activeLibrary.value === 'cloud') {
      if (currentTrackIndex.value === -1 && cloudTracks.value.length > 0) {
        currentTrackIndex.value = 0;
      } else if (currentTrackIndex.value >= cloudTracks.value.length) {
        currentTrackIndex.value = cloudTracks.value.length - 1;
      }
    }
    
    // Update quota if available in response
    if (res.data_extra?.quota) {
      cloudQuota.value = res.data_extra.quota;
    }
  } catch (err) {
    console.error('Fetch tracks failed:', err);
  } finally {
    isRefreshing.value = false;
  }
};

// --- Local Music Methods ---
const initLocalMusic = async () => {
  if (!isFileSystemSupported) return;
  
  const saved = await localMusicService.getSavedHandle();
  if (saved) {
    localDirHandle.value = saved.handle;
    localPermission.value = saved.permission;
    
    // Load tracks from DB
    const tracksFromDb = await musicDb.getAllTracks();
    localTracks.value = tracksFromDb.filter(t => t.source === 'local');
    
    if (localPermission.value === 'granted' && localTracks.value.length === 0) {
      scanLocalMusic();
    }
  }
};

const selectLocalFolder = async () => {
  try {
    const handle = await localMusicService.selectFolder();
    if (handle) {
      localDirHandle.value = handle;
      localPermission.value = 'granted';
      await scanLocalMusic();
    }
  } catch (err) {
    showMusicMessage('选择失败', err.message, 'error');
  }
};

const requestLocalPermission = async () => {
  if (!localDirHandle.value) return;
  const granted = await localMusicService.requestPermission(localDirHandle.value);
  if (granted) {
    localPermission.value = 'granted';
    await scanLocalMusic();
  }
};

const scanLocalMusic = async () => {
  if (!localDirHandle.value || localPermission.value !== 'granted') return;
  
  isScanning.value = true;
  try {
    const tracks = await localMusicService.scanDirectory(localDirHandle.value);
    await musicDb.clearLocalTracks();
    await musicDb.saveTracks(tracks);
    localTracks.value = tracks;
    showMusicMessage('扫描完成', `已发现 ${tracks.length} 首本地歌曲`, 'success');
  } catch (err) {
    console.error('Scan local music failed:', err);
    showMusicMessage('扫描失败', '无法读取本地文件夹内容', 'error');
  } finally {
    isScanning.value = false;
  }
};

const clearLocalLibrary = async () => {
  if (confirm('确定要清除本地音乐库缓存吗？不会删除您的磁盘文件。')) {
    await localMusicService.clearLibrary();
    localTracks.value = [];
    localDirHandle.value = null;
    localPermission.value = 'prompt';
  }
};

const togglePlay = async () => {
  const list = currentTracks.value;
  if (!currentTrack.value) {
    if (list.length > 0) {
      await playFirstAvailable();
    }
    return;
  }

  const audio = audioRef.value;
  if (!audio) return;

  if (isPlaying.value) {
    audio.pause();
    isPlaying.value = false;
    return;
  }

  try {
    await audio.play();
    isPlaying.value = true;
  } catch (err) {
    console.error('Play failed:', err);
    isPlaying.value = false;
  }
};

const onTimeUpdate = () => {
  if (isSeeking.value) return;
  currentTime.value = audioRef.value?.currentTime || 0;
};

const onLoadedMetadata = () => {
  duration.value = audioRef.value.duration;
  applyVolume();
};

const startSeeking = () => {
  if (!duration.value) return;
  isSeeking.value = true;
  seekValue.value = currentTime.value;
};

const updateSeekPreview = (e) => {
  if (!duration.value) return;
  const val = Number(e.target.value);
  if (Number.isNaN(val)) return;
  seekValue.value = val;
};

const commitSeek = async (e) => {
  const audio = audioRef.value;
  if (!audio || !duration.value) {
    isSeeking.value = false;
    return;
  }

  const val = Number(e.target.value);
  if (Number.isNaN(val)) {
    isSeeking.value = false;
    return;
  }

  const wasPlaying = isPlaying.value;

  audio.currentTime = val;
  currentTime.value = val;
  seekValue.value = val;
  isSeeking.value = false;

  if (wasPlaying) {
    try {
      await audio.play();
      isPlaying.value = true;
    } catch (err) {
      console.error('Seek resume failed:', err);
      isPlaying.value = false;
    }
  }
};

const getAvailableIndices = () => {
  const list = currentTracks.value;
  return list
    .map((track, index) => (track.disabled || track.error) ? -1 : index)
    .filter(index => index !== -1);
};

const markTrackErrorById = (trackId) => {
  if (!trackId) return;
  if (erroredTrackIds.value.has(trackId)) return;

  erroredTrackIds.value.add(trackId);

  const list = currentTracks.value;
  const index = list.findIndex(t => t.id === trackId);
  if (index !== -1) {
    list[index].error = true;
  }
};

const getRandomNextIndex = () => {
  const available = getAvailableIndices();
  if (available.length === 0) return -1;
  if (available.length === 1) return available[0];

  const current = currentTrackIndex.value;
  const candidates = available.filter(index => index !== current);
  return candidates[Math.floor(Math.random() * candidates.length)];
};

const skipBrokenAndPlayNext = async (failedTrackId = null) => {
  const available = getAvailableIndices();
  const list = currentTracks.value;

  if (available.length === 0) {
    isPlaying.value = false;
    currentTime.value = 0;
    duration.value = 0;
    console.warn('没有可播放的音乐，可能全部被禁播或文件损坏');
    return;
  }

  let nextIndex = -1;

  if (playMode.value === 'random') {
    const failedIndex = failedTrackId 
      ? list.findIndex(t => t.id === failedTrackId) 
      : -1;

    const candidates = available.filter(index => index !== failedIndex);
    const pool = candidates.length > 0 ? candidates : available;
    nextIndex = pool[Math.floor(Math.random() * pool.length)];
  } else {
    let startIndex = currentTrackIndex.value;

    if (failedTrackId) {
      const failedIndex = list.findIndex(t => t.id === failedTrackId);
      if (failedIndex !== -1) {
        startIndex = failedIndex;
      }
    }

    let index = startIndex;
    let count = 0;

    do {
      index = (index + 1) % list.length;
      count++;
    } while (
      (list[index]?.disabled || list[index]?.error) && 
      count < list.length
    );

    if (!list[index]?.disabled && !list[index]?.error) {
      nextIndex = index;
    }
  }

  if (nextIndex !== -1) {
    await playTrack(nextIndex, { resetTime: true, skipOnError: true });
  } else {
    isPlaying.value = false;
  }
};

const playTrack = async (index, options = {}) => {
  const { resetTime = true, skipOnError = true } = options;
  const list = currentTracks.value;

  const track = list[index];
  if (!track || track.disabled || track.error) return false;

  currentTrackIndex.value = index;
  loadingTrackId.value = track.id;

  if (resetTime) {
    currentTime.value = 0;
    seekValue.value = 0;
    duration.value = 0;
  }

  // Handle local file URL
  if (track.source === 'local') {
    if (localAudioUrl.value) {
      URL.revokeObjectURL(localAudioUrl.value);
    }
    try {
      const file = await track.fileHandle.getFile();
      localAudioUrl.value = URL.createObjectURL(file);
    } catch (err) {
      console.error('Failed to get local file:', err);
      markTrackErrorById(track.id);
      if (skipOnError) await skipBrokenAndPlayNext(track.id);
      return false;
    }
  }

  await nextTick();
  
  const audio = audioRef.value;
  if (!audio) return false;

  applyVolume();

  try {
    await audio.play();
    isPlaying.value = true;
    skipAttempts.value = 0; // Reset skip attempts on successful play
    return true;
  } catch (err) {
    console.error('Play failed:', track.name, err);
    
    markTrackErrorById(track.id);
    isPlaying.value = false;
    
    if (skipOnError && skipAttempts.value < list.length) {
      skipAttempts.value++;
      await skipBrokenAndPlayNext(track.id);
    } else {
      console.warn('All tracks failed to play');
    }
    return false;
  }
};

const toggleTrackDisabled = (index) => {
  currentTracks.value[index].disabled = !currentTracks.value[index].disabled;
};

// --- Modal & Action Logics ---

const closeMusicModal = () => {
  showDeleteModal.value = false;
  showBatchDeleteModal.value = false;
  showRenameModal.value = false;
  showInfoModal.value = false;
  syncModalVisible.value = false;
  pendingDeleteTrack.value = null;
  pendingRenameTrack.value = null;
  infoModalTitle.value = '';
  infoModalMessage.value = '';
  infoModalType.value = 'info';
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const showSyncModal = async () => {
  // Mock data for candidates for now, as real candidates depend on local file scan vs cloud state
  // In a real scenario, this would compare localTracks with cloudTracks
  syncPlan.value.uploadCandidates = localTracks.value.filter(lt => 
    !cloudTracks.value.some(ct => ct.name === lt.name)
  );
  
  syncPlan.value.selectedUploadIds = new Set(syncPlan.value.uploadCandidates.map(t => t.id));
  syncPlan.value.selectedDeleteIds = new Set();
  syncModalVisible.value = true;
};

const toggleSyncUpload = (id) => {
  if (syncPlan.value.selectedUploadIds.has(id)) {
    syncPlan.value.selectedUploadIds.delete(id);
  } else {
    syncPlan.value.selectedUploadIds.add(id);
  }
};

const toggleSyncDelete = (id) => {
  if (syncPlan.value.selectedDeleteIds.has(id)) {
    syncPlan.value.selectedDeleteIds.delete(id);
  } else {
    syncPlan.value.selectedDeleteIds.add(id);
  }
};

const confirmSync = async () => {
  // Implementation for syncing
  // This would involve batch uploading and batch deleting
  showMusicMessage('同步开始', '正在同步云端库...', 'info');
  syncModalVisible.value = false;
  
  // Example implementation
  try {
    // 1. Delete selected cloud tracks
    const deleteIds = Array.from(syncPlan.value.selectedDeleteIds);
    for (const id of deleteIds) {
      await api.delete(`/music/tracks/${encodeURIComponent(id)}/`);
    }
    
    // 2. Upload selected local tracks
    const uploadIds = Array.from(syncPlan.value.selectedUploadIds);
    const uploadTracks = syncPlan.value.uploadCandidates.filter(t => uploadIds.includes(t.id));
    
    for (const track of uploadTracks) {
      const file = await track.fileHandle.getFile();
      const formData = new FormData();
      formData.append('files', file);
      await api.post('/music/upload/', formData);
    }
    
    showMusicMessage('同步成功', '云端库已更新', 'success');
    await fetchTracks();
  } catch (err) {
    console.error('Sync failed:', err);
    showMusicMessage('同步失败', err.message || '网络错误', 'error');
  }
};

const showMusicMessage = (title, message, type = 'info') => {
  infoModalTitle.value = title;
  infoModalMessage.value = message;
  infoModalType.value = type;
  showInfoModal.value = true;
};

const openMusicFilePicker = () => {
  musicFileInputRef.value?.click();
};

const allowedMusicExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'];

const isAllowedMusicFile = (file) => {
  const name = file.name.toLowerCase();
  return allowedMusicExtensions.some(ext => name.endsWith(ext));
};

const handleMusicFileSelected = async (event) => {
  const files = Array.from(event.target.files || []);
  event.target.value = '';

  if (files.length === 0) return;

  const invalidFiles = files.filter(file => !isAllowedMusicFile(file));
  if (invalidFiles.length > 0) {
    const names = invalidFiles.map(f => f.name).join('、');
    showMusicMessage('添加失败', `${names} 文件不可播放`, 'error');
    return;
  }

  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  isUploading.value = true;

  try {
    const res = await api.post('/music/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    const count = res.data?.count || files.length;
    showMusicMessage('添加成功', `已添加 ${count} 首音乐`, 'success');
    await fetchTracks();
  } catch (err) {
    console.error('Upload music failed:', err);
    const message = err.response?.data?.error || '上传失败，请查看控制台';
    showMusicMessage('添加失败', message, 'error');
  } finally {
    isUploading.value = false;
  }
};

const askDeleteTrack = (track, index) => {
  if (track.source === 'local') {
    // Local delete just removes from library, doesn't delete file
    if (confirm(`确定从库中移除“${track.name}”吗？不会删除原文件。`)) {
      localTracks.value.splice(index, 1);
      // We should probably also remove from IndexedDB tracks store
      // But for now, a rescan will fix it
    }
    return;
  }
  pendingDeleteTrack.value = track;
  pendingDeleteIndex.value = index;
  showDeleteModal.value = true;
};

const confirmDeleteTrack = async () => {
  if (!pendingDeleteTrack.value) return;

  try {
    const filename = encodeURIComponent(pendingDeleteTrack.value.id);
    await api.delete(`/music/tracks/${filename}/`);

    const index = pendingDeleteIndex.value;
    cloudTracks.value.splice(index, 1);

    if (activeLibrary.value === 'cloud') {
      if (currentTrackIndex.value === index) {
        audioRef.value?.pause();
        isPlaying.value = false;
        currentTime.value = 0;
        duration.value = 0;
        currentTrackIndex.value = cloudTracks.value.length > 0 ? 0 : -1;
      } else if (currentTrackIndex.value > index) {
        currentTrackIndex.value--;
      }
    }
  } catch (err) {
    console.error('Delete music failed:', err);
    alert('删除失败，请查看控制台');
  } finally {
    closeMusicModal();
  }
};

const splitName = (filename) => {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return { base: filename, ext: '' };
  return {
    base: filename.slice(0, dot),
    ext: filename.slice(dot)
  };
};

const askRenameTrack = (track, index) => {
  if (track.source === 'local') {
    alert('本地文件重命名功能暂未开放');
    return;
  }
  pendingRenameTrack.value = track;
  pendingRenameIndex.value = index;
  renameName.value = splitName(track.name).base;
  showRenameModal.value = true;
};

const confirmRenameTrack = async () => {
  if (!pendingRenameTrack.value) return;
  const newName = renameName.value.trim();
  if (!newName) return;

  try {
    const filename = encodeURIComponent(pendingRenameTrack.value.id);
    const res = await api.patch(`/music/tracks/${filename}/rename/`, {
      new_name: newName
    });

    const index = pendingRenameIndex.value;
    cloudTracks.value[index] = {
      ...res.data,
      disabled: cloudTracks.value[index].disabled
    };

    if (currentTrackIndex.value === index) {
      await nextTick();
    }
  } catch (err) {
    console.error('Rename music failed:', err);
    alert('重命名失败，请检查是否重名或文件名非法');
  } finally {
    closeMusicModal();
  }
};

const toggleManageMode = () => {
  isManaging.value = !isManaging.value;
  if (!isManaging.value) {
    selectedIds.value.clear();
  }
};

const toggleSelectTrack = (trackId) => {
  if (selectedIds.value.has(trackId)) {
    selectedIds.value.delete(trackId);
  } else {
    selectedIds.value.add(trackId);
  }
};

const selectAllTracks = () => {
  currentTracks.value.forEach(t => selectedIds.value.add(t.id));
};

const clearSelection = () => {
  selectedIds.value.clear();
};

const openMusicFolder = async () => {
  if (activeLibrary.value === 'local') {
    alert('本地音乐文件夹管理请直接在操作系统中操作');
    return;
  }
  try {
    const res = await api.post('/music/open-folder/');
    console.log('Music folder:', res.data.path);
  } catch (err) {
    console.error('Open music folder failed:', err);
    alert('无法打开文件夹。请手动打开项目目录下的 media/music 文件夹');
  }
};

const askBatchDelete = () => {
  if (selectedIds.value.size === 0) return;
  if (activeLibrary.value === 'local') {
    if (confirm(`确定从库中移除选中的 ${selectedIds.value.size} 首歌曲吗？`)) {
      localTracks.value = localTracks.value.filter(t => !selectedIds.value.has(t.id));
      selectedIds.value.clear();
      isManaging.value = false;
    }
    return;
  }
  showBatchDeleteModal.value = true;
};

const confirmBatchDelete = async () => {
  const idsToDelete = Array.from(selectedIds.value);
  let successCount = 0;
  
  for (const id of idsToDelete) {
    try {
      const filename = encodeURIComponent(id);
      await api.delete(`/music/tracks/${filename}/`);
      successCount++;
      
      // Remove from frontend list
      const index = cloudTracks.value.findIndex(t => t.id === id);
      if (index !== -1) {
        if (currentTrackIndex.value === index) {
          audioRef.value?.pause();
          isPlaying.value = false;
        }
        cloudTracks.value.splice(index, 1);
        if (currentTrackIndex.value > index) {
          currentTrackIndex.value--;
        } else if (currentTrackIndex.value === index && cloudTracks.value.length > 0) {
          currentTrackIndex.value = 0;
        } else if (cloudTracks.value.length === 0) {
          currentTrackIndex.value = -1;
        }
      }
    } catch (err) {
      console.error(`Failed to delete ${id}:`, err);
    }
  }
  
  selectedIds.value.clear();
  isManaging.value = false;
  showBatchDeleteModal.value = false;
  if (successCount < idsToDelete.length) {
    alert(`部分删除失败，成功删除 ${successCount}/${idsToDelete.length} 首`);
  }
};

const removeTrack = (index) => {
  askDeleteTrack(currentTracks.value[index], index);
};

const togglePlayMode = () => {
  const modes = ['order', 'random', 'repeat'];
  const currentIndex = modes.indexOf(playMode.value);
  playMode.value = modes[(currentIndex + 1) % modes.length];
  localStorage.setItem('music_play_mode', playMode.value);
};

const prevTrack = async () => {
  const list = currentTracks.value;
  if (list.length === 0) return;

  if (playMode.value === 'random') {
    while (playHistory.value.length > 0) {
      const lastIndex = playHistory.value.pop();
      const track = list[lastIndex];

      if (track && !track.disabled && !track.error) {
        await playTrack(lastIndex, { resetTime: true, skipOnError: true });
        return;
      }
    }

    const randomIndex = getRandomNextIndex();
    if (randomIndex !== -1) {
      await playTrack(randomIndex, { resetTime: true, skipOnError: true });
    }
    return;
  }

  let index = currentTrackIndex.value;
  let count = 0;
  
  do {
    index = (index - 1 + list.length) % list.length;
    count++;
  } while ((list[index].disabled || list[index].error) && count < list.length);

  if (!list[index].disabled && !list[index].error) {
    await playTrack(index, { resetTime: true, skipOnError: true });
  }
};

const nextTrack = async () => {
  const list = currentTracks.value;
  if (list.length === 0) return;

  if (playMode.value === 'random') {
    const current = currentTrackIndex.value;
    const randomIndex = getRandomNextIndex();

    if (randomIndex !== -1) {
      pushHistory(current);
      await playTrack(randomIndex, { resetTime: true, skipOnError: true });
    }
    return;
  }

  let index = currentTrackIndex.value;
  let count = 0;
  
  do {
    index = (index + 1) % list.length;
    count++;
  } while ((list[index]?.disabled || list[index]?.error) && count < list.length);

  if (!list[index]?.disabled && !list[index]?.error) {
    await playTrack(index, { resetTime: true, skipOnError: true });
  }
};

const onTrackEnded = async () => {
  if (playMode.value === 'repeat') {
    audioRef.value.currentTime = 0;
    try {
      await audioRef.value.play();
      isPlaying.value = true;
    } catch (err) {
      console.error('Repeat play failed:', err);
      isPlaying.value = false;
      await skipBrokenAndPlayNext();
    }
  } else {
    await nextTrack();
  }
};

const playRandom = async () => {
  const randomIndex = getRandomNextIndex();
  if (randomIndex !== -1) {
    await playTrack(randomIndex);
  } else {
    isPlaying.value = false;
  }
};

const playFirstAvailable = async () => {
  const available = getAvailableIndices();
  if (available.length > 0) {
    await playTrack(available[0]);
  }
};

const onAudioError = (e) => {
  console.error('Audio element error:', e);
};

const handleClickOutside = (e) => {
  if (isMobile.value) return;
  if (!showPopover.value) return;

  const popover = document.querySelector('.music-popover');
  const isInsidePopover = popover && popover.contains(e.target);
  const isInsidePlayer = playerRef.value && playerRef.value.contains(e.target);
  
  if (!isInsidePopover && !isInsidePlayer) {
    closePopover();
  }
};

onMounted(async () => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('resize', updateMobileState);
  fetchTracks();
  await initLocalMusic();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('resize', updateMobileState);
  if (localAudioUrl.value) {
    URL.revokeObjectURL(localAudioUrl.value);
  }
});

// Expose open method for sidebar menu
defineExpose({
  open: () => {
    updateTriggerRect();
    showPopover.value = true;
  },
  openMini: () => {
    updateTriggerRect();
    showPopover.value = true;
    showDetail.value = false;
  },
  openDetail: () => {
    updateTriggerRect();
    showPopover.value = true;
    showDetail.value = true;
  }
});
</script>

<style scoped>
/* ... (existing styles) ... */
.music-player-container {
  position: relative;
  display: flex;
  align-items: center;
}

.music-trigger.active {
  color: var(--accent-color);
  background: rgba(var(--accent-rgb), 0.1);
}

.playing-icon {
  animation: music-spin 3s linear infinite;
}

@keyframes music-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.music-popover {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 320px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
  animation: slide-up 0.2s ease-out;
  color: var(--text-color);
}

/* Ensure fixed positioning works with teleport */
body > .music-popover {
  position: fixed;
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.music-player-mini {
  padding: 16px;
}

.music-now-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-color) !important;
  text-align: center;
}

/* Dark mode override for title */
html.dark .music-now-title,
body.dark .music-now-title,
.dark .music-now-title,
[data-theme="dark"] .music-now-title,
:deep([data-theme="dark"]) .music-now-title {
  color: var(--text-color) !important;
}

.music-progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.music-progress-row .time {
  font-size: 11px;
  color: var(--secondary-text);
  width: 35px;
  font-family: monospace;
}

.music-range {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  background: var(--border-color);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.music-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: var(--accent-color);
  border-radius: 50%;
  box-shadow: 0 0 5px rgba(0,0,0,0.2);
}

.music-controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.music-volume-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
}

.volume-range {
  flex: 1;
  height: 3px;
  -webkit-appearance: none;
  background: var(--border-color);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  background: var(--secondary-text);
  border-radius: 50%;
}

.volume-value {
  font-size: 11px;
  color: var(--secondary-text);
  min-width: 32px;
  text-align: right;
  font-family: monospace;
}

.ctrl-btn {
  background: transparent;
  border: none;
  color: var(--secondary-text);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ctrl-btn:hover {
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent-color);
}

.play-btn {
  background: var(--accent-color);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.play-btn:hover {
  background: var(--accent-hover);
  color: white;
  transform: scale(1.05);
}

.mode-btn {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mode-text {
  font-size: 9px;
  font-weight: bold;
}

.more-btn.active {
  color: var(--accent-color);
}

/* Detail Panel */
.music-detail-panel {
  border-top: 1px solid var(--border-color);
  background: rgba(var(--bg-rgb), 0.5);
  max-height: 300px;
  display: flex;
  flex-direction: column;
}

.detail-header {
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  gap: 10px;
}

.batch-title {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-width: 72px;
  flex-shrink: 0;
  line-height: 1.15;
  text-align: center;
}

.batch-title-main {
  font-size: 14px;
  font-weight: 800;
  color: var(--text-color);
  white-space: nowrap;
}

.batch-title-sub {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--secondary-text);
  white-space: nowrap;
  text-align: center;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.header-actions::-webkit-scrollbar {
  display: none;
}

.list-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--secondary-text) !important;
}

/* Source Tabs */
.source-tabs {
  display: flex;
  background: rgba(var(--bg-rgb), 0.8);
  border-bottom: 1px solid var(--border-color);
  padding: 4px;
  gap: 4px;
}

.source-tab {
  flex: 1;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  border: none;
  background: transparent;
  color: var(--secondary-text);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.source-tab:hover {
  background: rgba(var(--accent-rgb), 0.05);
  color: var(--text-color);
}

.source-tab.active {
  background: var(--card-bg);
  color: var(--accent-color);
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

/* Status UI */
.status-btn {
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 20px;
  border: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-btn.warning {
  background: rgba(255, 153, 0, 0.1);
  color: #ff9900;
  cursor: pointer;
}

.status-btn.error {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.status-empty {
  padding: 40px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.status-empty p {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-color);
}

.status-empty .sub {
  font-size: 12px;
  color: var(--secondary-text);
  margin-top: -8px;
}

.m-btn-primary {
  height: 36px;
  padding: 0 20px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 18px;
  font-weight: bold;
  cursor: pointer;
}

.m-btn-secondary {
  height: 36px;
  padding: 0 20px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  border-radius: 18px;
  font-weight: bold;
  cursor: pointer;
}

.folder-name {
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: bold;
}

.clear-lib-btn {
  background: none;
  border: none;
  color: #ff4d4f;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.clear-lib-btn:hover {
  background: rgba(255, 77, 79, 0.1);
}

.manage-btn, .add-btn, .refresh-btn {
  font-size: 12px;
  color: var(--accent-color);
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.manage-btn:hover, .add-btn:hover, .refresh-btn:hover {
  background: rgba(var(--accent-rgb), 0.1);
}

.batch-btn {
  min-width: 38px;
  height: 42px;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.batch-btn.compact-two {
  width: 38px;
  display: inline-flex;
  flex-direction: column;
}

.batch-btn.compact-two span {
  display: block;
}

.batch-btn.folder.icon-only {
  width: 42px;
  min-width: 42px;
  height: 42px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-color);
}

.batch-btn.folder.local-folder-btn {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.batch-btn.folder.local-folder-btn:hover {
  background: var(--accent-hover);
}

.batch-delete-btn {
  width: 42px;
  height: 42px;
  padding: 4px 6px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.1;
  white-space: normal;
  text-align: center;
}

.batch-delete-btn span {
  display: block;
}

.batch-btn.delete {
  color: #ff4d4f;
  border-color: #ffb3b3;
}

.batch-btn.delete:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.batch-btn.exit {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.spinning {
  animation: music-spin 1s linear infinite;
}

.music-track-list {
  overflow-y: auto;
  flex: 1;
}

.empty-list {
  padding: 30px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--secondary-text) !important;
}

.music-track-item {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  transition: background 0.2s;
  cursor: pointer;
  color: var(--text-color) !important;
}

.music-track-item:hover {
  background: rgba(var(--accent-rgb), 0.05);
}

.music-track-item.active {
  background: rgba(var(--accent-rgb), 0.1);
}

.music-track-item.active .track-name {
  color: var(--accent-color) !important;
  font-weight: 700;
}

.music-track-item.disabled {
  opacity: 0.5;
}

.music-track-item.disabled .track-name {
  text-decoration: line-through;
  color: #ff6b6b !important;
}

.music-track-item.selected {
  background: rgba(var(--accent-rgb), 0.05);
}

.track-prefix {
  display: flex;
  align-items: center;
}

.check-icon {
  color: var(--secondary-text);
}

.check-icon.selected {
  color: var(--accent-color);
}

.track-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.track-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  color: var(--text-color) !important;
}

.track-error-label {
  flex-shrink: 0;
  color: #ff6b6b !important;
  font-size: 11px;
  font-weight: 700;
  background: rgba(255, 107, 107, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
}

/* Dark mode override for track name and other elements */
html.dark .music-popover,
body.dark .music-popover,
.dark .music-popover,
[data-theme="dark"] .music-popover,
:deep([data-theme="dark"]) .music-popover {
  color: var(--text-color) !important;
}

html.dark .music-track-item,
body.dark .music-track-item,
.dark .music-track-item,
[data-theme="dark"] .music-track-item,
:deep([data-theme="dark"]) .music-track-item,
html.dark .music-track-item .track-name,
body.dark .music-track-item .track-name,
.dark .music-track-item .track-name,
[data-theme="dark"] .music-track-item .track-name,
:deep([data-theme="dark"]) .music-track-item .track-name {
  color: var(--text-color) !important;
}

html.dark .music-track-item.active .track-name,
body.dark .music-track-item.active .track-name,
.dark .music-track-item.active .track-name,
[data-theme="dark"] .music-track-item.active .track-name,
:deep([data-theme="dark"]) .music-track-item.active .track-name {
  color: var(--accent-color) !important;
}

html.dark .list-title,
html.dark .detail-footer,
html.dark .empty-list,
body.dark .list-title,
body.dark .detail-footer,
body.dark .empty-list,
.dark .list-title,
.dark .detail-footer,
.dark .empty-list,
[data-theme="dark"] .list-title,
[data-theme="dark"] .detail-footer,
[data-theme="dark"] .empty-list,
:deep([data-theme="dark"]) .list-title,
:deep([data-theme="dark"]) .detail-footer,
:deep([data-theme="dark"]) .empty-list {
  color: var(--secondary-text) !important;
}

.track-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--secondary-text);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.action-btn:hover {
  background: rgba(0,0,0,0.1);
}

.delete-btn:hover {
  color: #ff4d4f;
}

.detail-footer {
  padding: 8px 16px;
  font-size: 10px;
  color: var(--secondary-text);
  text-align: center;
  border-top: 1px solid var(--border-color);
}

/* Modals */
.music-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fade-in 0.2s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.music-modal {
  width: 90%;
  max-width: 400px;
  background: var(--card-bg);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: modal-scale 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modal-scale {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 20px 24px 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-color);
}

.modal-header.success {
  color: var(--accent-color);
}

.modal-header.error {
  color: #ff4d4f;
}

.modal-header.info {
  color: var(--text-color);
}

/* Sync Modal specific styles */
.sync-modal {
  max-width: 450px;
}

.sync-quota-info {
  margin-bottom: 20px;
  background: rgba(var(--accent-rgb), 0.05);
  padding: 12px;
  border-radius: 10px;
}

.quota-bar-container {
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.quota-bar-used {
  height: 100%;
  background: var(--accent-color);
  transition: width 0.3s ease, background 0.3s ease;
}

.quota-bar-used.exceeded {
  background: #ff4d4f;
}

.quota-text {
  font-size: 12px;
  color: var(--secondary-text);
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}

.quota-warning {
  color: #ff4d4f;
}

.sync-sections {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
}

.sync-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-color);
  margin-bottom: 8px;
  padding-left: 4px;
  border-left: 3px solid var(--accent-color);
}

.candidate-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.candidate-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--bg-color);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.candidate-item:hover {
  background: rgba(var(--accent-rgb), 0.05);
}

.candidate-item .name {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-color);
}

.candidate-item .size {
  font-size: 11px;
  color: var(--secondary-text);
  font-family: monospace;
}

.delete-candidate {
  opacity: 0.8;
}

.delete-candidate .size {
  color: #ff4d4f;
}

.modal-body {
  padding: 10px 24px 20px;
  color: var(--secondary-text);
  font-size: 14px;
  line-height: 1.6;
}

.target-name {
  margin: 12px 0;
  padding: 10px 14px;
  background: rgba(var(--accent-rgb), 0.05);
  border-radius: 8px;
  color: var(--accent-color);
  font-weight: 600;
  word-break: break-all;
}

.warning-text {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 12px;
}

.highlight {
  color: #ff4d4f;
  font-weight: 700;
  font-size: 16px;
}

.input-group {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-color);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  transition: border-color 0.2s;
}

.input-group:focus-within {
  border-color: var(--accent-color);
}

.modal-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-color);
  font-size: 14px;
  padding: 0;
}

.extension-text {
  color: var(--secondary-text);
  font-size: 14px;
  font-weight: 600;
}

.modal-footer {
  padding: 16px 24px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.modal-btn.cancel {
  background: var(--border-color);
  color: var(--text-color);
}

.modal-btn.cancel:hover {
  background: rgba(0,0,0,0.1);
}

.modal-btn.confirm {
  background: var(--accent-color);
  color: white;
}

.modal-btn.confirm:hover {
  background: var(--accent-hover);
}

.modal-btn.confirm-delete {
  background: #ff4d4f;
  color: white;
}

.modal-btn.confirm-delete:hover {
  background: #d9363e;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .music-player-container {
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 999;
  }

  .music-trigger {
    display: none !important;
  }

  .mobile-player-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    z-index: 2100;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }

  .mobile-player-panel {
    width: 100%;
    max-width: 340px;
    background: var(--card-bg);
    border-radius: 20px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    animation: mobile-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    flex-direction: column;
    max-height: 85vh;
  }

  @keyframes mobile-pop {
    from { opacity: 0; transform: scale(0.9) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .mobile-player-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px 0;
  }

  .mobile-now-playing {
    font-size: 12px;
    font-weight: bold;
    color: var(--secondary-text);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .mobile-close-btn {
    background: transparent;
    border: none;
    color: var(--secondary-text);
    cursor: pointer;
    padding: 4px;
  }

  .mobile-detail {
    flex: 1;
    min-height: 0;
    max-height: none;
    border-top: 1px solid var(--border-color);
  }

  /* Desktop-specific popover should not be centered on mobile if it ever shows */
  .music-popover {
    display: none;
  }
}
</style>
