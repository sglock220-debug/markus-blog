import axios from 'axios';
import { vocabularyDb } from '../db/vocabularyDb';

// Helper to get CSRF token if needed (though usually handled by axios interceptors if configured)
const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

const api = axios.create({
  baseURL: '/api/vocabulary/',
  headers: {
    'X-CSRFToken': getCookie('csrftoken'),
    'Content-Type': 'application/json'
  }
});

export const vocabularySyncService = {
  /**
   * Sync pending changes from IndexedDB to server
   */
  async syncPendingChanges(userId) {
    if (!userId) return;
    
    try {
      const pendingChanges = await vocabularyDb.getPendingSync(userId);
      if (pendingChanges.length === 0) return;

      // Map to API format
      const changes = pendingChanges.map(item => ({
        language: item.language,
        level: item.level,
        wordId: item.wordId,
        learned: item.learned,
        updatedAt: new Date(item.updatedAt).toISOString(),
        operationId: item.operationId
      }));

      const response = await api.post('progress/sync/', { changes });
      const syncedItems = response.data.synced;

      // Update local progress with server's final state and remove from queue
      for (const synced of syncedItems) {
        await vocabularyDb.saveProgress({
          userId,
          language: synced.language,
          level: synced.level,
          wordId: synced.wordId,
          learned: synced.learned,
          updatedAt: new Date(synced.updatedAt).getTime()
        });
        
        if (synced.operationId) {
          await vocabularyDb.removeFromSyncQueue(synced.operationId);
        }
      }
      
      console.log(`Synced ${syncedItems.length} items to server.`);
    } catch (error) {
      console.error('Failed to sync pending changes:', error);
    }
  },

  /**
   * Load latest progress from server for a specific language and level
   */
  async loadRemoteProgress(userId, language, level) {
    if (!userId) return;

    try {
      const response = await api.get('progress/', {
        params: { language, level }
      });
      
      const remoteProgress = response.data.progress;
      
      // Merge remote progress into local IndexedDB
      // We use the same 'updatedAt wins' logic locally
      const localProgress = await vocabularyDb.getProgress(userId, language, level);
      const localMap = new Map(localProgress.map(p => [p.wordId, p]));

      const itemsToUpdate = [];
      for (const remote of remoteProgress) {
        const remoteUpdatedAt = new Date(remote.updatedAt).getTime();
        const local = localMap.get(remote.wordId);

        if (!local || remoteUpdatedAt > local.updatedAt) {
          itemsToUpdate.push({
            userId,
            language,
            level,
            wordId: remote.wordId,
            learned: remote.learned,
            updatedAt: remoteUpdatedAt
          });
        }
      }

      if (itemsToUpdate.length > 0) {
        await vocabularyDb.bulkSaveProgress(itemsToUpdate);
      }
      
      return itemsToUpdate.length; // Return number of items updated
    } catch (error) {
      console.error('Failed to load remote progress:', error);
      throw error;
    }
  }
};

// Listen for online event to trigger sync
window.addEventListener('online', () => {
  // We need current userId, which might be stored in a global state or localStorage
  const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
  if (userInfo.id) {
    vocabularySyncService.syncPendingChanges(userInfo.id);
  }
});
