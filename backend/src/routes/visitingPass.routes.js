import express from 'express'
import jwt from 'jsonwebtoken'
import admin from '../config/firebase-admin.js'

const router = express.Router()
const db = admin.firestore()

// Visiting hours are configured and displayed in IST (the hospital's timezone), but the
// server process itself may run in UTC (e.g. Vercel), where Date.setHours() would silently
// operate on the wrong timezone. These helpers pin all "today" / hour math to IST regardless
// of the server's own local timezone.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function istNow() {
  return new Date(Date.now() + IST_OFFSET_MS)
}

function istTodayToUTCDate(hh, mm) {
  const istDateStr = istNow().toISOString().slice(0, 10)
  const paddedH = String(hh).padStart(2, '0')
  const paddedM = String(mm).padStart(2, '0')
  return new Date(Date.parse(`${istDateStr}T${paddedH}:${paddedM}:00.000Z`) - IST_OFFSET_MS)
}

function parseTimeToday(timeStr) {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return null
  let [, hh, mm, ampm] = match
  hh = parseInt(hh, 10)
  mm = parseInt(mm, 10)
  if (/pm/i.test(ampm) && hh !== 12) hh += 12
  if (/am/i.test(ampm) && hh === 12) hh = 0
  return istTodayToUTCDate(hh, mm)
}

function getVisitingWindows(visitingHoursStr) {
  if (!visitingHoursStr) return []
  if (/24\s*\/\s*7/i.test(visitingHoursStr)) {
    return [{ start: istTodayToUTCDate(0, 0), end: istTodayToUTCDate(23, 59) }]
  }
  return visitingHoursStr.split(',').map(range => {
    const [startStr, endStr] = range.split('-').map(s => s.trim())
    const start = parseTimeToday(startStr)
    const end = parseTimeToday(endStr)
    return (start && end) ? { start, end } : null
  }).filter(Boolean)
}

function isDayAllowed(visitingDaysStr) {
  if (!visitingDaysStr || /all\s*days/i.test(visitingDaysStr)) return true
  const today = istNow().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
  return visitingDaysStr.toLowerCase().includes(today.toLowerCase())
}

function normWard(s) {
  return (s || '').toString().toLowerCase().replace(/ward/gi, '').trim()
}

router.post('/generate', async (req, res) => {
  try {
    const { patientId, patientName, visitorName, ward } = req.body

    if (!patientId || !visitorName) {
      return res.status(400).json({ success: false, error: 'Patient ID and Visitor Name are required' })
    }

    const visitingTimesSnap = await db.collection('visitingTimes').get()
    const patientWardNorm = normWard(ward)
    let matchedWard = null
    visitingTimesSnap.forEach(doc => {
      const data = doc.data()
      if (normWard(data.wardName) === patientWardNorm) {
        matchedWard = { id: doc.id, ...data }
      }
    })

    if (!matchedWard) {
      return res.status(400).json({
        success: false,
        error: 'No visiting hours configured for this ward yet. Contact hospital staff.'
      })
    }

    if (!isDayAllowed(matchedWard.visitingDays)) {
      return res.status(403).json({
        success: false,
        error: `Visiting is not allowed today for ${matchedWard.wardName}. Allowed days: ${matchedWard.visitingDays}`
      })
    }

    const windows = getVisitingWindows(matchedWard.visitingHours)
    const now = new Date()
    const activeWindow = windows.find(w => now >= w.start && now <= w.end)

    if (!activeWindow) {
      return res.status(403).json({
        success: false,
        error: `You can only generate a pass during visiting hours: ${matchedWard.visitingHours}`
      })
    }

    const expiresAt = activeWindow.end

    const passToken = jwt.sign(
      {
        patientId,
        patientName: patientName || 'Patient',
        visitorName,
        ward: matchedWard.wardName,
        type: 'visiting-pass',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      },
      process.env.JWT_SECRET || 'temp-secret-key-change-in-production',
      { expiresIn: Math.max(60, Math.floor((expiresAt - now) / 1000)) }
    )

    const passRef = db.collection('visitingPasses').doc()
    await passRef.set({
      passToken,
      patientId,
      patientName: patientName || 'Patient',
      visitorName,
      ward: matchedWard.wardName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: expiresAt.toISOString(),
      used: false,
      scannedAt: null,
      isValid: true
    })

    res.json({
      success: true,
      passToken,
      passId: passRef.id,
      expiresAt: expiresAt.toISOString(),
      visitingHours: matchedWard.visitingHours
    })
  } catch (error) {
    console.error('Error generating pass:', error)
    res.status(500).json({ success: false, error: 'Failed to generate pass' })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { passId, staffName, staffId, staffConfirmedName } = req.body

    if (!passId) {
      return res.status(400).json({ success: false, error: 'Pass ID is required' })
    }

    const passRef = db.collection('visitingPasses').doc(passId)
    const doc = await passRef.get()

    if (!doc.exists) {
      return res.status(404).json({ success: false, valid: false, reason: 'Pass not found' })
    }

    const passData = doc.data()

    let decoded
    try {
      decoded = jwt.verify(passData.passToken, process.env.JWT_SECRET || 'temp-secret-key-change-in-production')
    } catch (jwtError) {
      return res.status(400).json({ success: false, valid: false, reason: 'Pass signature invalid or tampered' })
    }

    if (passData.used) {
      return res.status(400).json({ success: false, valid: false, reason: 'This pass has already been used' })
    }

    if (new Date(passData.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, valid: false, reason: 'Pass has expired' })
    }

    if (staffConfirmedName && staffConfirmedName.trim().toLowerCase() !== (passData.visitorName || '').trim().toLowerCase()) {
      return res.status(400).json({
        success: false,
        valid: false,
        reason: `Name mismatch — pass is for "${passData.visitorName}". Please verify visitor ID.`
      })
    }

    await passRef.update({
      used: true,
      scannedAt: admin.firestore.FieldValue.serverTimestamp(),
      scannedBy: staffName || 'Staff',
      staffId: staffId || null
    })

    res.json({
      success: true,
      valid: true,
      visitorName: decoded.visitorName,
      patientId: decoded.patientId,
      patientName: decoded.patientName,
      ward: decoded.ward
    })
  } catch (error) {
    console.error('Error verifying pass:', error)
    res.status(500).json({ success: false, error: 'Failed to verify pass' })
  }
})

router.get('/status/:passId', async (req, res) => {
  try {
    const { passId } = req.params
    const doc = await db.collection('visitingPasses').doc(passId).get()

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Pass not found' })
    }

    const data = doc.data()
    res.json({
      success: true,
      used: data.used || false,
      scannedAt: data.scannedAt || null,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      isValid: data.isValid !== false,
      visitorName: data.visitorName,
      patientName: data.patientName,
      ward: data.ward
    })
  } catch (error) {
    console.error('Error getting pass status:', error)
    res.status(500).json({ success: false, error: 'Failed to get pass status' })
  }
})

export default router