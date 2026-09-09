import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { db } from '../firebase/firebase'
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, where } from 'firebase/firestore'
import { Clock, Edit, Save, X, AlertCircle, CheckCircle, Hospital, Users, Calendar, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const PatientVisitingTime = () => {
  const navigate = useNavigate()
  const [visitingTimes, setVisitingTimes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingWard, setEditingWard] = useState(null)
  const [formData, setFormData] = useState({
    wardName: '',
    visitingHours: '',
    visitingDays: '',
    maxVisitors: '',
    specialInstructions: ''
  })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'visitingTimes'),
      (snapshot) => {
        const times = []
        snapshot.forEach((doc) => {
          times.push({ id: doc.id, ...doc.data() })
        })
        setVisitingTimes(times)
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching visiting times:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const handleDeleteVisitingTime = async (ward) => {
    if (!ward.id) return
    if (!window.confirm(`Delete visiting hours for ${ward.wardName}?`)) return
    try {
      await deleteDoc(doc(db, 'visitingTimes', ward.id))
      setFormSuccess('Visiting time deleted successfully!')
      setTimeout(() => setFormSuccess(''), 2000)
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete. Please try again.')
    }
  }

  const handleUpdateVisitingTime = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setSaving(true)

    if (!editingWard) {
      setSaving(false)
      return
    }

    try {
      if (editingWard.id) {
        const docRef = doc(db, 'visitingTimes', editingWard.id)
        await updateDoc(docRef, {
          ...formData,
          updatedAt: new Date().toISOString()
        })
      } else {
        await addDoc(collection(db, 'visitingTimes'), {
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
      setFormSuccess('Visiting time updated successfully!')
      setTimeout(() => {
        setEditingWard(null)
        setFormSuccess('')
      }, 2000)
    } catch (error) {
      console.error('Visiting time save error:', error)
      setFormError('Failed to update visiting time. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (ward) => {
    setEditingWard(ward)
    setFormData({
      wardName: ward.wardName || '',
      visitingHours: ward.visitingHours || '',
      visitingDays: ward.visitingDays || '',
      maxVisitors: ward.maxVisitors || '',
      specialInstructions: ward.specialInstructions || ''
    })
  }

  const defaultVisitingTimes = [
    { wardName: 'General Ward', visitingHours: '10:00 AM - 12:00 PM, 4:00 PM - 6:00 PM', visitingDays: 'All Days', maxVisitors: '2', specialInstructions: 'Children under 12 not allowed' },
    { wardName: 'ICU', visitingHours: '11:00 AM - 12:00 PM, 5:00 PM - 6:00 PM', visitingDays: 'All Days', maxVisitors: '1', specialInstructions: 'Strictly limited to immediate family' },
    { wardName: 'Maternity', visitingHours: '9:00 AM - 11:00 AM, 3:00 PM - 5:00 PM', visitingDays: 'All Days', maxVisitors: '2', specialInstructions: 'Spouses and parents only' },
    { wardName: 'Pediatrics', visitingHours: '10:00 AM - 12:00 PM, 3:00 PM - 6:00 PM', visitingDays: 'All Days', maxVisitors: '2', specialInstructions: 'One parent must accompany' },
    { wardName: 'Emergency', visitingHours: '24/7', visitingDays: 'All Days', maxVisitors: '1', specialInstructions: 'Emergency cases only' },
    { wardName: 'Surgical', visitingHours: '10:00 AM - 1:00 PM, 4:00 PM - 7:00 PM', visitingDays: 'All Days', maxVisitors: '2', specialInstructions: 'Patients must be stable' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const displayData = visitingTimes.length > 0 ? visitingTimes : defaultVisitingTimes

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <button
        onClick={() => navigate('/staff')}
        className="flex items-center gap-2 text-gray-500 hover:text-teal-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-xl border border-teal-200/50">
            <Clock className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Visiting Time</h1>
            <p className="text-sm text-gray-500">Manage visiting hours for different hospital wards</p>
          </div>
        </div>
        <button
          onClick={() => openEditModal({ wardName: '', visitingHours: '', visitingDays: '', maxVisitors: '', specialInstructions: '' })}
          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium"
        >
          + Add New Ward
        </button>
      </div>

      {formSuccess && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayData.map((ward) => (
          <motion.div
            key={ward.id || ward.wardName}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-50 rounded-xl border border-teal-200/50">
                  <Hospital className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{ward.wardName}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {ward.maxVisitors || '2'} visitors allowed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(ward)}
                  className="p-1.5 text-gray-400 hover:text-teal-600 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {ward.id && (
                  <button
                    onClick={() => handleDeleteVisitingTime(ward)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{ward.visitingHours || 'Not set'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{ward.visitingDays || 'Not set'}</span>
              </div>
              {ward.specialInstructions && (
                <div className="mt-2 p-2 bg-amber-50/50 border border-amber-200/50 rounded-lg text-xs text-amber-700">
                  📋 {ward.specialInstructions}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {editingWard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-2xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Visiting Time</h2>
              <button
                onClick={() => {
                  setEditingWard(null)
                  setFormError('')
                  setFormSuccess('')
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateVisitingTime}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ward Name</label>
                  <input
                    type="text"
                    value={formData.wardName}
                    onChange={(e) => setFormData({ ...formData, wardName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visiting Hours</label>
                  <input
                    type="text"
                    value={formData.visitingHours}
                    onChange={(e) => setFormData({ ...formData, visitingHours: e.target.value })}
                    placeholder="e.g., 10:00 AM - 12:00 PM, 4:00 PM - 6:00 PM"
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visiting Days</label>
                  <input
                    type="text"
                    value={formData.visitingDays}
                    onChange={(e) => setFormData({ ...formData, visitingDays: e.target.value })}
                    placeholder="e.g., All Days, Monday-Friday"
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Visitors</label>
                  <input
                    type="number"
                    value={formData.maxVisitors}
                    onChange={(e) => setFormData({ ...formData, maxVisitors: e.target.value })}
                    placeholder="Number of visitors allowed"
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                  <textarea
                    value={formData.specialInstructions}
                    onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                    placeholder="Any special instructions for visitors..."
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all min-h-[80px]"
                    rows="2"
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mt-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm mt-4">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditingWard(null)
                    setFormError('')
                    setFormSuccess('')
                  }}
                  className="flex-1 px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Update
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PatientVisitingTime