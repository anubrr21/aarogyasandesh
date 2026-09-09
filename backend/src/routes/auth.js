import express from 'express';
import admin from '../config/firebase-admin.js';
import { sendVerificationEmail } from '../services/emailService.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();
const db = admin.firestore();

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName, role, accessCode } = req.body;

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
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    if (role === 'family' && accessCode && patientData && patientId) {
      await admin.firestore().collection('patients').doc(patientId).update({
        familyEmail: email,
        familyVerified: true
      });
    }

    const actionCodeSettings = {
      url: 'http://localhost:5173/login',
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
      url: 'http://localhost:5173/login',
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

export default router;