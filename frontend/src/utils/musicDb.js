import { openDB } from 'idb';

const DB_NAME = 'izawa_music_db';
const DB_VERSION = 1;

export const initMusicDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 1. settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }

      // 2. tracks store
      if (!db.objectStoreNames.contains('tracks')) {
        const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
        trackStore.createIndex('source', 'source', { unique: false });
      }
    },
  });
};

const dbPromise = initMusicDB();

export const musicDb = {
  // Settings operations
  async getSetting(key) {
    const db = await dbPromise;
    return db.get('settings', key);
  },
  async setSetting(key, value) {
    const db = await dbPromise;
    return db.put('settings', value, key);
  },
  async removeSetting(key) {
    const db = await dbPromise;
    return db.delete('settings', key);
  },

  // Tracks operations
  async getAllTracks() {
    const db = await dbPromise;
    return db.getAll('tracks');
  },
  async saveTracks(tracks) {
    const db = await dbPromise;
    const tx = db.transaction('tracks', 'readwrite');
    // Clear existing local tracks first if needed, or just put all
    for (const track of tracks) {
      tx.store.put(track);
    }
    await tx.done;
  },
  async clearLocalTracks() {
    const db = await dbPromise;
    const tx = db.transaction('tracks', 'readwrite');
    const index = tx.store.index('source');
    let cursor = await index.openCursor(IDBKeyRange.only('local'));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },
  async addTrack(track) {
    const db = await dbPromise;
    return db.put('tracks', track);
  }
};
