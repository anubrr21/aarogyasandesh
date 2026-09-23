import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Upload, CheckCircle, AlertCircle, Shield } from 'lucide-react'
import useInsurance from '../../hooks/useInsurance'

const AddInsuranceModal = ({ onClose, patientId, patientName }) => {
  const { addPolicy, uploadDocument } = useInsurance()
  const [formData, setFormData] = useState({
    provider: '',
    policyNumber: '',
    policyType: 'Family Health',
    sumInsured: '',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    tpaName: '',
    memberNumber: '',
    networkHospitals: '',
    memberId: patientId || '',
    memberName: patientName || ''
  })
  const [documentFile, setDocumentFile] = useState(null)
  const [documentUrl, setDocumentUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!validTypes.includes(file.type)) {
      setError('Please upload PDF or image files only')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setDocumentFile(file)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!formData.provider || !formData.policyNumber || !formData.sumInsured || !formData.expiryDate) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    try {
      let documentUrl = ''
      if (documentFile) {
        documentUrl = await uploadDocument(documentFile, `policies/${formData.policyNumber}`)
      }

      const result = await addPolicy({
        ...formData,
        sumInsured: parseFloat(formData.sumInsured) || 0,
        documentUrl,
        memberId: patientId || formData.memberId,
        memberName: patientName || formData.memberName
      })

      if (result.success) {
        setSuccess('Insurance policy added successfully!')
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (error) {
      setError('Failed to add policy. Please try again.')
      console.error('Error adding policy:', error)
    } finally {
      setLoading(false)
    }
  }

  const policyTypes = ['Family Health', 'Individual Health', 'Senior Citizen', 'Critical Illness', 'Personal Accident', 'Group Health']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-forest-700" />
            <h2 className="text-xl font-bold text-gray-900">Add Insurance Policy</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider *</label>
              <input
                type="text"
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                placeholder="e.g., Star Health, ICICI Lombard"
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number *</label>
              <input
                type="text"
                name="policyNumber"
                value={formData.policyNumber}
                onChange={handleChange}
                placeholder="Enter policy number"
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Policy Type</label>
              <select
                name="policyType"
                value={formData.policyType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
              >
                {policyTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sum Insured (₹) *</label>
              <input
                type="number"
                name="sumInsured"
                value={formData.sumInsured}
                onChange={handleChange}
                placeholder="Enter amount"
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TPA Name</label>
              <input
                type="text"
                name="tpaName"
                value={formData.tpaName}
                onChange={handleChange}
                placeholder="Third Party Administrator"
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member/Customer ID</label>
              <input
                type="text"
                name="memberNumber"
                value={formData.memberNumber}
                onChange={handleChange}
                placeholder="Member ID"
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Network Hospitals</label>
              <input
                type="text"
                name="networkHospitals"
                value={formData.networkHospitals}
                onChange={handleChange}
                placeholder="List of network hospitals (comma separated)"
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Policy Document</label>
            <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-forest-400 transition-all">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {documentFile ? (
                <div className="flex items-center justify-center gap-2 text-sm text-forest-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>{documentFile.name}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <Upload className="w-4 h-4" />
                  <span>Click or drag to upload policy document</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-forest-50 border border-forest-200 rounded-xl text-forest-700 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2.5 bg-gradient-to-r from-forest-500 to-forest-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-forest-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Add Policy'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default AddInsuranceModal