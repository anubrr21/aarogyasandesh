import admin from '../config/firebase-admin.js'

const db = admin.firestore()

export const getPolicies = async (userId) => {
  const snapshot = await db.collection('users').doc(userId).collection('insurancePolicies').get()
  const policies = []
  snapshot.forEach((doc) => {
    policies.push({ id: doc.id, ...doc.data() })
  })
  return policies
}

export const getPolicyById = async (userId, policyId) => {
  const doc = await db.collection('users').doc(userId).collection('insurancePolicies').doc(policyId).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() }
}

export const createPolicy = async (userId, policyData) => {
  const policyRef = db.collection('users').doc(userId).collection('insurancePolicies').doc()
  await policyRef.set({
    ...policyData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  return { id: policyRef.id, ...policyData }
}

export const updatePolicy = async (userId, policyId, policyData) => {
  await db.collection('users').doc(userId).collection('insurancePolicies').doc(policyId).update({
    ...policyData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  return { id: policyId, ...policyData }
}

export const deletePolicy = async (userId, policyId) => {
  await db.collection('users').doc(userId).collection('insurancePolicies').doc(policyId).delete()
  return { success: true }
}

export const getClaims = async (userId, policyId) => {
  let query = db.collection('users').doc(userId).collection('insurancePolicies')
  if (policyId) {
    query = query.doc(policyId).collection('claims')
  } else {
    query = query.doc().collection('claims')
  }
  const snapshot = await query.get()
  const claims = []
  snapshot.forEach((doc) => {
    claims.push({ id: doc.id, ...doc.data() })
  })
  return claims
}

export const getClaimById = async (userId, policyId, claimId) => {
  const doc = await db.collection('users').doc(userId).collection('insurancePolicies').doc(policyId).collection('claims').doc(claimId).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() }
}

export const createClaim = async (userId, policyId, claimData) => {
  const claimRef = db.collection('users').doc(userId).collection('insurancePolicies').doc(policyId).collection('claims').doc()
  await claimRef.set({
    ...claimData,
    policyId,
    status: 'Submitted',
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  return { id: claimRef.id, ...claimData }
}

export const updateClaim = async (userId, policyId, claimId, claimData) => {
  await db.collection('users').doc(userId).collection('insurancePolicies').doc(policyId).collection('claims').doc(claimId).update({
    ...claimData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  return { id: claimId, ...claimData }
}

export const getInsuranceSummary = async (patientId) => {
  try {
    const patientDoc = await db.collection('patients').doc(patientId).get()
    if (!patientDoc.exists) return null
    const patientData = patientDoc.data()
    const familyEmail = patientData.familyEmail
    if (!familyEmail) return null
    const userSnapshot = await db.collection('users').where('email', '==', familyEmail).get()
    if (userSnapshot.empty) return null
    const userId = userSnapshot.docs[0].id
    const policies = await getPolicies(userId)
    const activePolicies = policies.filter(p => {
      if (!p.expiryDate) return true
      return new Date(p.expiryDate) > new Date()
    })
    const summary = activePolicies.map(p => ({
      provider: p.provider,
      policyNumber: p.policyNumber,
      policyType: p.policyType,
      sumInsured: p.sumInsured,
      status: 'Active',
      memberName: patientData.name
    }))
    return summary
  } catch (error) {
    console.error('Error getting insurance summary:', error)
    return null
  }
}