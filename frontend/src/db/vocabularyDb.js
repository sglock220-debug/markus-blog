import { openDB } from 'idb';

const DB_NAME = 'VocabularyLearningDB';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 1. vocabulary store
      if (!db.objectStoreNames.contains('vocabulary')) {
        db.createObjectStore('vocabulary', { keyPath: 'key' });
      }

      // 2. progress store
      if (!db.objectStoreNames.contains('progress')) {
        const progressStore = db.createObjectStore('progress', { keyPath: 'key' });
        progressStore.createIndex('userId', 'userId', { unique: false });
        progressStore.createIndex('language_level', ['language', 'level'], { unique: false });
        progressStore.createIndex('user_lang_level', ['userId', 'language', 'level'], { unique: false });
      }

      // 3. syncQueue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'operationId' });
        syncStore.createIndex('userId', 'userId', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
      }
    },
  });
};

const dbPromise = initDB();

export const vocabularyDb = {
  // Vocabulary operations
  async getVocabulary(language, level) {
    const db = await dbPromise;
    return db.get('vocabulary', `${language}_${level}`);
  },
  async saveVocabulary(language, level, data) {
    const db = await dbPromise;
    return db.put('vocabulary', {
      key: `${language}_${level}`,
      language,
      level,
      ...data,
      cachedAt: Date.now()
    });
  },

  // Progress operations
  async getProgress(userId, language, level) {
    const db = await dbPromise;
    const allProgress = await db.getAllFromIndex('progress', 'user_lang_level', [userId, language, level]);
    return allProgress;
  },
  async saveProgress(item) {
    const db = await dbPromise;
    // key: userId_language_level_wordId
    const key = `${item.userId}_${item.language}_${item.level}_${item.wordId}`;
    return db.put('progress', { ...item, key });
  },
  async bulkSaveProgress(items) {
    const db = await dbPromise;
    const tx = db.transaction('progress', 'readwrite');
    for (const item of items) {
      const key = `${item.userId}_${item.language}_${item.level}_${item.wordId}`;
      tx.store.put({ ...item, key });
    }
    await tx.done;
  },

  // Sync Queue operations
  async addToSyncQueue(item) {
    const db = await dbPromise;
    return db.put('syncQueue', { ...item, status: 'pending' });
  },
  async getPendingSync(userId) {
    const db = await dbPromise;
    const allSync = await db.getAllFromIndex('syncQueue', 'userId', userId);
    return allSync.filter(item => item.status === 'pending');
  },
  async updateSyncStatus(operationId, status) {
    const db = await dbPromise;
    const item = await db.get('syncQueue', operationId);
    if (item) {
      item.status = status;
      return db.put('syncQueue', item);
    }
  },
  async removeFromSyncQueue(operationId) {
    const db = await dbPromise;
    return db.delete('syncQueue', operationId);
  }
};
