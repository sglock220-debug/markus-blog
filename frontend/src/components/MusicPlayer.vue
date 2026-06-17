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
              <button @click="showLocalSyncModal" class="sync-lib-btn">同步云端库</button>
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
                <button @click="showLocalSyncModal" class="sync-lib-btn">同步云端库</button>
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
    <div v-if="showDeleteModal || showRenameModal || showBatchDeleteModal || showInfoModal || syncModalVisible || localSyncModalVisible" class="music-modal-mask" @click.self="closeMusicModal">
      
      <!-- Local to Cloud Sync Modal -->
      <div v-if="localSyncModalVisible" class="music-modal sync-modal">
        <div class="modal-header">同步云端库</div>
        <div class="modal-body">
          <p class="sync-desc">将本地文件夹的变更同步到云端播放列表（仅更新列表，不直接上传）</p>
          
          <div class="sync-sections">
            <!-- New Music Section -->
            <div class="sync-section">
              <div class="section-title">新增音乐 ({{ localSyncPlan.addCandidates.length }})</div>
              <div class="candidate-list" v-if="localSyncPlan.addCandidates.length > 0">
                <div 
                  v-for="track in localSyncPlan.addCandidates" 
                  :key="getTrackKey(track)" 
                  class="candidate-item"
                  @click="toggleLocalSyncAdd(getTrackKey(track))"
                >
                  <CheckSquareIcon v-if="localSyncPlan.selectedAddIds.has(getTrackKey(track))" size="14" class="check-icon selected" />
                  <SquareIcon v-else size="14" class="check-icon" />
                  <span class="name">{{ track.name }}</span>
                  <span class="size">{{ formatFileSize(getTrackSize(track)) }}</span>
                </div>
              </div>
              <div v-else class="empty-sync-text">暂无新增</div>
            </div>

            <!-- Remove Music Section -->
            <div class="sync-section">
              <div class="section-title">删除音乐 ({{ localSyncPlan.removeCandidates.length }})</div>
              <div class="candidate-list" v-if="localSyncPlan.removeCandidates.length > 0">
                <div 
                  v-for="track in localSyncPlan.removeCandidates" 
                  :key="getTrackKey(track)" 
                  class="candidate-item delete-candidate"
                  @click="toggleLocalSyncRemove(getTrackKey(track))"
                >
                  <CheckSquareIcon v-if="localSyncPlan.selectedRemoveIds.has(getTrackKey(track))" size="14" class="check-icon selected" />
                  <SquareIcon v-else size="14" class="check-icon" />
                  <span class="name">{{ track.name }}</span>
                  <span class="size">-{{ formatFileSize(getTrackSize(track)) }}</span>
                </div>
              </div>
              <div v-else class="empty-sync-text">暂无待删</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeMusicModal" class="modal-btn cancel">取消</button>
          <button 
            @click="confirmLocalSync" 
            class="modal-btn confirm" 
            :disabled="localSyncPlan.selectedAddIds.size === 0 && localSyncPlan.selectedRemoveIds.size === 0"
          >
            确认同步
          </button>
        </div>
      </div>

      <!-- Sync Modal -->
      <div v-if="syncModalVisible" class="music-modal sync-modal" :class="{ 'is-syncing': isSyncing }">
        <div class="modal-header">
          {{ isSyncing ? '正在同步云端库...' : '云端同步' }}
        </div>
        <div class="modal-body">
          <!-- Sync Progress Section (Visible during syncing) -->
          <div v-if="isSyncing" class="sync-progress-container">
            <div class="overall-progress-card">
              <div class="overall-stats">
                <div class="stat-main">
                  正在同步: {{ currentSyncCount.finished }} / {{ currentSyncCount.total }}
                </div>
                <div class="stat-speed" v-if="totalSyncSpeed > 0">
                  总速度: {{ formatSpeed(totalSyncSpeed) }}
                </div>
              </div>
              <div class="overall-progress-bar">
                <div class="bar-fill" :style="{ width: totalSyncProgress + '%' }"></div>
              </div>
              <div class="overall-detail">
                {{ formatFileSize(totalSyncLoadedBytes) }} / {{ formatFileSize(totalSyncTotalBytes) }} ({{ totalSyncProgress }}%)
              </div>
            </div>

            <div class="individual-tasks">
              <div 
                v-for="(p, key) in syncPlan.progressMap" 
                :key="key" 
                class="task-item"
                :class="p.status"
              >
                <div class="task-info">
                  <span class="task-name" :title="p.name">{{ p.name }}</span>
                  <span class="task-status-text">
                    <template v-if="p.status === 'waiting'">等待中</template>
                    <template v-else-if="p.status === 'uploading'">
                      {{ p.speed > 0 ? formatSpeed(p.speed) : '连接中...' }}
                    </template>
                    <template v-else-if="p.status === 'success'">已完成</template>
                    <template v-else-if="p.status === 'failed'">失败: {{ p.error }}</template>
                  </span>
                </div>
                <div class="task-progress-row">
                  <div class="task-bar">
                    <div class="task-bar-fill" :style="{ width: (p.total > 0 ? (p.loaded / p.total * 100) : 0) + '%' }"></div>
                  </div>
                  <span class="task-pct">{{ Math.round((p.total > 0 ? (p.loaded / p.total * 100) : 0)) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Configuration Section (Visible before syncing) -->
          <template v-else>
            <div class="sync-quota-info">
              <div class="quota-bar-container">
                <!-- Blue: Existing Server Capacity -->
                <div 
                  class="quota-bar-server" 
                  :style="{ width: (currentServerUsedBytes / cloudQuota.limitBytes * 100) + '%' }"
                ></div>
                <!-- Green: New Upload Capacity -->
                <div 
                  class="quota-bar-added" 
                  :style="{ width: (syncAddedSize / cloudQuota.limitBytes * 100) + '%' }"
                  :class="{ 'exceeded': isQuotaExceeded }"
                ></div>
              </div>
              <div class="quota-legend">
                <div class="legend-item"><span class="dot blue"></span>当前云端</div>
                <div class="legend-item"><span class="dot green"></span>本次新增</div>
              </div>
            </div>

            <div class="sync-sections">
              <div v-if="syncPlan.uploadCandidates.length > 0" class="sync-section">
                <div class="section-title">
                  <span>待上传 ({{ syncPlan.uploadCandidates.length }})</span>
                  <div class="section-bulk-actions">
                    <button @click="selectAllUploads" class="bulk-link">全选</button>
                    <button @click="deselectAllUploads" class="bulk-link">取消全选</button>
                  </div>
                </div>
                <div class="candidate-list">
                  <div 
                    v-for="track in syncPlan.uploadCandidates" 
                    :key="getTrackKey(track)" 
                    class="candidate-item"
                    :class="{ 'disabled-candidate': getTrackSize(track) > cloudQuota.limitBytes }"
                    @click="toggleSyncUpload(track)"
                  >
                    <CheckSquareIcon v-if="syncPlan.selectedUploadIds.has(getTrackKey(track))" size="14" class="check-icon selected" />
                    <SquareIcon v-else size="14" class="check-icon" />
                    <span class="name">{{ track.name }}</span>
                    <div class="size-info">
                      <span class="size" :class="{ 'error-text': getTrackSize(track) > cloudQuota.limitBytes }">
                        {{ formatFileSize(getTrackSize(track)) }}
                      </span>
                      <span v-if="getTrackSize(track) > cloudQuota.limitBytes" class="size-warning"> (文件超限)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="syncPlan.deleteCandidates.length > 0" class="sync-section">
                <div class="section-title">
                  <span>待清理 ({{ syncPlan.deleteCandidates.length }})</span>
                  <div class="section-bulk-actions">
                    <button @click="selectAllDeletes" class="bulk-link">全选</button>
                    <button @click="deselectAllDeletes" class="bulk-link">取消全选</button>
                  </div>
                </div>
                <div class="candidate-list">
                  <div 
                    v-for="track in syncPlan.deleteCandidates" 
                    :key="getTrackKey(track)" 
                    class="candidate-item delete-candidate"
                    @click="toggleSyncDelete(getTrackKey(track))"
                  >
                    <CheckSquareIcon v-if="syncPlan.selectedDeleteIds.has(getTrackKey(track))" size="14" class="check-icon selected" />
                    <SquareIcon v-else size="14" class="check-icon" />
                    <span class="name">{{ track.name }}</span>
                    <span class="size">-{{ formatFileSize(getTrackSize(track)) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
        <div class="modal-footer sync-modal-footer">
          <template v-if="isSyncing">
            <div class="sync-summary">
              <div class="summary-line" v-if="syncResults.success + syncResults.failed < syncResults.total">
                正在执行同步操作，请勿关闭弹窗...
              </div>
              <div class="summary-line highlight-success" v-else>
                同步完成！成功: {{ syncResults.success }}, 失败: {{ syncResults.failed }}
              </div>
            </div>
            <div class="footer-actions">
              <button 
                @click="closeMusicModal" 
                class="modal-btn"
                :class="syncResults.success + syncResults.failed >= syncResults.total ? 'confirm' : 'cancel'"
              >
                {{ syncResults.success + syncResults.failed >= syncResults.total ? '完成' : '后台运行(不推荐)' }}
              </button>
            </div>
          </template>
          <template v-else>
            <div class="sync-summary">
              <div class="summary-line">当前: {{ formatFileSize(currentServerUsedBytes) }} / 200MB</div>
              <div class="summary-line highlight-add" v-if="syncAddedSize > 0">上传增加: +{{ formatFileSize(syncAddedSize) }}</div>
              <div class="summary-line highlight-remove" v-if="syncRemovedSize > 0">删除释放: -{{ formatFileSize(syncRemovedSize) }}</div>
              <div class="summary-line final-line" :class="{ 'error-text': isQuotaExceeded }">
                同步后: {{ formatFileSize(totalSyncSize) }} / 200MB
                <span v-if="isQuotaExceeded" class="warning-tag">容量超出限制，无法同步</span>
              </div>
            </div>
            <div class="footer-actions">
              <button @click="closeMusicModal" class="modal-btn cancel">取消</button>
              <button 
                @click="confirmSync" 
                class="modal-btn confirm" 
                :disabled="isQuotaExceeded || (syncPlan.selectedUploadIds.size === 0 && syncPlan.selectedDeleteIds.size === 0)"
              >
                确认同步
              </button>
            </div>
          </template>
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
        <div class="modal-header">
          {{ pendingDeleteTrack?.source === 'local' ? '删除本地文件' : '移出云端库' }}
        </div>
        <div class="modal-body">
          <template v-if="pendingDeleteTrack?.source === 'local'">
            <p>确定要永久删除这个本地音乐文件吗？</p>
            <div class="target-name">{{ pendingDeleteTrack?.name }}</div>
            <p class="warning-text">该操作会删除你电脑本地文件夹中的文件，无法通过网站恢复。</p>
          </template>
          <template v-else>
            <p>确定要从云端库列表移除这首歌吗？</p>
            <div class="target-name">{{ pendingDeleteTrack?.name }}</div>
            <p class="warning-text">提示：不会立即删除服务器文件，真正删除会在云端同步时执行</p>
          </template>
        </div>
        <div class="modal-footer">
          <button @click="closeMusicModal" class="modal-btn cancel">取消</button>
          <button @click="confirmDeleteTrack" class="modal-btn confirm-delete">
            {{ pendingDeleteTrack?.source === 'local' ? '确认删除' : '确认移除' }}
          </button>
        </div>
      </div>

      <!-- Batch Delete Modal -->
      <div v-if="showBatchDeleteModal" class="music-modal">
        <div class="modal-header">
          {{ activeLibrary === 'local' ? '批量删除本地文件' : '移出云端库' }}
        </div>
        <div class="modal-body">
          <p v-if="activeLibrary === 'local'">确定要永久删除选中的 <span class="highlight">{{ selectedIds.size }}</span> 个本地文件吗？</p>
          <p v-else>确定要从云端库列表移除选中的 <span class="highlight">{{ selectedIds.size }}</span> 首歌吗？</p>
          <p class="warning-text" v-if="activeLibrary === 'local'">该操作会删除你电脑本地文件夹中的文件，无法恢复。</p>
          <p class="warning-text" v-else>提示：不会立即删除服务器文件，真正删除会在云端同步时执行</p>
        </div>
        <div class="modal-footer">
          <button @click="closeMusicModal" class="modal-btn cancel">取消</button>
          <button @click="confirmBatchDelete" class="modal-btn confirm-delete">
            {{ activeLibrary === 'local' ? '确认删除全部' : '确认全部移除' }}
          </button>
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
const serverTracks = ref([]);
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

const normalizeTrackName = (name) => {
  return String(name || '')
    .split('/').pop()
    .split('\\').pop()
    .trim()
    .toLowerCase();
};

const getTrackKey = (track) => {
  if (!track) return '';
  return normalizeTrackName(track.name || track.fileName || track.title || track.id);
};

const getTrackSize = (track) => {
  const n = Number(track.fileSize ?? track.file_size ?? track.size ?? 0);
  return Number.isFinite(n) ? n : 0;
};

// Cloud Quota & Sync
const cloudQuota = ref({ usedBytes: 0, limitBytes: 200 * 1024 * 1024 }); // 200MB limit
const syncModalVisible = ref(false);
const isSyncing = ref(false);
const syncResults = ref({ success: 0, failed: 0, total: 0 });
const syncPlan = ref({
  uploadCandidates: [],
  deleteCandidates: [],
  selectedUploadIds: new Set(),
  selectedDeleteIds: new Set(),
  // Tracking individual progress: { [trackKey]: { status, loaded, total, speed, error } }
  progressMap: {}
});

const currentCloudUsedBytes = computed(() => {
  // Use quota if available and has non-zero usedBytes, otherwise fallback to sum of serverTracks
  if (cloudQuota.value && cloudQuota.value.usedBytes > 0) {
    return cloudQuota.value.usedBytes;
  }
  return serverTracks.value.reduce((sum, track) => sum + getTrackSize(track), 0);
});

const currentServerUsedBytes = computed(() => {
  return serverTracks.value.reduce((sum, track) => sum + getTrackSize(track), 0);
});

// Local to Cloud List Sync
const localSyncModalVisible = ref(false);
const localSyncPlan = ref({
  addCandidates: [],
  removeCandidates: [],
  selectedAddIds: new Set(),
  selectedRemoveIds: new Set()
});

const totalSyncSize = computed(() => {
  let size = currentServerUsedBytes.value;
  
  // Add selected uploads (present in cloudTracks draft, not on server)
  syncPlan.value.uploadCandidates.forEach(track => {
    if (syncPlan.value.selectedUploadIds.has(getTrackKey(track))) {
      size += getTrackSize(track);
    }
  });
  
  // Subtract selected deletes (present on server, not in cloudTracks draft)
  syncPlan.value.deleteCandidates.forEach(track => {
    if (syncPlan.value.selectedDeleteIds.has(getTrackKey(track))) {
      size -= getTrackSize(track);
    }
  });
  
  return Math.max(0, size);
});

const syncAddedSize = computed(() => {
  let size = 0;
  syncPlan.value.uploadCandidates.forEach(track => {
    if (syncPlan.value.selectedUploadIds.has(getTrackKey(track))) {
      size += getTrackSize(track);
    }
  });
  return size;
});

const syncRemovedSize = computed(() => {
  let size = 0;
  syncPlan.value.deleteCandidates.forEach(track => {
    if (syncPlan.value.selectedDeleteIds.has(getTrackKey(track))) {
      size += getTrackSize(track);
    }
  });
  return size;
});

const isQuotaExceeded = computed(() => {
  return totalSyncSize.value > cloudQuota.value.limitBytes;
});

// Overall Sync Progress
const totalSyncProgress = computed(() => {
  let total = 0;
  let loaded = 0;
  
  Object.values(syncPlan.value.progressMap).forEach(p => {
    total += p.total || 0;
    loaded += p.loaded || 0;
  });
  
  if (total === 0) return 0;
  return Math.round((loaded / total) * 100);
});

const totalSyncSpeed = computed(() => {
  let totalSpeed = 0;
  Object.values(syncPlan.value.progressMap).forEach(p => {
    if (p.status === 'uploading') {
      totalSpeed += p.speed || 0;
    }
  });
  return totalSpeed;
});

const currentSyncCount = computed(() => {
  const finished = Object.values(syncPlan.value.progressMap).filter(p => p.status === 'success' || p.status === 'failed').length;
  const total = Object.values(syncPlan.value.progressMap).length;
  return { finished, total };
});

const totalSyncLoadedBytes = computed(() => {
  return Object.values(syncPlan.value.progressMap).reduce((sum, p) => sum + (p.loaded || 0), 0);
});

const totalSyncTotalBytes = computed(() => {
  return Object.values(syncPlan.value.progressMap).reduce((sum, p) => sum + (p.total || 0), 0);
});

const formatSpeed = (bytesPerSecond) => {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '0 B/s';
  if (bytesPerSecond > 1024 * 1024) return (bytesPerSecond / 1024 / 1024).toFixed(2) + ' MB/s';
  if (bytesPerSecond > 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s';
  return bytesPerSecond.toFixed(0) + ' B/s';
};

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

const fetchServerTracks = async (options = {}) => {
  const { syncDraft = false } = options;
  isRefreshing.value = true;
  try {
    const res = await api.get('/music/tracks/');
    let data = [];
    let quota = null;
    
    if (Array.isArray(res.data)) {
      data = res.data;
    } else if (res.data && typeof res.data === 'object') {
      data = res.data.tracks || [];
      quota = res.data.quota || null;
    }
    
    serverTracks.value = data;
    if (quota) {
      cloudQuota.value = quota;
    } else {
      // Fallback if quota is missing: calculate from data
      const sum = data.reduce((s, t) => s + getTrackSize(t), 0);
      cloudQuota.value = { usedBytes: sum, limitBytes: 200 * 1024 * 1024 };
    }

    // Only update cloudTracks (the draft) if it's empty or explicitly requested
    if (syncDraft || !cloudTracks.value || cloudTracks.value.length === 0) {
      cloudTracks.value = [...data];
    }

    // Update quota if available in res.data_extra
    if (res.data_extra?.quota) {
      cloudQuota.value = res.data_extra.quota;
    }
  } catch (err) {
    console.error('Fetch server tracks failed:', err);
  } finally {
    isRefreshing.value = false;
  }
};

const fetchTracks = async (options = {}) => {
  const { forceSyncDraft = false } = options;
  // fetchTracks is the general UI refresh
  // We sync draft ONLY if it's empty OR if forceSyncDraft is true (e.g. manual refresh)
  const shouldSyncDraft = forceSyncDraft || !cloudTracks.value || cloudTracks.value.length === 0;
  
  await fetchServerTracks({ syncDraft: shouldSyncDraft });
  
  // Update current index if needed after full refresh
  if (activeLibrary.value === 'cloud') {
    if (currentTrackIndex.value === -1 && cloudTracks.value.length > 0) {
      currentTrackIndex.value = 0;
    } else if (currentTrackIndex.value >= cloudTracks.value.length) {
      currentTrackIndex.value = cloudTracks.value.length - 1;
    }
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
  localSyncModalVisible.value = false;
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
  isRefreshing.value = true;
  // Cloud Sync: Compare cloudTracks (draft) with serverTracks (actual server state)
  try {
    await fetchServerTracks({ syncDraft: false }); // Fetch server state without overwriting draft
    
    const serverKeys = new Set(serverTracks.value.map(getTrackKey));
    const draftKeys = new Set(cloudTracks.value.map(getTrackKey));

    // Pending Uploads: cloudTracks that are not on server
    syncPlan.value.uploadCandidates = cloudTracks.value.filter(t => !serverKeys.has(getTrackKey(t)));
    
    // Pending Deletes: serverTracks that are not in cloudTracks draft
    syncPlan.value.deleteCandidates = serverTracks.value.filter(st => !draftKeys.has(getTrackKey(st)));
    
    // Default: Select all uploads
    syncPlan.value.selectedUploadIds = new Set(
      syncPlan.value.uploadCandidates
        .filter(t => getTrackSize(t) <= cloudQuota.value.limitBytes)
        .map(getTrackKey)
    );
    
    syncPlan.value.selectedDeleteIds = new Set(syncPlan.value.deleteCandidates.map(getTrackKey));
    syncPlan.value.progressMap = {};
    isSyncing.value = false;
    syncResults.value = { success: 0, failed: 0, total: 0 };
    syncModalVisible.value = true;
  } catch (err) {
    console.error('Fetch server tracks for sync failed:', err);
    showMusicMessage('同步准备失败', '无法获取服务器当前列表', 'error');
  } finally {
    isRefreshing.value = false;
  }
};

const selectAllUploads = () => {
  syncPlan.value.selectedUploadIds = new Set(
    syncPlan.value.uploadCandidates
      .filter(t => getTrackSize(t) <= cloudQuota.value.limitBytes)
      .map(getTrackKey)
  );
};

const deselectAllUploads = () => {
  syncPlan.value.selectedUploadIds.clear();
};

const selectAllDeletes = () => {
  syncPlan.value.selectedDeleteIds = new Set(syncPlan.value.deleteCandidates.map(getTrackKey));
};

const deselectAllDeletes = () => {
  syncPlan.value.selectedDeleteIds.clear();
};

const toggleSyncUpload = (track) => {
  const id = getTrackKey(track);
  if (getTrackSize(track) > cloudQuota.value.limitBytes) {
    showMusicMessage('无法选择', '单个文件超过 200MB，无法上传', 'error');
    return;
  }
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
  const uploadKeys = syncPlan.value.selectedUploadIds;
  const deleteKeys = syncPlan.value.selectedDeleteIds;
  const tracksToUpload = syncPlan.value.uploadCandidates.filter(t => uploadKeys.has(getTrackKey(t)));
  const tracksToDelete = syncPlan.value.deleteCandidates.filter(t => deleteKeys.has(getTrackKey(t)));

  if (tracksToUpload.length === 0 && tracksToDelete.length === 0) return;

  isSyncing.value = true;
  syncResults.value = { success: 0, failed: 0, total: tracksToUpload.length + tracksToDelete.length };
  
  // Initialize progress map
  const newProgressMap = {};
  tracksToUpload.forEach(t => {
    newProgressMap[getTrackKey(t)] = { 
      status: 'waiting', 
      loaded: 0, 
      total: getTrackSize(t), 
      speed: 0,
      startTime: 0,
      name: t.name 
    };
  });
  tracksToDelete.forEach(t => {
    newProgressMap[getTrackKey(t)] = { 
      status: 'waiting', 
      loaded: 0, 
      total: getTrackSize(t), 
      speed: 0,
      name: t.name 
    };
  });
  syncPlan.value.progressMap = newProgressMap;

  try {
    // 1. Delete selected tracks from server
    for (const track of tracksToDelete) {
      const key = getTrackKey(track);
      syncPlan.value.progressMap[key].status = 'uploading'; // Using 'uploading' as 'active' status
      try {
        await api.delete(`/music/tracks/${encodeURIComponent(track.id)}/`);
        syncPlan.value.progressMap[key].status = 'success';
        syncPlan.value.progressMap[key].loaded = syncPlan.value.progressMap[key].total;
        syncResults.value.success++;
      } catch (err) {
        syncPlan.value.progressMap[key].status = 'failed';
        syncPlan.value.progressMap[key].error = err.message || '删除失败';
        syncResults.value.failed++;
      }
    }
    
    // 2. Upload selected local tracks to server (Sequential)
    for (const track of tracksToUpload) {
      const key = getTrackKey(track);
      const progressItem = syncPlan.value.progressMap[key];
      progressItem.status = 'uploading';
      progressItem.startTime = Date.now();
      
      try {
        const file = await track.fileHandle.getFile();
        const formData = new FormData();
        formData.append('files', file);
        
        await api.post('/music/upload/', formData, {
          onUploadProgress: (progressEvent) => {
            const now = Date.now();
            const duration = (now - progressItem.startTime) / 1000;
            progressItem.loaded = progressEvent.loaded;
            progressItem.total = progressEvent.total || file.size;
            if (duration > 0) {
              progressItem.speed = progressItem.loaded / duration;
            }
          }
        });
        
        progressItem.status = 'success';
        progressItem.loaded = progressItem.total;
        progressItem.speed = 0;
        syncResults.value.success++;
      } catch (err) {
        progressItem.status = 'failed';
        progressItem.error = err.message || '上传失败';
        progressItem.speed = 0;
        syncResults.value.failed++;
      }
    }
    
    if (syncResults.value.failed === 0) {
      showMusicMessage('同步成功', '云端库已与服务器同步', 'success');
    } else {
      showMusicMessage('同步完成', `成功 ${syncResults.value.success} 首，失败 ${syncResults.value.failed} 首`, 'info');
    }
    
    await fetchServerTracks({ syncDraft: true });
  } catch (err) {
    console.error('Cloud Sync failed:', err);
    showMusicMessage('同步失败', err.message || '网络错误', 'error');
  } finally {
    // Don't close immediately if there are failures, or show summary
    // The modal remains open because isSyncing is still used in UI
    // User can manually close it
  }
};

const showLocalSyncModal = () => {
  // Local -> Cloud List Sync: Compare localTracks with cloudTracks
  const cloudKeys = new Set(cloudTracks.value.map(getTrackKey));
  const localKeys = new Set(localTracks.value.map(getTrackKey));

  localSyncPlan.value.addCandidates = localTracks.value.filter(lt => 
    !cloudKeys.has(getTrackKey(lt))
  );
  
  localSyncPlan.value.removeCandidates = cloudTracks.value.filter(ct => 
    !localKeys.has(getTrackKey(ct))
  );
  
  localSyncPlan.value.selectedAddIds = new Set(localSyncPlan.value.addCandidates.map(getTrackKey));
  localSyncPlan.value.selectedRemoveIds = new Set(localSyncPlan.value.removeCandidates.map(getTrackKey));
  localSyncModalVisible.value = true;
};

const toggleLocalSyncAdd = (id) => {
  if (localSyncPlan.value.selectedAddIds.has(id)) {
    localSyncPlan.value.selectedAddIds.delete(id);
  } else {
    localSyncPlan.value.selectedAddIds.add(id);
  }
};

const toggleLocalSyncRemove = (id) => {
  if (localSyncPlan.value.selectedRemoveIds.has(id)) {
    localSyncPlan.value.selectedRemoveIds.delete(id);
  } else {
    localSyncPlan.value.selectedRemoveIds.add(id);
  }
};

const confirmLocalSync = () => {
  // 1. Add selected local tracks to cloudTracks
  const toAdd = localSyncPlan.value.addCandidates.filter(t => 
    localSyncPlan.value.selectedAddIds.has(getTrackKey(t))
  ).map(t => ({
    ...t,
    source: 'local', // Mark as coming from local for later server sync
    disabled: false
  }));

  // 2. Remove selected cloud tracks
  const toKeep = cloudTracks.value.filter(ct => 
    !localSyncPlan.value.selectedRemoveIds.has(getTrackKey(ct))
  );

  cloudTracks.value = [...toKeep, ...toAdd];
  
  localSyncModalVisible.value = false;
  showMusicMessage('列表已更新', '云端库列表已同步，请点击云端库“同步”按钮以执行上传/删除', 'success');
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
  pendingDeleteTrack.value = track;
  pendingDeleteIndex.value = index;
  showDeleteModal.value = true;
};

const confirmDeleteTrack = async () => {
  if (!pendingDeleteTrack.value) return;

  try {
    const track = pendingDeleteTrack.value;
    const index = pendingDeleteIndex.value;

    if (track.source === 'local') {
      // 1. Check/Request readwrite permission
      const hasPermission = await localMusicService.requestPermission(localDirHandle.value, 'readwrite');
      if (!hasPermission) {
        showMusicMessage('无权限', '没有本地文件删除权限，请在浏览器弹出框中授权。', 'error');
        return;
      }

      // 2. Real delete local file
      try {
        await track.fileHandle.remove();
        localTracks.value.splice(index, 1);
        await musicDb.deleteTrack(track.id);
        showMusicMessage('删除成功', `本地文件“${track.name}”已永久删除`, 'success');
      } catch (err) {
        console.error('Local file remove failed:', err);
        showMusicMessage('删除失败', '无法删除本地文件，可能文件被占用或已不存在。', 'error');
      }
    } else {
      // Cloud removal: only remove from list
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
    }
  } catch (err) {
    console.error('Delete action failed:', err);
    alert('操作失败，请查看控制台');
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
  
  try {
    if (activeLibrary.value === 'local') {
      // 1. Check/Request readwrite permission
      const hasPermission = await localMusicService.requestPermission(localDirHandle.value, 'readwrite');
      if (!hasPermission) {
        showMusicMessage('无权限', '没有本地文件删除权限，请在浏览器弹出框中授权。', 'error');
        return;
      }

      for (const id of idsToDelete) {
        try {
          const track = localTracks.value.find(t => t.id === id);
          if (track && track.fileHandle) {
            await track.fileHandle.remove();
            const index = localTracks.value.findIndex(t => t.id === id);
            if (index !== -1) localTracks.value.splice(index, 1);
            await musicDb.deleteTrack(id);
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to delete local track ${id}:`, err);
        }
      }
      showMusicMessage('批量删除完成', `成功删除 ${successCount}/${idsToDelete.length} 个本地文件`, successCount === idsToDelete.length ? 'success' : 'info');
    } else {
      // Cloud removal: only remove from list
      const initialCount = cloudTracks.value.length;
      cloudTracks.value = cloudTracks.value.filter(t => !selectedIds.value.has(t.id));
      successCount = initialCount - cloudTracks.value.length;
      
      currentTrackIndex.value = -1; // Reset selection
      showMusicMessage('已移出列表', `已从云端库列表移除 ${successCount} 首歌`, 'success');
    }
  } catch (err) {
    console.error('Batch delete action failed:', err);
    alert('批量操作失败，请查看控制台');
  } finally {
    selectedIds.value.clear();
    isManaging.value = false;
    showBatchDeleteModal.value = false;
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

.sync-lib-btn {
  background: none;
  border: none;
  color: var(--accent-color);
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.sync-lib-btn:hover {
  background: rgba(var(--accent-rgb), 0.1);
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

.sync-desc {
  font-size: 12px;
  color: var(--secondary-text);
  margin-bottom: 16px;
  line-height: 1.5;
}

.empty-sync-text {
  font-size: 12px;
  color: var(--secondary-text);
  text-align: center;
  padding: 10px;
  font-style: italic;
  opacity: 0.6;
}

.quota-bar-container {
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
  display: flex;
}

.quota-bar-server {
  height: 100%;
  background: var(--accent-color); /* Blue-ish */
  transition: width 0.3s ease;
  flex-shrink: 0;
}

.quota-bar-added {
  height: 100%;
  background: #52c41a; /* Green-ish */
  transition: width 0.3s ease;
  flex-shrink: 0;
}

.quota-bar-added.exceeded {
  background: #ff4d4f; /* Red if total exceeded */
}

.quota-legend {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--secondary-text);
  font-weight: 600;
}

.legend-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-item .dot.blue { background: var(--accent-color); }
.legend-item .dot.green { background: #52c41a; }

.quota-text {
  font-size: 12px;
  color: var(--secondary-text);
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}

/* Sync Progress UI */
.sync-progress-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.overall-progress-card {
  background: rgba(var(--accent-rgb), 0.05);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.overall-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 800;
}

.stat-main { color: var(--text-color); font-size: 14px; }
.stat-speed { color: var(--accent-color); font-size: 13px; }

.overall-progress-bar {
  height: 10px;
  background: var(--border-color);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 8px;
}

.overall-progress-bar .bar-fill {
  height: 100%;
  background: var(--accent-color);
  transition: width 0.3s ease;
}

.overall-detail {
  font-size: 12px;
  color: var(--secondary-text);
  text-align: right;
  font-family: monospace;
}

.individual-tasks {
  max-height: 250px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.task-item {
  padding: 10px;
  background: var(--bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.task-item.uploading { border-color: var(--accent-color); background: rgba(var(--accent-rgb), 0.02); }
.task-item.success { border-color: #52c41a; opacity: 0.8; }
.task-item.failed { border-color: #ff4d4f; }

.task-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
}

.task-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 12px;
}

.task-status-text {
  font-family: monospace;
  font-weight: bold;
}

.task-item.uploading .task-status-text { color: var(--accent-color); }
.task-item.success .task-status-text { color: #52c41a; }
.task-item.failed .task-status-text { color: #ff4d4f; }

.task-progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-bar {
  flex: 1;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
}

.task-bar-fill {
  height: 100%;
  background: var(--accent-color);
  transition: width 0.2s linear;
}

.task-item.success .task-bar-fill { background: #52c41a; }
.task-item.failed .task-bar-fill { background: #ff4d4f; }

.task-pct {
  font-size: 10px;
  min-width: 28px;
  text-align: right;
  color: var(--secondary-text);
  font-weight: bold;
}

.highlight-success {
  color: #52c41a;
  font-weight: 800;
}

.sync-desc {
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
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-bulk-actions {
  display: flex;
  gap: 8px;
}

.bulk-link {
  background: none;
  border: none;
  color: var(--accent-color);
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  opacity: 0.8;
}

.bulk-link:hover {
  opacity: 1;
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

.candidate-item.disabled-candidate {
  opacity: 0.5;
  cursor: not-allowed;
}

.candidate-item:hover:not(.disabled-candidate) {
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

.size-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.size-warning {
  font-size: 10px;
  color: #ff4d4f;
  font-weight: bold;
}

.candidate-item .size {
  font-size: 11px;
  color: var(--secondary-text);
  font-family: monospace;
}

.candidate-item .size.error-text {
  color: #ff4d4f;
}

.delete-candidate {
  opacity: 0.8;
}

.delete-candidate .size {
  color: #ff4d4f;
}

.sync-modal-footer {
  flex-direction: column;
  align-items: stretch !important;
  gap: 16px;
}

.sync-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: rgba(var(--accent-rgb), 0.03);
  border-radius: 8px;
  border: 1px dashed var(--border-color);
}

.summary-line {
  font-size: 12px;
  color: var(--secondary-text);
  display: flex;
  justify-content: space-between;
}

.highlight-add {
  color: var(--accent-color);
  font-weight: 600;
}

.highlight-remove {
  color: #ff4d4f;
  font-weight: 600;
}

.final-line {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--border-color);
  font-weight: 800;
  color: var(--text-color);
}

.warning-tag {
  color: #ff4d4f;
  font-size: 11px;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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
