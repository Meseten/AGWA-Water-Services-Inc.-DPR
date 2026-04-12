import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { 
    getFirestore, connectFirestoreEmulator, enableMultiTabIndexedDbPersistence,
    doc, setDoc, getDoc, addDoc, collection, updateDoc,
    deleteDoc, query, where, getDocs, serverTimestamp,
    Timestamp, orderBy, writeBatch, getCountFromServer, arrayUnion, limit,
    FieldPath, documentId, startAfter, runTransaction, FieldValue, CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

try {
    db._settings = { ...db._settings, cacheSizeBytes: CACHE_SIZE_UNLIMITED };
} catch (error) {
    console.warn("AGWA PWA: Proceeding with default cache sizing.", error);
}

const USE_EMULATOR = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

if (USE_EMULATOR) {
    console.warn("🔥🔥🔥 Connecting to Firebase Emulators 🔥🔥🔥");
    connectAuthEmulator(auth, `http://${import.meta.env.VITE_AUTH_EMULATOR_HOST || "127.0.0.1"}:${import.meta.env.VITE_AUTH_EMULATOR_PORT || 9099}`);
    connectFirestoreEmulator(db, import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || "127.0.0.1", parseInt(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || "8080", 10));
    connectFunctionsEmulator(functions, import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST || "127.0.0.1", parseInt(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT || "5001", 10));
} else {
    console.log("🚀 Connecting to Production Firebase Services 🚀");
}

enableMultiTabIndexedDbPersistence(db)
  .then(() => {
    console.log("AGWA PWA: Firestore offline persistence enabled and verified for multi-tab fieldwork.");
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("AGWA PWA: Offline persistence fallback active - Multiple tabs open.");
    } else if (err.code === 'unimplemented') {
      console.warn("AGWA PWA: Offline persistence degraded - Browser lacking full support.");
    } else {
      console.error("AGWA PWA: Firestore persistence initialization fault:", err.message);
    }
  });

export { 
    app, auth, db, functions,
    doc, setDoc, getDoc, addDoc, collection, updateDoc,
    deleteDoc, query, where, getDocs, serverTimestamp,
    Timestamp, orderBy, writeBatch, getCountFromServer, arrayUnion, limit,
    FieldPath, documentId, startAfter, runTransaction, FieldValue,
    CACHE_SIZE_UNLIMITED
};