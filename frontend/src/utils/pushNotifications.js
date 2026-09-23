import { getToken } from 'firebase/messaging'
import { doc, setDoc, arrayUnion } from 'firebase/firestore'
import { messaging, db, auth } from '../firebase/firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Requests permission, registers the service worker, gets a device token, and saves it under the
// current signed-in user's own auth uid. Always keyed by auth uid (not by patientId/staffId/etc)
// so it works identically regardless of role, and matches the Firestore rule that only lets a user
// write to their own token document.
export async function enablePushNotifications() {
  if (!messaging) {
    return { success: false, error: 'Push notifications are not supported in this browser.' }
  }
  if (!VAPID_KEY) {
    return { success: false, error: 'Push notifications are not configured yet.' }
  }
  if (typeof Notification === 'undefined') {
    return { success: false, error: 'Push notifications are not supported in this browser.' }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was not granted.' }
    }

    await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const readyRegistration = await navigator.serviceWorker.ready
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: readyRegistration })

    if (!token) {
      return { success: false, error: 'Could not get a notification token. Please try again.' }
    }

    const uid = auth.currentUser?.uid
    if (!uid) {
      return { success: false, error: 'You must be signed in to enable notifications.' }
    }

    await setDoc(doc(db, 'notificationTokens', uid), {
      tokens: arrayUnion(token),
      updatedAt: new Date().toISOString()
    }, { merge: true })

    return { success: true }
  } catch (error) {
    console.error('Error enabling push notifications:', error)
    return { success: false, error: error.message || 'Failed to enable push notifications.' }
  }
}

// Fire-and-forget: asks the backend to push a notification to a user's device(s), given the exact
// same userId/userType already used to create the in-app bell notification. The backend resolves
// that into the right auth uid and sends via FCM — this call never blocks or throws for callers.
export async function sendPushNotification({ userId, userType, title, message, data = {} }) {
  try {
    await fetch(`${API_URL}/api/notifications/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userType, title, message, data })
    })
  } catch (error) {
    console.error('Error sending push notification:', error)
  }
}
