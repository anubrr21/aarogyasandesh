import express from 'express'
import admin from '../config/firebase-admin.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const snapshot = await admin.firestore()
      .collection('doctors')
      .orderBy('name', 'asc')
      .get()

    const doctors = []
    snapshot.forEach((doc) => {
      doctors.push({ id: doc.id, ...doc.data() })
    })

    res.json({ success: true, doctors })
  } catch (error) {
    console.error('Get doctors error:', error)
    res.status(500).json({ error: 'Failed to get doctors' })
  }
})

router.post('/', async (req, res) => {
  try {
    const doctorData = req.body

    if (!doctorData.name || !doctorData.specialization || !doctorData.email) {
      return res.status(400).json({ error: 'Name, specialization, and email are required' })
    }

    const doctor = {
      ...doctorData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    const docRef = await admin.firestore().collection('doctors').add(doctor)

    res.json({ success: true, id: docRef.id, doctor })
  } catch (error) {
    console.error('Add doctor error:', error)
    res.status(500).json({ error: 'Failed to add doctor' })
  }
})

router.put('/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params
    const updates = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    await admin.firestore()
      .collection('doctors')
      .doc(doctorId)
      .update(updates)

    res.json({ success: true })
  } catch (error) {
    console.error('Update doctor error:', error)
    res.status(500).json({ error: 'Failed to update doctor' })
  }
})

router.delete('/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params

    await admin.firestore()
      .collection('doctors')
      .doc(doctorId)
      .delete()

    res.json({ success: true })
  } catch (error) {
    console.error('Delete doctor error:', error)
    res.status(500).json({ error: 'Failed to delete doctor' })
  }
})

router.patch('/:doctorId/availability', async (req, res) => {
  try {
    const { doctorId } = req.params
    const { availability } = req.body

    if (!availability || !['available', 'unavailable'].includes(availability)) {
      return res.status(400).json({ error: 'Invalid availability status' })
    }

    await admin.firestore()
      .collection('doctors')
      .doc(doctorId)
      .update({
        availability,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })

    res.json({ success: true })
  } catch (error) {
    console.error('Update availability error:', error)
    res.status(500).json({ error: 'Failed to update availability' })
  }
})

export default router