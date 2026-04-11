import { openDB } from 'idb';

const DB_NAME = 'AGWA_OfflineDB';
const STORE_NAME = 'offlineReadings';

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

export const saveOfflineReading = async (data) => {
  const db = await initDB();
  return db.add(STORE_NAME, { ...data, timestamp: Date.now() });
};

export const getOfflineReadings = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const deleteOfflineReading = async (id) => {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
};

export const clearOfflineReadings = async () => {
  const db = await initDB();
  return db.clear(STORE_NAME);
};