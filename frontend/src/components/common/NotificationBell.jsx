import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, CheckCircle, AlertCircle, Clock, Shield, MessageSquare, FileText, CreditCard, BellRing, BellPlus } from 'lucide-react'
import { db } from '../../firebase/firebase'
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { enablePushNotifications } from '../../utils/pushNotifications'

const PUSH_ENABLED_KEY = 'pushNotificationsEnabled'

const NotificationBell = ({ userId, userType = 'family' }) => {
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pushStatus, setPushStatus] = useState(() => localStorage.getItem(PUSH_ENABLED_KEY) === 'true' ? 'enabled' : 'idle')
  const [pushError, setPushError] = useState('')

  useEffect(() => {
    if (!userId) return

    const notificationsRef = collection(db, 'notifications')
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('userType', '==', userType)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = []
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() })
      })
      notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.read).length)
    })

    return () => unsubscribe()
  }, [userId, userType])

  const markAsRead = async (notificationId) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId)
      await updateDoc(notifRef, { read: true })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.read)
      for (const notif of unreadNotifs) {
        const notifRef = doc(db, 'notifications', notif.id)
        await updateDoc(notifRef, { read: true })
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleEnablePush = async () => {
    setPushStatus('loading')
    setPushError('')
    const result = await enablePushNotifications()
    if (result.success) {
      setPushStatus('enabled')
      localStorage.setItem(PUSH_ENABLED_KEY, 'true')
    } else {
      setPushStatus('idle')
      setPushError(result.error || 'Could not enable notifications.')
    }
  }

  const getIcon = (type) => {
    switch(type) {
      case 'consent': return Shield
      case 'note': return MessageSquare
      case 'bill': return CreditCard
      case 'report': return FileText
      case 'discharge': return CheckCircle
      default: return Bell
    }
  }

  const getColor = (type) => {
    switch(type) {
      case 'consent': return 'text-violet-400'
      case 'note': return 'text-amber-400'
      case 'bill': return 'text-rose-400'
      case 'report': return 'text-orange-400'
      case 'discharge': return 'text-forest-400'
      default: return 'text-forest-400'
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-forest-700 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[500px] bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-gray-500">{unreadCount} unread</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-forest-700 hover:text-forest-800 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {pushStatus === 'enabled' ? (
              <div className="px-4 py-2 bg-forest-50/60 border-b border-gray-200/50 flex items-center gap-2 text-xs text-forest-800">
                <BellRing className="w-3.5 h-3.5" />
                Push notifications are on for this device
              </div>
            ) : (
              <div className="px-4 py-2 bg-forest-50/60 border-b border-gray-200/50">
                <button
                  onClick={handleEnablePush}
                  disabled={pushStatus === 'loading'}
                  className="flex items-center gap-2 text-xs text-forest-800 hover:text-forest-900 transition-colors disabled:opacity-50"
                >
                  <BellPlus className="w-3.5 h-3.5" />
                  {pushStatus === 'loading' ? 'Enabling…' : 'Enable notifications on this device'}
                </button>
                {pushError && <p className="text-[10px] text-red-500 mt-1">{pushError}</p>}
              </div>
            )}

            <div className="overflow-y-auto max-h-96">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No notifications</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const Icon = getIcon(notif.type)
                  const color = getColor(notif.type)
                  return (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`px-4 py-3 border-b border-gray-100/50 hover:bg-gray-50/50 transition-colors cursor-pointer ${
                        !notif.read ? 'bg-forest-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-full bg-white/50 border border-gray-200/50 flex-shrink-0 ${!notif.read ? 'border-forest-300' : ''}`}>
                          <Icon className={`w-4 h-4 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notif.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{notif.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-400">{formatTime(notif.createdAt)}</span>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 bg-forest-500 rounded-full"></span>
                            )}
                          </div>
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 bg-forest-500 rounded-full flex-shrink-0 mt-1.5"></div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-2 text-center text-xs text-gray-400 hover:text-gray-600 transition-colors border-t border-gray-200/50"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationBell