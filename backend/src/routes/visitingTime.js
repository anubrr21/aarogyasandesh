import express from 'express'
import admin from '../config/firebase-admin.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const snapshot = await admin.firestore()
      .collection('visitingTimes')
      .orderBy('wardName', 'asc')
      .get()

    const times = []
    snapshot.forEach((doc) => {
      times.push({ id: doc.id, ...doc.data() })
    })

    res.json({ success: true, visitingTimes: times })
  } catch (error) {
    console.error('Get visiting times error:', error)
    res.status(500).json({ error: 'Failed to get visiting times' })
  }
})

router.post('/', async (req, res) => {
  try {
    const timeData = req.body

    if (!timeData.wardName || !timeData.visitingHours) {
      return res.status(400).json({ error: 'Ward name and visiting hours are required' })
    }

    const time = {
      ...timeData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    const docRef = await admin.firestore().collection('visitingTimes').add(time)

    res.json({ success: true, id: docRef.id, time })
  } catch (error) {
    console.error('Add visiting time error:', error)
    res.status(500).json({ error: 'Failed to add visiting time' })
  }
})

router.put('/:timeId', async (req, res) => {
  try {
    const { timeId } = req.params
    const updates = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    await admin.firestore()
      .collection('visitingTimes')
      .doc(timeId)
      .update(updates)

    res.json({ success: true })
  } catch (error) {
    console.error('Update visiting time error:', error)
    res.status(500).json({ error: 'Failed to update visiting time' })
  }
})

router.delete('/:timeId', async (req, res) => {
  try {
    const { timeId } = req.params

    await admin.firestore()
      .collection('visitingTimes')
      .doc(timeId)
      .delete()

    res.json({ success: true })
  } catch (error) {
    console.error('Delete visiting time error:', error)
    res.status(500).json({ error: 'Failed to delete visiting time' })
  }
})

export default router