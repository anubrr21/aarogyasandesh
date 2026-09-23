import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { db } from '../firebase/firebase'
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { 
  Stethoscope, 
  Plus, 
  X, 
  Search, 
  CheckCircle, 
  AlertCircle,
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  Edit,
  Trash2,
  Save,
  ArrowLeft
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const DoctorManagement = () => {
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    email: '',
    phone: '',
    department: '',
    availability: 'available',
    visitingHours: '',
    consultationFee: '',
    education: '',
    experience: ''
  })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'doctors'),
      (snapshot) => {
        const doctorsList = []
        snapshot.forEach((doc) => {
          doctorsList.push({ id: doc.id, ...doc.data() })
        })
        setDoctors(doctorsList)
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching doctors:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const handleAddDoctor = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setSaving(true)

    if (!formData.name || !formData.specialization || !formData.email) {
      setFormError('Please fill in all required fields')
      setSaving(false)
      return
    }

    try {
      await addDoc(collection(db, 'doctors'), {
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      setFormSuccess('Doctor added successfully!')
      resetForm()
      setTimeout(() => {
        setShowAddModal(false)
        setFormSuccess('')
      }, 2000)
    } catch (error) {
      setFormError('Failed to add doctor. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateDoctor = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setSaving(true)

    if (!editingDoctor) return

    try {
      const docRef = doc(db, 'doctors', editingDoctor.id)
      await updateDoc(docRef, {
        ...formData,
        updatedAt: new Date().toISOString()
      })
      setFormSuccess('Doctor updated successfully!')
      setTimeout(() => {
        setEditingDoctor(null)
        setFormSuccess('')
      }, 2000)
    } catch (error) {
      setFormError('Failed to update doctor. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm('Are you sure you want to delete this doctor?')) return

    try {
      await deleteDoc(doc(db, 'doctors', doctorId))
      setFormSuccess('Doctor deleted successfully!')
      setTimeout(() => setFormSuccess(''), 2000)
    } catch (error) {
      setFormError('Failed to delete doctor. Please try again.')
    }
  }

  const handleToggleAvailability = async (doctor) => {
    try {
      const docRef = doc(db, 'doctors', doctor.id)
      const newAvailability = doctor.availability === 'available' ? 'unavailable' : 'available'
      await updateDoc(docRef, { 
        availability: newAvailability,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating availability:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      specialization: '',
      email: '',
      phone: '',
      department: '',
      availability: 'available',
      visitingHours: '',
      consultationFee: '',
      education: '',
      experience: ''
    })
  }

  const openEditModal = (doctor) => {
    setEditingDoctor(doctor)
    setFormData({
      name: doctor.name || '',
      specialization: doctor.specialization || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      department: doctor.department || '',
      availability: doctor.availability || 'available',
      visitingHours: doctor.visitingHours || '',
      consultationFee: doctor.consultationFee || '',
      education: doctor.education || '',
      experience: doctor.experience || ''
    })
  }

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.department?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const availableDoctors = doctors.filter(d => d.availability === 'available')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-forest-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <button
        onClick={() => navigate('/staff')}
        className="flex items-center gap-2 text-gray-500 hover:text-forest-700 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-forest-50 rounded-xl border border-forest-200/50">
            <Stethoscope className="w-5 h-5 text-forest-700" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold text-gray-900">Doctor Management</h1>
            <p className="text-sm text-gray-500">
              {availableDoctors.length} doctors currently available
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-2.5 bg-gradient-to-r from-forest-500 to-forest-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-forest-500/30 transition-all duration-300 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Doctor
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search doctors by name, specialization, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all"
        />
      </div>

      {filteredDoctors.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
          <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No doctors found</p>
          <p className="text-sm text-gray-400">Click "Add Doctor" to add the first doctor</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDoctors.map((doctor) => (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-forest-500 to-forest-500 rounded-xl flex items-center justify-center text-xl font-bold text-white">
                    {doctor.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{doctor.name}</h3>
                    <p className="text-sm text-forest-700">{doctor.specialization}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleAvailability(doctor)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    doctor.availability === 'available'
                      ? 'bg-forest-50 text-forest-700 border border-forest-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  {doctor.availability === 'available' ? '● Available' : '● Unavailable'}
                </button>
              </div>

              <div className="mt-3 space-y-1.5">
                {doctor.department && (
                  <p className="text-sm text-gray-500">Department: {doctor.department}</p>
                )}
                {doctor.visitingHours && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {doctor.visitingHours}
                  </p>
                )}
                {doctor.consultationFee && (
                  <p className="text-sm text-gray-500">Consultation: ₹{doctor.consultationFee}</p>
                )}
                {doctor.email && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {doctor.email}
                  </p>
                )}
                {doctor.phone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {doctor.phone}
                  </p>
                )}
                {doctor.experience && (
                  <p className="text-sm text-gray-500">Experience: {doctor.experience}</p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openEditModal(doctor)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteDoctor(doctor.id)}
                  className="py-2 px-4 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-1 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-semibold text-gray-900">Add Doctor</h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setFormError('')
                  setFormSuccess('')
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDoctor}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization *</label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visiting Hours</label>
                  <input
                    type="text"
                    value={formData.visitingHours}
                    onChange={(e) => setFormData({ ...formData, visitingHours: e.target.value })}
                    placeholder="e.g., 9:00 AM - 5:00 PM"
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee</label>
                  <input
                    type="text"
                    value={formData.consultationFee}
                    onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="e.g., 10 years"
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                  <input
                    type="text"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    placeholder="e.g., MBBS, MD"
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
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
                <div className="flex items-center gap-2 p-3 bg-forest-50 border border-forest-200 rounded-xl text-forest-700 text-sm mt-4">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setFormError('')
                    setFormSuccess('')
                    resetForm()
                  }}
                  className="flex-1 px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-2.5 bg-gradient-to-r from-forest-500 to-forest-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-forest-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Add Doctor
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-semibold text-gray-900">Edit Doctor</h2>
              <button
                onClick={() => {
                  setEditingDoctor(null)
                  setFormError('')
                  setFormSuccess('')
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDoctor}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization *</label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visiting Hours</label>
                  <input
                    type="text"
                    value={formData.visitingHours}
                    onChange={(e) => setFormData({ ...formData, visitingHours: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee</label>
                  <input
                    type="text"
                    value={formData.consultationFee}
                    onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                  <input
                    type="text"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
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
                <div className="flex items-center gap-2 p-3 bg-forest-50 border border-forest-200 rounded-xl text-forest-700 text-sm mt-4">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDoctor(null)
                    setFormError('')
                    setFormSuccess('')
                    resetForm()
                  }}
                  className="flex-1 px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-2.5 bg-gradient-to-r from-forest-500 to-forest-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-forest-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Update Doctor
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

export default DoctorManagement