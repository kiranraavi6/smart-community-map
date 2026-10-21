import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCfsgZXyE70XkYXJAdQdi5I3wJ3SbsmyOQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "community-asset-map-857b3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "community-asset-map-857b3",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "community-asset-map-857b3.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "261058841839",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:261058841839:web:de9756a131850b4cd7df1a"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
