<template>
  <div class="music-player-container" ref="playerRef" @click.stop>
    <!-- Trigger Button -->
    <button @click.stop="togglePopover" class="nav-icon-btn music-trigger" :class="{ active: showPopover }" title="音乐播放器">
      <MusicIcon :class="{ 'playing-icon': isPlaying }" />
    </button>

    <!-- Mini Player Popover -->
    <div v-if="showPopover" class="music-popover" @click.stop>
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
          <button @click="showDetail = !showDetail" class="ctrl-btn more-btn" :class="{ active: showDetail }" title="播放列表">
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
        <div class="detail-header">
          <span class="list-title" v-if="!manageMode">播放列表 ({{ tracks.length }})</span>
          <div class="batch-title" v-else>
            <span class="batch-title-main">批量管理</span>
            <span class="batch-title-sub">已选 {{ selectedTrackIds.size }}</span>
          </div>
          
          <div class="header-actions">
            <template v-if="!manageMode">
              <button @click="toggleManageMode" class="manage-btn" title="批量管理">
                <SettingsIcon size="14" /> 管理
              </button>
              <button @click="openMusicFilePicker" class="add-btn" title="添加音乐" :disabled="isUploading">
                <PlusIcon size="14" /> {{ isUploading ? '上传中' : '添加' }}
              </button>
              <button @click="fetchTracks" class="refresh-btn" title="刷新音乐库">
                <RefreshCwIcon size="14" :class="{ 'spinning': isRefreshing }" /> 刷新
              </button>
            </template>
            <template v-else>
              <button @click="selectAllTracks" class="batch-btn compact-two">
                <span>全</span>
                <span>选</span>
              </button>
              <button @click="clearSelection" class="batch-btn compact-two">
                <span>清</span>
                <span>空</span>
              </button>
              <button @click="openMusicFolder" class="batch-btn folder icon-only" title="打开音乐文件夹">
                <FolderOpenIcon size="18" />
              </button>
              <button 
                @click="askBatchDelete" 
                class="batch-btn delete batch-delete-btn compact-two" 
                :disabled="selectedTrackIds.size === 0"
              >
                <span>删</span>
                <span>除</span>
              </button>
              <button @click="toggleManageMode" class="batch-btn exit compact-two">
                <span>退</span>
                <span>出</span>
              </button>
            </template>
          </div>
        </div>

        <div class="music-track-list">
          <div v-if="tracks.length === 0" class="empty-list">
            暂无音乐，请将文件放入 media/music 后刷新
          </div>
          <div 
            v-for="(track, index) in tracks" 
            :key="track.id"
            class="music-track-item"
            :class="{ 
              active: currentTrackIndex === index, 
              disabled: track.disabled,
              selected: selectedTrackIds.has(track.id)
            }"
            @click="manageMode ? toggleSelectTrack(track.id) : null"
          >
            <div class="track-prefix" v-if="manageMode">
              <CheckSquareIcon v-if="selectedTrackIds.has(track.id)" size="16" class="check-icon selected" />
              <SquareIcon v-else size="16" class="check-icon" />
            </div>
            <div class="track-info" @click="!manageMode ? playTrack(index) : null">
              <span class="track-name">{{ track.name }}</span>
              <span v-if="track.error" class="track-error-label">损坏</span>
            </div>
            <div class="track-actions" v-if="!manageMode">
              <button 
                @click.stop="askRenameTrack(track, index)" 
                class="action-btn rename-btn" 
                title="重命名"
              >
                <PencilIcon size="14" />
              </button>
              <button 
                @click.stop="toggleTrackDisabled(index)" 
                class="action-btn disable-btn" 
                :title="track.disabled ? '取消禁播' : '禁播'"
              >
                <VolumeXIcon v-if="!track.disabled" size="14" />
                <Volume2Icon v-else size="14" />
              </button>
              <button @click.stop="askDeleteTrack(track, index)" class="action-btn delete-btn" title="删除文件">
                <Trash2Icon size="14" />
              </button>
            </div>
          </div>
        </div>

        <div class="detail-footer" v-if="!manageMode">
          请把音乐文件放入 media/music，然后点击刷新音乐库
        </div>
      </div>
    </div>

    <!-- Modals -->
    <div v-if="showDeleteModal || showRenameModal || showBatchDeleteModal || showInfoModal" class="music-modal-mask" @click.self="closeMusicModal">
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
          <p>确定删除选中的 <span class="highlight">{{ selectedTrackIds.size }}</span> 首音乐吗？</p>
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
  FolderOpen as FolderOpenIcon
} from '@lucide/vue';
import api from '../api';

const audioRef = ref(null);
const playerRef = ref(null);
const showPopover = ref(false);
const showDetail = ref(false);

const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const playMode = ref(localStorage.getItem('music_play_mode') || 'order'); // order, random, repeat
const currentTrackIndex = ref(-1);
const tracks = ref([]);
const isRefreshing = ref(false);
const skipAttempts = ref(0);

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
const manageMode = ref(false);
const selectedTrackIds = ref(new Set());

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
  if (currentTrackIndex.value >= 0 && currentTrackIndex.value < tracks.value.length) {
    return tracks.value[currentTrackIndex.value];
  }
  return null;
});

const audioSrc = computed(() => {
  if (!currentTrack.value) return '';

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

  // 线上环境：保持相对路径
  // 例如：
  // `http://118.178.236.60/media/music/xxx.mp3` 
  // `https://izawa2000.com/media/music/xxx.mp3` 
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

const togglePopover = () => {
  showPopover.value = !showPopover.value;
  if (!showPopover.value) showDetail.value = false;
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

watch([volume, isMuted], () => {
  localStorage.setItem('music_volume', String(volume.value));
  localStorage.setItem('music_muted', String(isMuted.value));
  applyVolume();
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
      const old = tracks.value.find(ot => ot.id === nt.id);
      if (old) {
        nt.disabled = old.disabled;
      }
      nt.error = false; // Reset error state on refresh
    });
    
    tracks.value = newTracks;
    
    // Update current index if needed
    if (currentTrackIndex.value === -1 && tracks.value.length > 0) {
      currentTrackIndex.value = 0;
    } else if (currentTrackIndex.value >= tracks.value.length) {
      currentTrackIndex.value = tracks.value.length - 1;
    }
  } catch (err) {
    console.error('Fetch tracks failed:', err);
  } finally {
    isRefreshing.value = false;
  }
};

const showAddTip = () => {
  alert("请把音乐文件放入 media/music 文件夹，然后点击刷新音乐库");
};

const togglePlay = async () => {
  if (!currentTrack.value) {
    if (tracks.value.length > 0) {
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
  return tracks.value
    .map((track, index) => (track.disabled || track.error) ? -1 : index)
    .filter(index => index !== -1);
};

const markTrackErrorById = (trackId) => {
  if (!trackId) return;
  if (erroredTrackIds.value.has(trackId)) return;

  erroredTrackIds.value.add(trackId);

  const index = tracks.value.findIndex(t => t.id === trackId);
  if (index !== -1) {
    tracks.value[index].error = true;
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
      ? tracks.value.findIndex(t => t.id === failedTrackId) 
      : -1;

    const candidates = available.filter(index => index !== failedIndex);
    const pool = candidates.length > 0 ? candidates : available;
    nextIndex = pool[Math.floor(Math.random() * pool.length)];
  } else {
    let startIndex = currentTrackIndex.value;

    if (failedTrackId) {
      const failedIndex = tracks.value.findIndex(t => t.id === failedTrackId);
      if (failedIndex !== -1) {
        startIndex = failedIndex;
      }
    }

    let index = startIndex;
    let count = 0;

    do {
      index = (index + 1) % tracks.value.length;
      count++;
    } while (
      (tracks.value[index]?.disabled || tracks.value[index]?.error) && 
      count < tracks.value.length
    );

    if (!tracks.value[index]?.disabled && !tracks.value[index]?.error) {
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

  const track = tracks.value[index];
  if (!track || track.disabled || track.error) return false;

  currentTrackIndex.value = index;
  loadingTrackId.value = track.id;

  if (resetTime) {
    currentTime.value = 0;
    seekValue.value = 0;
    duration.value = 0;
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
    
    // 只标记当前尝试播放的这一首
    markTrackErrorById(track.id);
    isPlaying.value = false;
    
    // Prevent infinite loops
    if (skipOnError && skipAttempts.value < tracks.value.length) {
      skipAttempts.value++;
      await skipBrokenAndPlayNext(track.id);
    } else {
      console.warn('All tracks failed to play');
    }
    return false;
  }
};

const toggleTrackDisabled = (index) => {
  tracks.value[index].disabled = !tracks.value[index].disabled;
};

// --- Modal & Action Logics ---

const closeMusicModal = () => {
  showDeleteModal.value = false;
  showBatchDeleteModal.value = false;
  showRenameModal.value = false;
  showInfoModal.value = false;
  pendingDeleteTrack.value = null;
  pendingRenameTrack.value = null;
  infoModalTitle.value = '';
  infoModalMessage.value = '';
  infoModalType.value = 'info';
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
    const filename = encodeURIComponent(pendingDeleteTrack.value.id);
    await api.delete(`/music/tracks/${filename}/`);

    const index = pendingDeleteIndex.value;
    tracks.value.splice(index, 1);

    if (currentTrackIndex.value === index) {
      audioRef.value?.pause();
      isPlaying.value = false;
      currentTime.value = 0;
      duration.value = 0;
      currentTrackIndex.value = tracks.value.length > 0 ? 0 : -1;
    } else if (currentTrackIndex.value > index) {
      currentTrackIndex.value--;
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
    tracks.value[index] = {
      ...res.data,
      disabled: tracks.value[index].disabled
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
  manageMode.value = !manageMode.value;
  if (!manageMode.value) {
    selectedTrackIds.value.clear();
  }
};

const toggleSelectTrack = (trackId) => {
  if (selectedTrackIds.value.has(trackId)) {
    selectedTrackIds.value.delete(trackId);
  } else {
    selectedTrackIds.value.add(trackId);
  }
};

const selectAllTracks = () => {
  tracks.value.forEach(t => selectedTrackIds.value.add(t.id));
};

const clearSelection = () => {
  selectedTrackIds.value.clear();
};

const openMusicFolder = async () => {
  try {
    const res = await api.post('/music/open-folder/');
    console.log('Music folder:', res.data.path);
  } catch (err) {
    console.error('Open music folder failed:', err);
    alert('无法打开文件夹。请手动打开项目目录下的 media/music 文件夹');
  }
};

const askBatchDelete = () => {
  if (selectedTrackIds.value.size === 0) return;
  showBatchDeleteModal.value = true;
};

const confirmBatchDelete = async () => {
  const idsToDelete = Array.from(selectedTrackIds.value);
  let successCount = 0;
  
  for (const id of idsToDelete) {
    try {
      const filename = encodeURIComponent(id);
      await api.delete(`/music/tracks/${filename}/`);
      successCount++;
      
      // Remove from frontend list
      const index = tracks.value.findIndex(t => t.id === id);
      if (index !== -1) {
        if (currentTrackIndex.value === index) {
          audioRef.value?.pause();
          isPlaying.value = false;
        }
        tracks.value.splice(index, 1);
        if (currentTrackIndex.value > index) {
          currentTrackIndex.value--;
        } else if (currentTrackIndex.value === index && tracks.value.length > 0) {
          currentTrackIndex.value = 0;
        } else if (tracks.value.length === 0) {
          currentTrackIndex.value = -1;
        }
      }
    } catch (err) {
      console.error(`Failed to delete ${id}:`, err);
    }
  }
  
  selectedTrackIds.value.clear();
  manageMode.value = false;
  showBatchDeleteModal.value = false;
  if (successCount < idsToDelete.length) {
    alert(`部分删除失败，成功删除 ${successCount}/${idsToDelete.length} 首`);
  }
};

const removeTrack = (index) => {
  // This was the old browser confirm logic, now replaced by askDeleteTrack
  askDeleteTrack(tracks.value[index], index);
};

const togglePlayMode = () => {
  const modes = ['order', 'random', 'repeat'];
  const currentIndex = modes.indexOf(playMode.value);
  playMode.value = modes[(currentIndex + 1) % modes.length];
  localStorage.setItem('music_play_mode', playMode.value);
};

const prevTrack = async () => {
  if (tracks.value.length === 0) return;

  if (playMode.value === 'random') {
    while (playHistory.value.length > 0) {
      const lastIndex = playHistory.value.pop();
      const track = tracks.value[lastIndex];

      if (track && !track.disabled && !track.error) {
        await playTrack(lastIndex, { resetTime: true, skipOnError: true });
        return;
      }
    }

    // 没有历史时，退化成随机一首
    const randomIndex = getRandomNextIndex();
    if (randomIndex !== -1) {
      await playTrack(randomIndex, { resetTime: true, skipOnError: true });
    }
    return;
  }

  let index = currentTrackIndex.value;
  let count = 0;
  
  do {
    index = (index - 1 + tracks.value.length) % tracks.value.length;
    count++;
  } while ((tracks.value[index].disabled || tracks.value[index].error) && count < tracks.value.length);

  if (!tracks.value[index].disabled && !tracks.value[index].error) {
    await playTrack(index, { resetTime: true, skipOnError: true });
  }
};

const nextTrack = async () => {
  if (tracks.value.length === 0) return;

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
    index = (index + 1) % tracks.value.length;
    count++;
  } while ((tracks.value[index]?.disabled || tracks.value[index]?.error) && count < tracks.value.length);

  if (!tracks.value[index]?.disabled && !tracks.value[index]?.error) {
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
  
  // 不在这里自动标记损坏，不在这里自动跳下一首
  // 原因：audio error 事件可能滞后触发，此时 loadingTrackId/currentTrackIndex 可能已经变化
  // 真正的坏文件标记和自动跳过统一交给 playTrack() 的 catch 处理
};

const handleClickOutside = (e) => {
  if (playerRef.value && !playerRef.value.contains(e.target)) {
    showPopover.value = false;
    showDetail.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  fetchTracks();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Expose open method for sidebar menu
defineExpose({
  open: () => {
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
  color: var(--primary-text) !important;
  text-align: center;
}

/* Dark mode override for title */
html.dark .music-now-title,
body.dark .music-now-title,
.dark .music-now-title {
  color: #f5f5f5 !important;
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
  color: var(--primary-text);
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
  color: var(--primary-text);
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
  color: var(--primary-text) !important;
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
  color: var(--primary-text) !important;
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
.dark .music-popover {
  color: #f2f2f2 !important;
}

html.dark .music-track-item .track-name,
body.dark .music-track-item .track-name,
.dark .music-track-item .track-name {
  color: #f2f2f2 !important;
}

html.dark .music-track-item.active .track-name,
body.dark .music-track-item.active .track-name,
.dark .music-track-item.active .track-name {
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
.dark .empty-list {
  color: rgba(255, 255, 255, 0.68) !important;
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
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
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
  color: var(--primary-text);
}

.modal-header.success {
  color: var(--accent-color);
}

.modal-header.error {
  color: #ff4d4f;
}

.modal-header.info {
  color: var(--primary-text);
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
  color: var(--primary-text);
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
  color: var(--primary-text);
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
  .music-popover {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 360px;
    right: auto;
  }

  .detail-header {
    padding: 8px 10px;
    gap: 8px;
  }

  .batch-title {
    min-width: 58px;
  }

  .batch-title-main {
    font-size: 13px;
  }

  .batch-title-sub {
    font-size: 10px;
  }

  .header-actions {
    overflow-x: auto;
    scrollbar-width: none;
    justify-content: flex-start;
  }

  .header-actions::-webkit-scrollbar {
    display: none;
  }

  .batch-btn {
    flex-shrink: 0;
    font-size: 10px;
    padding: 2px 6px;
    height: 34px;
  }

  .batch-btn.folder.icon-only {
    width: 34px;
    min-width: 34px;
    height: 34px;
  }

  .batch-delete-btn {
    width: 48px;
    height: 34px;
  }

  .btn-label {
    display: none;
  }
}
</style>
