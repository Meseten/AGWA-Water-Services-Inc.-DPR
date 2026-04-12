import { openDB } from 'idb';

const DB_NAME = 'AGWA_OfflineDB';
const OFFLINE_READINGS_STORE = 'offlineReadings';
const OFFLINE_PROFILES_STORE = 'offlineProfiles';
const OFFLINE_BILLS_STORE = 'offlineBills';

export const initDB = async () => {
  return openDB(DB_NAME, 2, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains(OFFLINE_READINGS_STORE)) {
        db.createObjectStore(OFFLINE_READINGS_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(OFFLINE_PROFILES_STORE)) {
        const profileStore = db.createObjectStore(OFFLINE_PROFILES_STORE, { keyPath: 'id' });
        profileStore.createIndex('accountNumber', 'accountNumber', { unique: false });
        profileStore.createIndex('displayNameLower', 'displayNameLower', { unique: false });
      }
      if (!db.objectStoreNames.contains(OFFLINE_BILLS_STORE)) {
        const billStore = db.createObjectStore(OFFLINE_BILLS_STORE, { keyPath: 'id' });
        billStore.createIndex('userId', 'userId', { unique: false });
        billStore.createIndex('status', 'status', { unique: false });
      }
    },
  });
};

export const saveOfflineReading = async (data) => {
  const db = await initDB();
  return db.add(OFFLINE_READINGS_STORE, { ...data, timestamp: Date.now() });
};

export const getOfflineReadings = async () => {
  const db = await initDB();
  return db.getAll(OFFLINE_READINGS_STORE);
};

export const deleteOfflineReading = async (id) => {
  const db = await initDB();
  return db.delete(OFFLINE_READINGS_STORE, id);
};

export const clearOfflineReadings = async () => {
  const db = await initDB();
  return db.clear(OFFLINE_READINGS_STORE);
};

export const cacheProfilesOffline = async (profiles) => {
  const db = await initDB();
  const tx = db.transaction(OFFLINE_PROFILES_STORE, 'readwrite');
  await tx.store.clear();
  for (const profile of profiles) {
    await tx.store.put(profile);
  }
  await tx.done;
};

export const searchOfflineProfiles = async (searchTerm) => {
  const db = await initDB();
  const allProfiles = await db.getAll(OFFLINE_PROFILES_STORE);
  const term = searchTerm.toLowerCase();
  return allProfiles.filter(p => 
    (p.accountNumber && p.accountNumber.toLowerCase().includes(term)) || 
    (p.displayNameLower && p.displayNameLower.includes(term)) ||
    (p.meterSerialNumber && p.meterSerialNumber.toLowerCase().includes(term))
  );
};

export const cacheBillsOffline = async (bills) => {
  const db = await initDB();
  const tx = db.transaction(OFFLINE_BILLS_STORE, 'readwrite');
  await tx.store.clear();
  for (const bill of bills) {
    await tx.store.put(bill);
  }
  await tx.done;
};

export const getOfflineBillsByUser = async (userId) => {
  const db = await initDB();
  const index = db.transaction(OFFLINE_BILLS_STORE, 'readonly').store.index('userId');
  return index.getAll(userId);
};