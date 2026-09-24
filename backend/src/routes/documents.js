import express from 'express'
import crypto from 'crypto'
import admin from '../config/firebase-admin.js'

const router = express.Router()
const db = admin.firestore()

const KINDS = {
  invoice: 'Medical Invoice',
  'final-bill': 'Final Bill',
  'discharge-summary': 'Discharge Summary'
}

function maskName(name) {
  return String(name || 'Patient')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] + '*'.repeat(Math.max(part.length - 1, 1)))
    .join(' ')
}

function sum(list, key) {
  return (list || []).reduce((total, entry) => total + (parseFloat(entry?.[key]) || 0), 0)
}

async function requireUser(req, res) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ success: false, error: 'Not authenticated' })
    return null
  }
  try {
    return await admin.auth().verifyIdToken(token)
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired session' })
    return null
  }
}

router.post('/register', async (req, res) => {
  try {
    const user = await requireUser(req, res)
    if (!user) return

    const { kind, patientDocId, docRef } = req.body || {}
    if (!KINDS[kind] || !patientDocId || typeof patientDocId !== 'string' || patientDocId.length > 128) {
      return res.status(400).json({ success: false, error: 'Invalid document details' })
    }

    const snap = await db.collection('patients').doc(patientDocId).get()
    if (!snap.exists) {
      return res.status(404).json({ success: false, error: 'Patient not found' })
    }

    const patient = snap.data()
    const items = patient.billing?.items || []
    const deposits = patient.billing?.deposits || []
    const totalBill = sum(items, 'amount')
    const totalDeposits = sum(deposits, 'amount')
    const dischargedAt = patient.discharge?.actualTime || null
    const admitDate = patient.admitDate || patient.admittedAt || null

    const id = crypto
      .createHash('sha256')
      .update([kind, patientDocId, totalBill, totalDeposits, items.length, deposits.length, dischargedAt || '', admitDate || ''].join('|'))
      .digest('hex')
      .slice(0, 20)

    const ref = db.collection('issuedDocuments').doc(id)
    const existing = await ref.get()
    const now = admin.firestore.FieldValue.serverTimestamp()

    if (existing.exists) {
      await ref.update({ lastIssuedAt: now, issueCount: admin.firestore.FieldValue.increment(1) })
    } else {
      await ref.set({
        kind,
        docRef: String(docRef || '').slice(0, 64),
        patientDocId,
        patientNameMasked: maskName(patient.name),
        patientId: patient.patientId || null,
        totalBill,
        totalDeposits,
        balance: totalDeposits - totalBill,
        itemCount: items.length,
        admitDate,
        dischargedAt,
        lengthOfStay: patient.discharge?.dischargeSummary?.lengthOfStay ?? null,
        firstIssuedAt: now,
        lastIssuedAt: now,
        issueCount: 1,
        issuedBy: user.uid,
        issuedByRole: user.role || 'unknown'
      })
    }

    res.json({ success: true, id })
  } catch (error) {
    console.error('Error registering document:', error)
    res.status(500).json({ success: false, error: 'Could not register document' })
  }
})

router.get('/verify/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (!/^[a-f0-9]{20}$/.test(id)) {
      return res.json({ success: true, valid: false })
    }

    const snap = await db.collection('issuedDocuments').doc(id).get()
    if (!snap.exists) {
      return res.json({ success: true, valid: false })
    }

    const data = snap.data()
    const isBill = data.kind === 'invoice' || data.kind === 'final-bill'
    res.json({
      success: true,
      valid: true,
      document: {
        type: KINDS[data.kind],
        kind: data.kind,
        reference: data.docRef,
        patientName: data.patientNameMasked,
        patientId: data.patientId,
        firstIssuedAt: data.firstIssuedAt?.toDate?.().toISOString() || null,
        lastIssuedAt: data.lastIssuedAt?.toDate?.().toISOString() || null,
        copiesIssued: data.issueCount || 1,
        admitDate: data.admitDate,
        dischargedAt: data.dischargedAt,
        lengthOfStay: data.lengthOfStay,
        ...(isBill
          ? { totalBill: data.totalBill, totalDeposits: data.totalDeposits, balance: data.balance, itemCount: data.itemCount }
          : {})
      }
    })
  } catch (error) {
    console.error('Error verifying document:', error)
    res.status(500).json({ success: false, error: 'Could not verify document' })
  }
})

export default router
