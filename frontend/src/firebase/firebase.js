import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)

// EXPORT Gemini API Key from .env
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()

// Push notifications (Firebase Cloud Messaging). Not every browser supports this (older Safari,
// private/incognito modes in some browsers), so this is wrapped defensively — anything importing
// `messaging` must handle it being null and skip push features gracefully, exactly like the rest
// of this app already does for optional browser APIs (e.g. SpeechRecognition in SandeshGPT).
let messagingInstance = null
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messagingInstance = getMessaging(app)
  }
} catch (err) {
  console.warn('Firebase Messaging not supported in this browser:', err)
}
export const messaging = messagingInstance
export { isMessagingSupported }

export { RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup, ref, uploadBytes, getDownloadURL, deleteObject }