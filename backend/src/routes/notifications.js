import express from 'express'
import admin from '../config/firebase-admin.js'

const router = express.Router()

// Notifications are keyed by userId/userType the way the in-app bell already works (patientId for
// family, staff doc id for staff — which already equals their auth uid — doctor doc id for doctor).
// Push tokens are always stored by the person's real Firebase Auth uid, so this resolves one to the
// other before looking up a token. Centralized here so no existing notification-creation code has
// to change at all — this only affects the new, additive push-delivery step.
async function resolveAuthUid(userId, userType) {
  try {
    if (userType === 'staff') {
      return userId // staff/{uid} docs are already keyed by the staff member's own auth uid
    }
    if (userType === 'family') {
      const patientDoc = await admin.firestore().collection('patients').doc(userId).get()
      const email = patientDoc.data()?.familyEmail
      if (!email) return null
      const userRecord = await admin.auth().getUserByEmail(email)
      return userRecord.uid
    }
    if (userType === 'doctor') {
      const doctorDoc = await admin.firestore().collection('doctors').doc(userId).get()
      const email = doctorDoc.data()?.email
      if (!email) return null
      const userRecord = await admin.auth().getUserByEmail(email)
      return userRecord.uid
    }
  } catch (error) {
    console.error('Error resolving auth uid for push:', error)
  }
  return null
}

// Best-effort push send — never throws, never blocks the caller. If the user hasn't enabled push
// (no token saved) this silently does nothing, which is the correct, expected default.
async function sendPushToUser(userId, userType, title, message, data = {}) {
  try {
    const authUid = await resolveAuthUid(userId, userType)
    if (!authUid) return

    const tokenDoc = await admin.firestore().collection('notificationTokens').doc(authUid).get()
    if (!tokenDoc.exists) return
    const tokens = tokenDoc.data().tokens || []
    if (tokens.length === 0) return

    const stringData = {}
    Object.entries(data || {}).forEach(([k, v]) => { stringData[k] = String(v) })

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body: message },
      data: stringData
    })

    const invalidTokens = []
    response.responses.forEach((r, i) => {
      if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
        invalidTokens.push(tokens[i])
      }
    })
    if (invalidTokens.length > 0) {
      await admin.firestore().collection('notificationTokens').doc(authUid).update({
        tokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
      })
    }
  } catch (error) {
    console.error(`Error sending push notification to ${userType} ${userId}:`, error)
  }
}

router.post('/create', async (req, res) => {
  try {
    const { userId, userType, title, message, type, data } = req.body

    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const notification = {
      userId,
      userType,
      title,
      message,
      type: type || 'general',
      read: false,
      data: data || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }

    const docRef = await admin.firestore().collection('notifications').add(notification)

    sendPushToUser(userId, userType, title, message, data).catch(() => {})

    res.json({ success: true, id: docRef.id, notification })
  } catch (error) {
    console.error('Create notification error:', error)
    res.status(500).json({ error: 'Failed to create notification' })
  }
})

// Fans a notification out to every staff member. Runs through the Admin SDK (server-side,
// bypasses Firestore security rules) because the `staff` collection's rules only let a staff
// member read their own doc — a doctor or family member can never list the whole collection
// from the client, which is what made "send note to staff" fail before.
router.post('/notify-staff', async (req, res) => {
  try {
    const { title, message, type, data } = req.body

    if (!title || !message) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const staffSnapshot = await admin.firestore().collection('staff').get()

    const batch = admin.firestore().batch()
    staffSnapshot.docs.forEach((staffDoc) => {
      const notifRef = admin.firestore().collection('notifications').doc()
      batch.set(notifRef, {
        userId: staffDoc.id,
        userType: 'staff',
        title,
        message,
        type: type || 'general',
        read: false,
        data: data || {},
        createdAt: new Date().toISOString()
      })
    })
    await batch.commit()

    staffSnapshot.docs.forEach((staffDoc) => {
      sendPushToUser(staffDoc.id, 'staff', title, message, data).catch(() => {})
    })

    res.json({ success: true, notified: staffSnapshot.size })
  } catch (error) {
    console.error('Notify staff error:', error)
    res.status(500).json({ error: 'Failed to notify staff' })
  }
})

// Used by client-side notification creators (notifyFamily helpers, direct addDoc-to-doctor calls)
// that write the Firestore notification doc themselves — they call this afterward purely to also
// trigger a push, since only the backend has the Admin SDK access needed to send one.
router.post('/send-push', async (req, res) => {
  try {
    const { userId, userType, title, message, data } = req.body
    if (!userId || !userType || !title || !message) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }
    await sendPushToUser(userId, userType, title, message, data || {})
    res.json({ success: true })
  } catch (error) {
    console.error('Send push error:', error)
    res.status(500).json({ success: false, error: 'Failed to send push notification' })
  }
})

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { userType } = req.query

    let query = admin.firestore()
      .collection('notifications')
      .where('userId', '==', userId)

    if (userType) {
      query = query.where('userType', '==', userType)
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get()
    const notifications = []
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() })
    })

    res.json({ success: true, notifications })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ error: 'Failed to get notifications' })
  }
})

router.put('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params

    await admin.firestore()
      .collection('notifications')
      .doc(notificationId)
      .update({ read: true })

    res.json({ success: true })
  } catch (error) {
    console.error('Mark notification read error:', error)
    res.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

router.put('/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params

    const snapshot = await admin.firestore()
      .collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get()

    const batch = admin.firestore().batch()
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { read: true })
    })

    await batch.commit()

    res.json({ success: true, count: snapshot.size })
  } catch (error) {
    console.error('Mark all notifications read error:', error)
    res.status(500).json({ error: 'Failed to mark notifications as read' })
  }
})

router.delete('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params

    await admin.firestore()
      .collection('notifications')
      .doc(notificationId)
      .delete()

    res.json({ success: true })
  } catch (error) {
    console.error('Delete notification error:', error)
    res.status(500).json({ error: 'Failed to delete notification' })
  }
})

export default router