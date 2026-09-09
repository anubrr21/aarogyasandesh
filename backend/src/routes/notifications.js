import express from 'express'
import admin from '../config/firebase-admin.js'

const router = express.Router()

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

    res.json({ success: true, id: docRef.id, notification })
  } catch (error) {
    console.error('Create notification error:', error)
    res.status(500).json({ error: 'Failed to create notification' })
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