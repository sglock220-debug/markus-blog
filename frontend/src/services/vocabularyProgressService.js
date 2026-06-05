import { vocabularyDb } from '../db/vocabularyDb';
import { vocabularySyncService } from './vocabularySyncService';
import axios from 'axios';

export const vocabularyProgressService = {
  /**
   * Get progress for a specific language and level.
   * Order: 1. Local IndexedDB, 2. Remote Server (async)
   */
  async getProgress(userId, language, level) {
    // 1. Get from local IndexedDB immediately
    const localProgress = await vocabularyDb.getProgress(userId, language, level);
    
    // Convert to a simple map { wordId: learned }
    const progressMap = {};
    localProgress.forEach(p => {
      progressMap[p.wordId] = p.learned;
    });

    // 2. Try to sync with server in background
    if (navigator.onLine) {
      vocabularySyncService.loadRemoteProgress(userId, language, level)
        .then(updatedCount => {
          if (updatedCount > 0) {
            console.log(`Updated ${updatedCount} items from server.`);
            // You might want to trigger a UI refresh here if needed
          }
        })
        .catch(err => console.error('Background sync failed:', err));
      
      // Also try to sync pending changes
      vocabularySyncService.syncPendingChanges(userId);
    }

    return progressMap;
  },

  /**
   * Save a single word's learned status
   */
  async saveWordProgress(userId, language, level, wordId, learned) {
    const updatedAt = Date.now();
    const operationId = crypto.randomUUID();

    const progressItem = {
      userId,
      language,
      level,
      wordId,
      learned,
      updatedAt
    };

    // 1. Save to local progress store
    await vocabularyDb.saveProgress(progressItem);

    // 2. Add to sync queue
    await vocabularyDb.addToSyncQueue({
      ...progressItem,
      operationId
    });

    // 3. Try to sync immediately if online
    if (navigator.onLine) {
      vocabularySyncService.syncPendingChanges(userId);
    }

    return progressItem;
  },

  /**
   * Migrate from old localStorage
   */
  async migrateFromLocalStorage(userId) {
    const migrationKey = `migration_done_${userId}`;
    if (localStorage.getItem(migrationKey)) return;

    console.log('Starting migration from localStorage...');
    
    // Look for patterns like vocabulary_progress_german_A2
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('vocabulary_progress_')) {
        try {
          const parts = key.split('_');
          const language = parts[2];
          const level = parts[3];
          const learnedIds = JSON.parse(localStorage.getItem(key) || '[]');
          
          if (Array.isArray(learnedIds) && learnedIds.length > 0) {
            const items = learnedIds.map(wordId => ({
              userId,
              language,
              level,
              wordId: parseInt(wordId),
              learned: true,
              updatedAt: Date.now()
            }));
            
            await vocabularyDb.bulkSaveProgress(items);
            
            // Also add to sync queue so server gets them
            for (const item of items) {
              await vocabularyDb.addToSyncQueue({
                ...item,
                operationId: crypto.randomUUID()
              });
            }
          }
          
          // We don't remove old localStorage yet, just mark migration done
          // localStorage.removeItem(key); 
        } catch (e) {
          console.error(`Migration failed for key ${key}:`, e);
        }
      }
    }

    localStorage.setItem(migrationKey, 'true');
    console.log('Migration complete.');
  }
};
