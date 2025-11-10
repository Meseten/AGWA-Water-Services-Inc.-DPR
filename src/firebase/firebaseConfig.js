import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { 
    getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence,
    doc, setDoc, getDoc, addDoc, collection, updateDoc,
    deleteDoc, query, where, getDocs, serverTimestamp,
    Timestamp, orderBy, writeBatch, getCountFromServer, arrayUnion, limit,
    FieldPath, documentId 
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

const USE_EMULATOR = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

if (USE_EMULATOR) {
    console.warn("🔥🔥🔥 Connecting to Firebase Emulators 🔥🔥🔥");
    connectAuthEmulator(auth, `http://${import.meta.env.VITE_AUTH_EMULATOR_HOST || "127.0.0.1"}:${import.meta.env.VITE_AUTH_EMULATOR_PORT || 9099}`);
    connectFirestoreEmulator(db, import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || "127.0.0.1", parseInt(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || "8080", 10));
    connectFunctionsEmulator(functions, import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST || "127.0.0.1", parseInt(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT || "5001", 10));
} else {
    console.log("🚀 Connecting to Production Firebase Services 🚀");
}

enableIndexedDbPersistence(db, { synchronization: 'MULTI_TAB' })
  .then(() => {
    console.log("Firestore offline persistence enabled for multiple tabs.");
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firestore offline persistence failed: Multiple tabs open or other issues.");
    } else if (err.code === 'unimplemented') {
      console.warn("Firestore offline persistence failed: Browser does not support all features.");
    } else {
      console.warn("Firestore persistence error:", err.message);
    }
  });

export { 
    app, auth, db, functions,
    doc, setDoc, getDoc, addDoc, collection, updateDoc,
    deleteDoc, query, where, getDocs, serverTimestamp,
    Timestamp, orderBy, writeBatch, getCountFromServer, arrayUnion, limit,
    FieldPath, documentId
};