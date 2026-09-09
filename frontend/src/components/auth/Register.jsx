import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Check, X, Shield, AlertCircle, Key, Heart, Mail, Lock, User, ArrowRight, Sparkles,Stethoscope} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const Register = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [accessCode, setAccessCode] = useState('')
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
        body: JSON.stringify({ email, password, displayName: name, role, accessCode })
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

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
          <p className="text-white/60">
            We've sent a verification email to <span className="text-white font-medium">{email}</span>.<br />
            Please verify your email before logging in.
          </p>
          <p className="text-white/30 text-sm mt-4">
            Redirecting to login...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/src/assets/hero.png')] bg-cover bg-center opacity-5"></div>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-6xl flex flex-col lg:flex-row bg-white/10 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/10"
      >
        <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center order-2 lg:order-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AarogyaSandesh</span>
          </div>
          <p className="text-white/60 text-sm mb-8">A Health Update, Delivered</p>

          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-white/60 mb-8">Join AarogyaSandesh and stay connected</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('family')}
                  className={`py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                    role === 'family'
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  Family
                </button>
                <button
                  type="button"
                  onClick={() => setRole('staff')}
                  className={`py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                    role === 'staff'
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Staff
                </button>
                 <button
    type="button"
    onClick={() => setRole('doctor')}
    className={`py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
      role === 'doctor'
        ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30'
        : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
    }`}
  >
    <Stethoscope className="w-4 h-4" />
    Doctor
  </button>
              </div>
            </div>

            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {password && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(passwordStrength.score)}%`,
                        backgroundColor: passwordStrength.color
                      }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.score >= 100 ? 'text-emerald-400' :
                    passwordStrength.score >= 60 ? 'text-yellow-400' :
                    'text-red-400'
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
                    <span key={i} className={`flex items-center gap-1 ${req.check ? 'text-emerald-400' : 'text-white/30'}`}>
                      {req.check ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {req.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className={`w-full pl-12 pr-12 py-3 bg-white/5 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                  confirmPassword.length > 0 && passwordsMatch ? 'border-emerald-500/50' : 'border-white/10'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {confirmPassword.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                {passwordsMatch ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Passwords match ✓</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-red-400" />
                    <span className="text-red-400">Passwords do not match</span>
                  </>
                )}
              </div>
            )}

            {role === 'family' && (
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Access Code (6-digit code from hospital)"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all font-mono text-lg tracking-widest"
                  maxLength={6}
                  required={role === 'family'}
                />
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || (role === 'family' && !accessCode) || !passwordsMatch || passwordStrength.score < 60}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-400 hover:text-teal-300 transition-colors font-medium">
              Sign In
            </Link>
          </p>
        </div>

        <div className="lg:w-1/2 bg-gradient-to-br from-teal-600/20 to-emerald-600/20 p-8 lg:p-12 flex flex-col items-center justify-center order-1 lg:order-2 min-h-[300px] lg:min-h-0">
          <div className="text-center">
            <div className="w-32 h-32 lg:w-48 lg:h-48 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-emerald-400/20 rounded-full blur-2xl"></div>
              <img
                src="/src/assets/Logo.png"
                alt="AarogyaSandesh"
                className="w-full h-full object-contain relative z-10"
              />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white">AarogyaSandesh</h2>
            <p className="text-white/50 text-sm mt-2">Your Health, Delivered</p>
            <div className="flex items-center justify-center gap-2 mt-4 text-white/30 text-xs">
              <Sparkles className="w-3 h-3" />
              <span>Real-time hospital transparency</span>
              <Sparkles className="w-3 h-3" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Register