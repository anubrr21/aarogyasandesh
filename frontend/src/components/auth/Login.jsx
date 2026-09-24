import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, googleProvider, signInWithPopup } from '../../firebase/firebase'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, Key, AlertCircle, Shield, Heart, Mail, Lock, ArrowRight, Check, Stethoscope } from 'lucide-react'
import Wordmark from '../common/Wordmark'
import Logo from '../../assets/Logo.png'

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
      if (role === 'staff' && idTokenResult.claims.staffGroup) {
        localStorage.setItem('staffGroup', idTokenResult.claims.staffGroup);
      }

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

  const handleGoogleLogin = async () => {
    if (role === 'family' && !accessCode) {
      setError('Please enter your access code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      let verification = null;
      if (role === 'family') {
        verification = await verifyAccessCodeAPI(accessCode);
        if (!verification.valid) {
          setError(verification.message || 'Invalid access code');
          setLoading(false);
          return;
        }
      }

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user.emailVerified) {
        setError('Please verify your email before logging in. Check your inbox.');
        setLoading(false);
        return;
      }

      const idTokenResult = await user.getIdTokenResult(true);
      const actualRole = idTokenResult.claims.role;

      if (actualRole !== role) {
        await auth.signOut();
        setError(`This account is registered as "${actualRole || 'unknown'}", not "${role}". Please select the correct portal.`);
        setLoading(false);
        return;
      }

      localStorage.setItem('userRole', role);
      if (role === 'family') {
        localStorage.setItem('patientId', verification.patientId);
        localStorage.setItem('patientData', JSON.stringify(verification.patientData));
        localStorage.setItem('accessToken', accessCode);
      }
      if (role === 'staff' && idTokenResult.claims.staffGroup) {
        localStorage.setItem('staffGroup', idTokenResult.claims.staffGroup);
      }

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
      console.error('Google login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled.');
      } else {
        setError('Failed to login with Google. Please try again.');
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
    <div className="min-h-screen bg-parchment-100 flex items-center justify-center p-4 relative overflow-hidden">
      <svg className="absolute inset-0 w-full h-full text-forest-900 opacity-[0.035] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="login-dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#login-dot-grid)" />
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

          <h1 className="text-4xl lg:text-5xl font-display font-semibold text-forest-950 mb-2">Welcome back</h1>
          <p className="text-slate-500 mb-8">Sign in to continue your journey</p>

          <form onSubmit={handleLogin} className="space-y-4">
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
                  onClick={handleGoogleLogin}
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
                  or continue with email
                  <div className="flex-1 h-px bg-forest-900/10" />
                </div>
              </>
            )}

            {(role === 'staff' || role === 'doctor') && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
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
                  or continue with email
                  <div className="flex-1 h-px bg-forest-900/10" />
                </div>
              </>
            )}

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

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email || '')
                  setShowForgotPassword(true)
                }}
                className="text-sm text-slate-400 hover:text-forest-700 transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 btn-editorial-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            Don't have an account?{' '}
            <Link to="/register" className="text-forest-700 hover:text-forest-800 transition-colors font-medium">
              Create Account
            </Link>
          </p>
          </div>
        </div>

        <div className="lg:w-1/2 relative overflow-hidden bg-forest-950 p-8 lg:p-14 flex flex-col items-center justify-center order-1 lg:order-2 min-h-[280px] lg:min-h-0">
          <svg className="absolute inset-0 w-full h-full text-brass-200 opacity-[0.05] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="login-brand-dot-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.4" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-brand-dot-grid)" />
          </svg>
          <div className="absolute top-0 left-0 w-full h-px bg-brass-400/20" />
          <div className="absolute top-8 left-8 w-10 h-10 border-t border-l border-brass-300/25" />
          <div className="absolute bottom-8 right-8 w-10 h-10 border-b border-r border-brass-300/25" />

          <div className="hidden lg:flex absolute top-6 right-8 items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-brass-300/20 text-brass-100 text-xs font-medium">
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

      {showForgotPassword && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/70 backdrop-blur-sm"
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
            className="bg-white border border-forest-900/10 rounded-lg p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-display font-semibold text-forest-950 mb-2">Reset Password</h3>
            <p className="text-slate-500 text-sm mb-6">
              Enter your email and we'll send you a password reset link.
            </p>

            <form onSubmit={handleForgotPassword}>
              <div className="relative mb-4">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brass-500" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Email Address"
                  className="input-editorial pl-12"
                  required
                />
              </div>

              {resetError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {resetError}
                </div>
              )}

              {resetMessage && (
                <div className="p-3 bg-forest-50 border border-forest-200 rounded-lg text-forest-700 text-sm mb-4 flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
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
                  className="flex-1 py-3 bg-parchment-100 border border-forest-900/10 text-slate-600 rounded-lg hover:bg-parchment-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-3 btn-editorial-primary disabled:opacity-50 disabled:cursor-not-allowed"
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