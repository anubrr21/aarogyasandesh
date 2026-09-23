import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Check, X, Shield, AlertCircle, Key, Heart, Mail, Lock, User, ArrowRight, Stethoscope } from 'lucide-react'
import { getAdditionalUserInfo } from 'firebase/auth'
import { auth, googleProvider, signInWithPopup } from '../../firebase/firebase'
import Logo from '../../assets/Logo.png'
import Wordmark from '../common/Wordmark'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const Register = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [staffCode, setStaffCode] = useState('')
  const [role, setRole] = useState('family')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: 'Weak',
    color: 'bg-red-500',
    checks: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    }
  })
  const navigate = useNavigate()

  useEffect(() => {
    validatePassword(password)
  }, [password])

  const validatePassword = (pwd) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    }

    const passed = Object.values(checks).filter(Boolean).length
    let label = 'Weak'
    let color = 'bg-red-500'
    let score = 0

    if (passed === 5) {
      label = 'Strong'
      color = 'bg-emerald-500'
      score = 100
    } else if (passed >= 3) {
      label = 'Medium'
      color = 'bg-yellow-500'
      score = 60
    } else if (passed >= 1) {
      label = 'Weak'
      color = 'bg-red-500'
      score = 30
    }

    setPasswordStrength({
      score,
      label,
      color,
      checks
    })
  }

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword

  const handleRegister = async (e) => {
    e.preventDefault()

    if (!email || !password || !confirmPassword || !name) {
      setError('Please fill in all fields')
      return
    }

    if (role === 'family' && !accessCode) {
      setError('Please enter your access code')
      return
    }

    if (role === 'staff' && !staffCode) {
      setError('Please enter the staff registration code')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (passwordStrength.score < 60) {
      setError('Please use a stronger password')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName: name, role, accessCode, staffCode })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to register')
      }

      if (role === 'family' && data.accessCodeValid === false) {
        setError('Invalid access code. Please check with hospital staff.')
        setLoading(false)
        return
      }

      localStorage.setItem('userRole', role)
      if (role === 'family' && data.patientId) {
        localStorage.setItem('patientId', data.patientId)
        localStorage.setItem('accessToken', accessCode)
      }
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error) {
      console.error('Registration error:', error)
      const message = error.message || ''
      if (message.includes('already-exists') || message.includes('already-in-use') || message.includes('EMAIL_EXISTS')) {
        setError('This email is already registered. Please login instead.')
      } else if (message.includes('invalid-email') || message.includes('INVALID_EMAIL')) {
        setError('Invalid email address. Please check and try again.')
      } else if (message.includes('weak-password') || message.includes('WEAK_PASSWORD')) {
        setError('Password is too weak. Please use a stronger password.')
      } else {
        setError(message || 'Failed to register. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    if (role === 'family' && !accessCode) {
      setError('Please enter your access code first')
      return
    }
    if (role === 'staff' && !staffCode) {
      setError('Please enter the staff registration code first')
      return
    }

    setError('')
    setLoading(true)

    try {
      const result = await signInWithPopup(auth, googleProvider)
      const googleUser = result.user
      const isNewUser = getAdditionalUserInfo(result)?.isNewUser

      if (!isNewUser) {
        await auth.signOut()
        setError('This email is already registered. Please sign in instead.')
        setLoading(false)
        return
      }

      const idToken = await googleUser.getIdToken()

      const response = await fetch(`${API_URL}/api/auth/google-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, role, accessCode, staffCode })
      })

      const data = await response.json()
      await auth.signOut()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to register with Google')
      }

      setEmail(googleUser.email || '')
      localStorage.setItem('userRole', role)
      if (role === 'family' && data.patientId) {
        localStorage.setItem('patientId', data.patientId)
        localStorage.setItem('accessToken', accessCode)
      }
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error) {
      console.error('Google registration error:', error)
      if (auth.currentUser) {
        await auth.signOut().catch(() => {})
      }
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled.')
      } else {
        setError(error.message || 'Failed to register with Google. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-parchment-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-editorial bg-white p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-forest-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-display font-semibold text-forest-950 mb-2">Registration Successful!</h2>
          <p className="text-slate-500">
            We've sent a verification email to <span className="text-slate-800 font-medium">{email}</span>.<br />
            Please verify your email before logging in.
          </p>
          <p className="text-slate-400 text-sm mt-4">
            Redirecting to login...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-parchment-100 flex items-center justify-center p-4 relative overflow-hidden">
      <svg className="absolute inset-0 w-full h-full text-forest-900 opacity-[0.035] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="register-dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#register-dot-grid)" />
      </svg>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-6xl flex flex-col lg:flex-row bg-white rounded-lg overflow-hidden card-editorial"
      >
        <div className="lg:w-1/2 relative overflow-hidden bg-white p-8 lg:p-14 flex flex-col justify-center order-2 lg:order-1">
          <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-lg bg-parchment-100 border border-forest-900/10 flex items-center justify-center p-2">
              <img src={Logo} alt="AarogyaSandesh" className="w-full h-full object-contain" />
            </div>
            <Wordmark size="md" className="text-forest-950" hiClassName="text-forest-700" />
          </div>
          <p className="text-slate-400 text-sm mb-8 tracking-wide uppercase text-[11px]">A Health Update, Delivered</p>

          <h1 className="text-4xl lg:text-5xl font-display font-semibold text-forest-950 mb-2">Create account</h1>
          <p className="text-slate-500 mb-8">Join AarogyaSandesh and stay connected</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">I am a</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-parchment-100 rounded-lg border border-forest-900/10">
                <button
                  type="button"
                  onClick={() => setRole('family')}
                  className={`py-2.5 px-2 rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 text-sm font-medium ${
                    role === 'family'
                      ? 'bg-white text-forest-800 shadow-sm border border-forest-900/10'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  Family
                </button>
                <button
                  type="button"
                  onClick={() => setRole('staff')}
                  className={`py-2.5 px-2 rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 text-sm font-medium ${
                    role === 'staff'
                      ? 'bg-white text-forest-800 shadow-sm border border-forest-900/10'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Staff
                </button>
                 <button
    type="button"
    onClick={() => setRole('doctor')}
    className={`py-2.5 px-2 rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 text-sm font-medium ${
      role === 'doctor'
        ? 'bg-white text-forest-800 shadow-sm border border-forest-900/10'
        : 'text-slate-500 hover:text-slate-700'
    }`}
  >
    <Stethoscope className="w-4 h-4" />
    Doctor
  </button>
              </div>
            </div>

            {role === 'family' && (
              <>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <Key className="w-4 h-4 text-brass-500" />
                  </span>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Access Code (6-digit code from hospital)"
                    className="input-editorial pl-10 font-mono text-lg tracking-widest"
                    maxLength={6}
                    required={role === 'family'}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleRegister}
                  disabled={loading || !accessCode}
                  className="w-full py-3 bg-white border-2 border-forest-900/70 rounded-lg text-slate-900 font-bold shadow-sm flex items-center justify-center gap-2.5 hover:border-forest-900 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.71-1.57 2.68-3.88 2.68-6.64z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34C2.44 15.98 5.48 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.97 10.72c-.18-.54-.28-1.11-.28-1.72s.1-1.18.28-1.72V4.94H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.06l3.01-2.34z"/>
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="flex-1 h-px bg-forest-900/10" />
                  or register with email
                  <div className="flex-1 h-px bg-forest-900/10" />
                </div>
              </>
            )}

            {role === 'staff' && (
              <>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <Key className="w-4 h-4 text-brass-500" />
                  </span>
                  <input
                    type="text"
                    value={staffCode}
                    onChange={(e) => setStaffCode(e.target.value)}
                    placeholder="Staff Registration Code (from hospital administration)"
                    className="input-editorial pl-10"
                    required={role === 'staff'}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleRegister}
                  disabled={loading || !staffCode}
                  className="w-full py-3 bg-white border-2 border-forest-900/70 rounded-lg text-slate-900 font-bold shadow-sm flex items-center justify-center gap-2.5 hover:border-forest-900 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.71-1.57 2.68-3.88 2.68-6.64z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34C2.44 15.98 5.48 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.97 10.72c-.18-.54-.28-1.11-.28-1.72s.1-1.18.28-1.72V4.94H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.06l3.01-2.34z"/>
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="flex-1 h-px bg-forest-900/10" />
                  or register with email
                  <div className="flex-1 h-px bg-forest-900/10" />
                </div>
              </>
            )}

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <User className="w-4 h-4 text-brass-500" />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="input-editorial pl-10"
                required
              />
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <Mail className="w-4 h-4 text-brass-500" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="input-editorial pl-10"
                required
              />
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <Lock className="w-4 h-4 text-brass-500" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="input-editorial pl-10 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-forest-700 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {password && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(passwordStrength.score)}%`,
                        backgroundColor: passwordStrength.color
                      }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.score >= 100 ? 'text-emerald-600' :
                    passwordStrength.score >= 60 ? 'text-amber-500' :
                    'text-red-500'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    { label: '8+ characters', check: passwordStrength.checks.length },
                    { label: 'Lowercase', check: passwordStrength.checks.lowercase },
                    { label: 'Uppercase', check: passwordStrength.checks.uppercase },
                    { label: 'Number', check: passwordStrength.checks.number },
                    { label: 'Special char', check: passwordStrength.checks.special }
                  ].map((req, i) => (
                    <span key={i} className={`flex items-center gap-1 ${req.check ? 'text-emerald-600' : 'text-slate-300'}`}>
                      {req.check ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {req.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <Lock className="w-4 h-4 text-brass-500" />
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className={`input-editorial pl-10 pr-12 ${
                  confirmPassword.length > 0 && passwordsMatch ? 'border-forest-400' : ''
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-forest-700 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {confirmPassword.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                {passwordsMatch ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">Passwords match ✓</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-red-500" />
                    <span className="text-red-500">Passwords do not match</span>
                  </>
                )}
              </div>
            )}


            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading || (role === 'family' && !accessCode) || (role === 'staff' && !staffCode) || !passwordsMatch || passwordStrength.score < 60}
              className="w-full py-3.5 btn-editorial-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          <div className="flex items-center gap-4 mt-6 pt-5 border-t border-forest-900/10 text-slate-400">
            <span className="flex items-center gap-1.5 text-xs">
              <Shield className="w-3.5 h-3.5 text-brass-500" />
              Secure
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <Key className="w-3.5 h-3.5 text-brass-500" />
              Verified access
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <Heart className="w-3.5 h-3.5 text-brass-500" />
              Family-first
            </span>
          </div>

          <p className="text-center text-slate-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-forest-700 hover:text-forest-800 transition-colors font-medium">
              Sign In
            </Link>
          </p>
          </div>
        </div>

        <div className="lg:w-1/2 relative overflow-hidden bg-forest-950 p-8 lg:p-14 flex flex-col items-center justify-center order-1 lg:order-2 min-h-[280px] lg:min-h-0">
          <svg className="absolute inset-0 w-full h-full text-brass-200 opacity-[0.05] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="register-brand-dot-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.4" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#register-brand-dot-grid)" />
          </svg>
          <div className="absolute top-0 left-0 w-full h-px bg-brass-400/20" />
          <div className="absolute top-8 right-8 w-10 h-10 border-t border-r border-brass-300/25" />
          <div className="absolute bottom-8 left-8 w-10 h-10 border-b border-l border-brass-300/25" />

          <div className="absolute top-6 left-1/2 -translate-x-1/2 lg:left-8 lg:translate-x-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-brass-300/20 text-brass-100 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-brass-300" />
            Trusted Healthcare Platform
          </div>

          <div className="relative z-10 text-center">
            <div className="w-24 h-24 lg:w-28 lg:h-28 mx-auto mb-6 bg-white rounded-2xl shadow-xl flex items-center justify-center p-3">
              <img
                src={Logo}
                alt="AarogyaSandesh"
                className="w-full h-full object-contain"
              />
            </div>
            <Wordmark size="lg" className="items-center text-parchment-50" hiClassName="text-brass-200" />
            <p className="text-forest-200/70 text-sm mt-2 mb-7 italic font-display">Your Health, Delivered</p>
            <div className="space-y-2.5 text-left inline-flex flex-col">
              {[
                'Real-time hospital-to-family updates',
                'Tamper-evident consent records',
                'Built for family, staff & doctors alike'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-forest-100/85 text-sm">
                  <span className="w-5 h-5 rounded-full bg-brass-400/15 border border-brass-300/25 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-brass-300" />
                  </span>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-9 pt-6 border-t border-brass-300/15 flex items-center justify-center gap-6">
              {[
                { value: '24/7', label: 'Real-time sync' },
                { value: '3', label: 'Roles supported' },
                { value: '100%', label: 'Verified access' }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-lg font-display font-semibold text-brass-200">{stat.value}</p>
                  <p className="text-[11px] text-forest-200/60">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Register