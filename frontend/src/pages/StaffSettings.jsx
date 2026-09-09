import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { db, storage, ref, uploadBytes, getDownloadURL } from '../firebase/firebase'
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'
import { 
  User, 
  Mail, 
  Phone, 
  IdCard, 
  Save, 
  Camera, 
  X,
  CheckCircle,
  AlertCircle,
  Shield,
  Calendar,
  ArrowLeft
} from 'lucide-react'

const StaffSettings = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    department: '',
    designation: '',
    employeeId: '',
    email: '',
    joinDate: '',
    profileImage: ''
  })
  const [profileImageFile, setProfileImageFile] = useState(null)
  const [profileImagePreview, setProfileImagePreview] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        if (!user) {
          setLoading(false)
          return
        }
        
        const docRef = doc(db, 'staff', user.uid)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          setFormData({
            displayName: data.displayName || user.displayName || '',
            phone: data.phone || '',
            department: data.department || '',
            designation: data.designation || '',
            employeeId: data.employeeId || `EMP${new Date().getFullYear()}${String(Math.floor(1000 + Math.random() * 9000))}`,
            email: user.email || '',
            joinDate: data.joinDate || new Date().toISOString().split('T')[0],
            profileImage: data.profileImage || ''
          })
        } else {
          const employeeId = `EMP${new Date().getFullYear()}${String(Math.floor(1000 + Math.random() * 9000))}`
          const joinDate = new Date().toISOString().split('T')[0]
          setFormData({
            displayName: user.displayName || '',
            phone: '',
            department: '',
            designation: '',
            employeeId: employeeId,
            email: user.email || '',
            joinDate: joinDate,
            profileImage: ''
          })
          await setDoc(doc(db, 'staff', user.uid), {
            displayName: user.displayName || '',
            phone: '',
            department: '',
            designation: '',
            employeeId: employeeId,
            email: user.email || '',
            joinDate: joinDate,
            profileImage: '',
            createdAt: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('Error fetching staff data:', error)
        setError('Failed to load staff data')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchStaffData()
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setProfileImageFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setProfileImagePreview(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      let profileImageUrl = formData.profileImage

      if (profileImageFile) {
        const storageRef = ref(storage, `staff/${user.uid}/profile.jpg`)
        await uploadBytes(storageRef, profileImageFile)
        profileImageUrl = await getDownloadURL(storageRef)
      }

      const docRef = doc(db, 'staff', user.uid)
      await updateDoc(docRef, {
        displayName: formData.displayName,
        phone: formData.phone,
        department: formData.department,
        designation: formData.designation,
        profileImage: profileImageUrl,
        updatedAt: new Date().toISOString()
      })

      setFormData(prev => ({ ...prev, profileImage: profileImageUrl }))
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error saving staff data:', error)
      setError('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <button
        onClick={() => navigate('/staff')}
        className="flex items-center gap-2 text-gray-500 hover:text-teal-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-teal-50 rounded-xl border border-teal-200/50">
          <User className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Settings</h1>
          <p className="text-sm text-gray-500">Manage your profile and personal information</p>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white overflow-hidden">
                {profileImagePreview || formData.profileImage ? (
                  <img
                    src={profileImagePreview || formData.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  formData.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1.5 bg-teal-500 rounded-full cursor-pointer hover:bg-teal-600 transition-colors shadow-lg">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200">
                    <IdCard className="w-4 h-4 text-teal-500" />
                    <span className="text-gray-900 font-mono text-sm">{formData.employeeId}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200">
                    <Calendar className="w-4 h-4 text-teal-500" />
                    <span className="text-gray-900 text-sm">{new Date(formData.joinDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{formData.email}</span>
                <span className="ml-auto text-xs text-gray-400">Cannot be changed</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="e.g., Cardiology, Emergency"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="e.g., Head Nurse, Junior Doctor, Administrator"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/staff')}
              className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
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
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 p-4 bg-teal-50/50 rounded-xl border border-teal-200/50 flex items-center gap-3">
        <Shield className="w-5 h-5 text-teal-500" />
        <div className="text-sm">
          <p className="font-medium text-gray-900">Employee ID: {formData.employeeId}</p>
          <p className="text-gray-500 text-xs">Use this ID along with your email for login</p>
        </div>
      </div>
    </div>
  )
}

export default StaffSettings