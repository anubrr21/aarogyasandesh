import admin from '../src/config/firebase-admin.js'

const STAFF_EMAIL = 'ashtamiashtami2006@gmail.com' 

async function setStaffRole() {
  try {
    const user = await admin.auth().getUserByEmail(STAFF_EMAIL)
    await admin.auth().setCustomUserClaims(user.uid, { role: 'staff' })
    console.log(`✅ Staff role added to: ${STAFF_EMAIL}`)
    console.log(`📧 User UID: ${user.uid}`)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

setStaffRole()