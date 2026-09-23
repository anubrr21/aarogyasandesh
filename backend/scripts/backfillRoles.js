
import admin from '../src/config/firebase-admin.js';

const db = admin.firestore();

async function backfillRoles() {
  const { users } = await admin.auth().listUsers();

  const doctorsSnap = await db.collection('doctors').get();
  const doctorEmails = new Set(doctorsSnap.docs.map(d => d.data().email));

  const patientsSnap = await db.collection('patients').get();
  const familyEmails = new Set(
    patientsSnap.docs.map(d => d.data().familyEmail).filter(Boolean)
  );

  for (const user of users) {
    if (user.customClaims?.role) {
      console.log(`Skipping ${user.email} — already has role: ${user.customClaims.role}`);
      continue;
    }

    let role = null;
    if (doctorEmails.has(user.email)) {
      role = 'doctor';
    } else if (familyEmails.has(user.email)) {
      role = 'family';
    }

    if (role) {
      await admin.auth().setCustomUserClaims(user.uid, { role });
      console.log(`✅ Set ${user.email} → role: ${role}`);
    } else {
      console.log(`⚠️  Could not determine role for ${user.email} — skipped, set manually if needed`);
    }
  }

  console.log('Backfill complete.');
}

backfillRoles().catch(console.error);