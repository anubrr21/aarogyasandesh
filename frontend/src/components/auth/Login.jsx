import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../firebase/firebase'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, Key, AlertCircle, Shield, Heart, Mail, Lock, ArrowRight, Sparkles,Stethoscope } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [role, setRole] = useState('family')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const navigate = useNavigate()
  const { sendPasswordReset } = useAuth()

  const verifyAccessCodeAPI = async (code) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-access-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessCode: code })
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { valid: false, message: data.message || 'Invalid access code' };
      }

      return { 
        valid: true, 
        patientId: data.patientId, 
        patientData: data.patientData 
      };
    } catch (error) {
      console.error('Error verifying access code:', error);
      return { valid: false, message: 'Error verifying access code. Please try again.' };
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (role === 'family' && !accessCode) {
      setError('Please enter your access code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (role === 'family') {
        const verification = await verifyAccessCodeAPI(accessCode);
        if (!verification.valid) {
          setError(verification.message || 'Invalid access code');
          setLoading(false);
          return;
        }
        localStorage.setItem('patientId', verification.patientId);
        localStorage.setItem('patientData', JSON.stringify(verification.patientData));
        localStorage.setItem('accessToken', accessCode);
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (!user.emailVerified) {
        setError('Please verify your email before logging in. Check your inbox.');
        setLoading(false);
        return;
      }
      const idTokenResult = await user.getIdTokenResult(true); // true = force refresh
const actualRole = idTokenResult.claims.role;

if (actualRole !== role) {
  await auth.signOut();
  setError(`This account is registered as "${actualRole || 'unknown'}", not "${role}". Please select the correct portal.`);
  setLoading(false);
  return;
}

      localStorage.setItem('userRole', role);
      
     let redirectPath;
if (role === 'family') {
  redirectPath = '/family';
} else if (role === 'doctor') {
  redirectPath = '/doctor';
} else {
  redirectPath = '/staff';
}
navigate(redirectPath, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email. Please register first.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address. Please check and try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setResetError('')
    setResetMessage('')
    setResetLoading(true)

    try {
      const result = await sendPasswordReset(resetEmail)
      if (result.success) {
        setResetMessage('Password reset link sent! Please check your email.')
        setTimeout(() => {
          setShowForgotPassword(false)
          setResetMessage('')
          setResetEmail('')
        }, 5000)
      } else {
        setResetError(result.error || 'Failed to send reset link. Please try again.')
      }
    } catch (err) {
      setResetError(err.message || 'Failed to send reset link. Please try again.')
    } finally {
      setResetLoading(false)
    }
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

          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-white/60 mb-8">Sign in to continue your journey</p>

          <form onSubmit={handleLogin} className="space-y-4">
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

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email || '')
                  setShowForgotPassword(true)
                }}
                className="text-sm text-white/40 hover:text-teal-400 transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal-400 hover:text-teal-300 transition-colors font-medium">
              Create Account
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

      {showForgotPassword && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForgotPassword(false)
              setResetError('')
              setResetMessage('')
              setResetEmail('')
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-white mb-2">Reset Password</h3>
            <p className="text-white/60 text-sm mb-6">
              Enter your email and we'll send you a password reset link.
            </p>

            <form onSubmit={handleForgotPassword}>
              <div className="relative mb-4">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {resetError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {resetError}
                </div>
              )}

              {resetMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm mb-4 flex items-center gap-2">
                  <span>✓</span>
                  {resetMessage}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetError('')
                    setResetMessage('')
                    setResetEmail('')
                  }}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default Login