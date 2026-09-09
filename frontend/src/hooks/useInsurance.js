import { useState, useEffect, useCallback } from 'react'
import { db, storage, ref, uploadBytes, getDownloadURL } from '../firebase/firebase'
import { doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const useInsurance = () => {
  const { user } = useAuth()
  const [policies, setPolicies] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const policiesRef = collection(db, 'users', user.uid, 'insurancePolicies')
    const unsubscribe = onSnapshot(policiesRef, (snapshot) => {
      const policiesList = []
      snapshot.forEach((doc) => {
        policiesList.push({ id: doc.id, ...doc.data() })
      })
      setPolicies(policiesList)
      setLoading(false)
    }, (err) => {
      console.error('Error fetching policies:', err)
      setError(err.message)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const addPolicy = async (policyData) => {
    if (!user) throw new Error('User not authenticated')
    try {
      const policiesRef = collection(db, 'users', user.uid, 'insurancePolicies')
      const docRef = await addDoc(policiesRef, {
        ...policyData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      return { success: true, id: docRef.id }
    } catch (error) {
      console.error('Error adding policy:', error)
      throw error
    }
  }

  const updatePolicy = async (policyId, policyData) => {
    if (!user) throw new Error('User not authenticated')
    try {
      const policyRef = doc(db, 'users', user.uid, 'insurancePolicies', policyId)
      await updateDoc(policyRef, {
        ...policyData,
        updatedAt: new Date().toISOString()
      })
      return { success: true }
    } catch (error) {
      console.error('Error updating policy:', error)
      throw error
    }
  }

  const deletePolicy = async (policyId) => {
    if (!user) throw new Error('User not authenticated')
    try {
      const policyRef = doc(db, 'users', user.uid, 'insurancePolicies', policyId)
      await deleteDoc(policyRef)
      return { success: true }
    } catch (error) {
      console.error('Error deleting policy:', error)
      throw error
    }
  }

  const getClaims = async (policyId) => {
    if (!user) throw new Error('User not authenticated')
    try {
      const claimsRef = collection(db, 'users', user.uid, 'insurancePolicies', policyId, 'claims')
      const snapshot = await getDocs(claimsRef)
      const claimsList = []
      snapshot.forEach((doc) => {
        claimsList.push({ id: doc.id, ...doc.data() })
      })
      return claimsList
    } catch (error) {
      console.error('Error fetching claims:', error)
      throw error
    }
  }

  const addClaim = async (policyId, claimData) => {
    if (!user) throw new Error('User not authenticated')
    try {
      const claimsRef = collection(db, 'users', user.uid, 'insurancePolicies', policyId, 'claims')
      const docRef = await addDoc(claimsRef, {
        ...claimData,
        policyId,
        status: 'Submitted',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      return { success: true, id: docRef.id }
    } catch (error) {
      console.error('Error adding claim:', error)
      throw error
    }
  }

  const updateClaim = async (policyId, claimId, claimData) => {
    if (!user) throw new Error('User not authenticated')
    try {
      const claimRef = doc(db, 'users', user.uid, 'insurancePolicies', policyId, 'claims', claimId)
      await updateDoc(claimRef, {
        ...claimData,
        updatedAt: new Date().toISOString()
      })
      return { success: true }
    } catch (error) {
      console.error('Error updating claim:', error)
      throw error
    }
  }

  const uploadDocument = async (file, path) => {
    if (!user) throw new Error('User not authenticated')
    try {
      const storageRef = ref(storage, `insurance/${user.uid}/${path}/${file.name}`)
      await uploadBytes(storageRef, file)
      const downloadUrl = await getDownloadURL(storageRef)
      return downloadUrl
    } catch (error) {
      console.error('Error uploading document:', error)
      throw error
    }
  }

  const getInsuranceSummary = async (patientId) => {
    try {
      const response = await fetch(`${API_URL}/api/insurance/patient/${patientId}/summary`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.summary
    } catch (error) {
      console.error('Error getting insurance summary:', error)
      return null
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'text-gray-500',
      'Submitted': 'text-blue-500',
      'Under Review': 'text-yellow-500',
      'Approved': 'text-emerald-500',
      'Rejected': 'text-red-500',
      'Settled': 'text-teal-500'
    }
    return colors[status] || 'text-gray-500'
  }

  const getStatusBadge = (status) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-700 border-gray-200',
      'Submitted': 'bg-blue-50 text-blue-700 border-blue-200',
      'Under Review': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Rejected': 'bg-red-50 text-red-700 border-red-200',
      'Settled': 'bg-teal-50 text-teal-700 border-teal-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const maskPolicyNumber = (number) => {
    if (!number) return 'N/A'
    if (number.length <= 4) return 'XXXX-XXXX-' + number
    return 'XXXX-XXXX-' + number.slice(-4)
  }

  return {
    policies,
    claims,
    loading,
    error,
    addPolicy,
    updatePolicy,
    deletePolicy,
    getClaims,
    addClaim,
    updateClaim,
    uploadDocument,
    getInsuranceSummary,
    getStatusColor,
    getStatusBadge,
    maskPolicyNumber
  }
}

export default useInsurance