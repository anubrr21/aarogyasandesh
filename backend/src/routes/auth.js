import express from 'express';
import admin from '../config/firebase-admin.js';
import { sendVerificationEmail } from '../services/emailService.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();
const db = admin.firestore();

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, role, accessCode, staffCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (role === 'family' && !accessCode) {
      return res.status(400).json({
        success: false,
        error: 'Access code is required for family registration'
      });
    }

    if (role === 'staff') {
      const validStaffCode = process.env.STAFF_REGISTRATION_CODE;
      if (!validStaffCode || !staffCode || staffCode !== validStaffCode) {
        return res.status(400).json({
          success: false,
          error: 'Invalid staff registration code. Please contact hospital administration.'
        });
      }
    }

    let accessCodeValid = true;
    let patientData = null;
    let patientId = null;

    if (role === 'family' && accessCode) {
      const patientsRef = admin.firestore().collection('patients');
      const snapshot = await patientsRef.where('accessCode', '==', accessCode).get();
      
      if (snapshot.empty) {
        accessCodeValid = false;
      } else {
        const doc = snapshot.docs[0];
        patientData = doc.data();
        patientId = doc.id;
        if (patientData.discharged) {
          return res.status(400).json({
            success: false,
            error: 'This patient has been discharged'
          });
        }
        // One access code can only ever be claimed by one family email. Once a family member has
        // registered against this code, no other email can register using the same code.
        if (patientData.familyEmail && patientData.familyEmail !== email) {
          return res.status(400).json({
            success: false,
            error: 'This access code is already linked to a family account. Please contact hospital staff if you believe this is an error.'
          });
        }
      }
    }

    if (!accessCodeValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid access code',
        accessCodeValid: false
      });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || '',
      emailVerified: false
    });
    const customClaims = role === 'staff' ? { role, staffGroup: staffCode } : { role };
    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);

    if (role === 'family' && accessCode && patientData && patientId) {
      await admin.firestore().collection('patients').doc(patientId).update({
        familyEmail: email,
        familyVerified: true
      });
    }

    const actionCodeSettings = {
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`,
      handleCodeInApp: true
    };

    const verificationLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

    await sendVerificationEmail(email, displayName, role, verificationLink);

    const responseData = {
      success: true,
      message: 'User created. Verification email sent.',
      uid: userRecord.uid,
      accessCodeValid: true
    };

    if (role === 'family' && patientId) {
      responseData.patientId = patientId;
    }

    return res.json(responseData);
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/send-verification-email', async (req, res) => {
  try {
    const { email, displayName, role } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const actionCodeSettings = {
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`,
      handleCodeInApp: true
    };

    const verificationLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

    await sendVerificationEmail(email, displayName, role, verificationLink);

    return res.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('Send verification email error:', error);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/send-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this email address'
      });
    }

    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`,
      handleCodeInApp: false
    });

    await sendPasswordResetEmail(email, userRecord.displayName || 'User', resetLink);

    return res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Send password reset error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send password reset email. Please try again.'
    });
  }
});

router.post('/verify-access-code', async (req, res) => {
  try {
    const { accessCode } = req.body;

    if (!accessCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Access code is required' 
      });
    }

    if (accessCode.length !== 6 || !/^\d{6}$/.test(accessCode)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Access code must be a 6-digit number' 
      });
    }

    const patientsRef = db.collection('patients');
    const q = patientsRef.where('accessCode', '==', accessCode);
    const snapshot = await q.get();

    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid access code. Please check and try again.' 
      });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    if (data.discharged === true) {
      return res.status(400).json({
        success: false,
        message: 'This patient has been discharged. Please contact the hospital for access.'
      });
    }

    const patientData = {
      id: doc.id,
      name: data.name,
      age: data.age,
      gender: data.gender,
      phone: data.phone,
      ward: data.ward,
      bed: data.bed,
      room: data.room,
      patientId: data.patientId,
      problem: data.problem,
      familyMemberName: data.familyMemberName,
      admitDate: data.admitDate,
      abhaId: data.abhaId
    };

    return res.json({
      success: true,
      patientId: doc.id,
      patientData: patientData
    });

  } catch (error) {
    console.error('Error verifying access code:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error verifying access code. Please try again.' 
    });
  }
});

router.post('/google-register', async (req, res) => {
  try {
    const { idToken, role, accessCode, staffCode } = req.body

    if (!idToken) {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }

    if (role === 'family' && !accessCode) {
      return res.status(400).json({ success: false, error: 'Access code is required for family registration' })
    }

    if (role === 'staff' && !staffCode) {
      return res.status(400).json({ success: false, error: 'Staff registration code is required' })
    }

    const decoded = await admin.auth().verifyIdToken(idToken)
    const { uid, email, name: displayName } = decoded

    // A role claim only ever gets set by a completed registration (password or Google), so if one
    // is already present this Google account was already registered — signing in created/reused the
    // same Firebase Auth user, but it must not be treated as a fresh registration a second time.
    if (decoded.role) {
      return res.status(400).json({
        success: false,
        error: 'This email is already registered. Please sign in instead.',
        alreadyRegistered: true
      })
    }

    if (role === 'staff') {
      const validStaffCode = process.env.STAFF_REGISTRATION_CODE
      if (!validStaffCode || !staffCode || staffCode !== validStaffCode) {
        await admin.auth().deleteUser(uid).catch(() => {})
        return res.status(400).json({
          success: false,
          error: 'Invalid staff registration code. Please contact hospital administration.'
        })
      }

      await admin.auth().setCustomUserClaims(uid, { role: 'staff', staffGroup: staffCode })
      // Google sign-in marks the email as verified automatically. Reset it so this account goes
      // through the exact same "check your email" verification step as password registration.
      await admin.auth().updateUser(uid, { emailVerified: false })

      const actionCodeSettings = { url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`, handleCodeInApp: true }
      const verificationLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings)
      await sendVerificationEmail(email, displayName, 'staff', verificationLink)

      return res.json({
        success: true,
        message: 'Account created. Verification email sent.',
        uid,
        accessCodeValid: true
      })
    }

    const patientsRef = admin.firestore().collection('patients')
    const snapshot = await patientsRef.where('accessCode', '==', accessCode).get()

    if (snapshot.empty) {
      // Google sign-in already created this Firebase Auth account before we could validate the
      // access code, unlike the password flow where creation only happens after validation passes.
      // Delete it here so an invalid access code never leaves behind an unclaimed account.
      await admin.auth().deleteUser(uid).catch(() => {})
      return res.status(400).json({ success: false, error: 'Invalid access code', accessCodeValid: false })
    }

    const doc = snapshot.docs[0]
    const patientData = doc.data()
    const patientId = doc.id

    if (patientData.discharged) {
      await admin.auth().deleteUser(uid).catch(() => {})
      return res.status(400).json({ success: false, error: 'This patient has been discharged' })
    }

    // One access code can only ever be claimed by one family email. Once a family member has
    // registered against this code, no other email (including via Google) can register using it.
    if (patientData.familyEmail && patientData.familyEmail !== email) {
      await admin.auth().deleteUser(uid).catch(() => {})
      return res.status(400).json({
        success: false,
        error: 'This access code is already linked to a family account. Please contact hospital staff if you believe this is an error.'
      })
    }

    await admin.auth().setCustomUserClaims(uid, { role: 'family' })

    await admin.firestore().collection('patients').doc(patientId).update({
      familyEmail: email,
      familyVerified: true
    })

    // Google sign-in marks the email as verified automatically. Reset it so this account goes
    // through the exact same "check your email" verification step as password registration.
    await admin.auth().updateUser(uid, { emailVerified: false })

    const actionCodeSettings = {
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`,
      handleCodeInApp: true
    }
    const verificationLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings)
    await sendVerificationEmail(email, displayName, 'family', verificationLink)

    return res.json({
      success: true,
      message: 'Account created. Verification email sent.',
      uid,
      patientId,
      accessCodeValid: true
    })
  } catch (error) {
    console.error('Google registration error:', error)
    return res.status(400).json({ success: false, error: error.message })
  }
})

router.get('/staff-registration-code', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!idToken) {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }

    const decoded = await admin.auth().verifyIdToken(idToken)

    if (decoded.role !== 'staff') {
      return res.status(403).json({ success: false, error: 'Only staff accounts can view the registration code' })
    }

    return res.json({ success: true, code: process.env.STAFF_REGISTRATION_CODE || null })
  } catch (error) {
    console.error('Staff registration code fetch error:', error)
    return res.status(401).json({ success: false, error: 'Invalid or expired session' })
  }
})

export default router;