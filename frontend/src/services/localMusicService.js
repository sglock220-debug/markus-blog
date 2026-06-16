import { musicDb } from '../utils/musicDb';

const SUPPORTED_EXTENSIONS = ['mp3', 'flac', 'wav', 'm4a', 'ogg'];

export const localMusicService = {
  /**
   * Check if browser supports File System Access API
   */
  isSupported() {
    return 'showDirectoryPicker' in window;
  },

  /**
   * Request directory picker and save handle
   */
  async selectFolder() {
    if (!this.isSupported()) {
      throw new Error('当前浏览器不支持本地文件夹访问，请使用 Chrome/Edge 桌面端。');
    }

    try {
      const handle = await window.showDirectoryPicker({
        mode: 'read'
      });
      await musicDb.setSetting('musicDirHandle', handle);
      return handle;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  },

  /**
   * Get saved handle and check permissions
   */
  async getSavedHandle() {
    const handle = await musicDb.getSetting('musicDirHandle');
    if (!handle) return null;

    const permission = await handle.queryPermission({ mode: 'read' });
    return { handle, permission };
  },

  /**
   * Request permission for a handle
   */
  async requestPermission(handle) {
    if (!handle) return false;
    const permission = await handle.requestPermission({ mode: 'read' });
    return permission === 'granted';
  },

  /**
   * Recursively scan directory for music files
   */
  async scanDirectory(dirHandle, path = '') {
    const tracks = [];
    
    for await (const entry of dirHandle.values()) {
      const relativePath = path ? `${path}/${entry.name}` : entry.name;
      
      if (entry.kind === 'directory') {
        const subTracks = await this.scanDirectory(entry, relativePath);
        tracks.push(...subTracks);
      } else if (entry.kind === 'file') {
        const ext = entry.name.split('.').pop().toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          const file = await entry.getFile();
          const track = {
            id: `local-${relativePath}-${file.size}-${file.lastModified}`,
            title: entry.name.replace(/\.[^/.]+$/, ""),
            name: entry.name,
            fileName: entry.name,
            relativePath,
            size: file.size,
            lastModified: file.lastModified,
            source: 'local',
            fileHandle: entry
          };
          tracks.push(track);
        }
      }
    }
    
    return tracks;
  },

  /**
   * Clear all local music data
   */
  async clearLibrary() {
    await musicDb.removeSetting('musicDirHandle');
    await musicDb.clearLocalTracks();
  }
};
