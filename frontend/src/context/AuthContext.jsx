
import { createContext, useContext, useState, useEffect } from 'react'
import { auth } from '../firebase/firebase'
import { onAuthStateChanged, signOut, sendPasswordResetEmail as firebaseSendPasswordReset } from 'firebase/auth'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [authError, setAuthError] = useState(null)

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      setUser(firebaseUser)
      const savedRole = localStorage.getItem('userRole')
      // Accept 'doctor' role as valid
      if (savedRole === 'family' || savedRole === 'staff' || savedRole === 'doctor') {
        setRole(savedRole)
      } else {
        // If role is invalid, still set it but log warning
        setRole(savedRole)
        console.warn('Unknown role:', savedRole)
      }
    } else {
      setUser(null)
      setRole(null)
      localStorage.removeItem('userRole')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('patientId')
      localStorage.removeItem('patientData')
      localStorage.removeItem('staffGroup')
    }
    setLoading(false)
  })

  return () => unsubscribe()
}, [])

  const logout = async () => {
    try {
      await signOut(auth)
      setUser(null)
      setRole(null)
      localStorage.removeItem('userRole')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('patientId')
      localStorage.removeItem('patientData')
      localStorage.removeItem('staffGroup')
    } catch (error) {
      console.error(error)
      setAuthError(error.message)
    }
  }

  const sendPasswordReset = async (email) => {
    try {
      // Step 1: Generate the reset link using Firebase
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      }
      
      const resetLink = await firebaseSendPasswordReset(auth, email, actionCodeSettings)
      
      // Step 2: Send the beautiful email using Brevo
      // We need to call our backend API to send the Brevo email
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/send-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        throw new Error('Failed to send reset email')
      }

      return { success: true }
    } catch (error) {
      console.error('Password reset error:', error)
      let message = 'Failed to send reset link. Please try again.'
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email address.'
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address. Please check and try again.'
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many requests. Please try again later.'
      }
      return { success: false, error: message }
    }
  }

  const value = {
    user,
    role,
    loading,
    authError,
    logout,
    isAuthenticated: !!user,
    userRole: role || localStorage.getItem('userRole'),
    sendPasswordReset
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}