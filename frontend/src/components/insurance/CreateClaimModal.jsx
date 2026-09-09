import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Upload, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import useInsurance from '../../hooks/useInsurance'

const CreateClaimModal = ({ onClose, policy, patientId, patientName, onSuccess }) => {
  const { addClaim, uploadDocument } = useInsurance()
  const [formData, setFormData] = useState({
    claimType: 'Reimbursement',
    hospitalName: '',
    treatment: '',
    claimedAmount: '',
    notes: ''
  })
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif']
    const maxSize = 5 * 1024 * 1024

    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        setError('Please upload PDF or image files only')
        return false
      }
      if (file.size > maxSize) {
        setError('File size must be less than 5MB')
        return false
      }
      return true
    })

    setDocuments(prev => [...prev, ...validFiles])
    setError('')
  }

  const removeFile = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!formData.hospitalName || !formData.treatment || !formData.claimedAmount) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    try {
      const documentUrls = []
      for (const file of documents) {
        const url = await uploadDocument(file, `claims/${policy.id}`)
        documentUrls.push({ name: file.name, url })
      }

      const result = await addClaim(policy.id, {
        ...formData,
        claimedAmount: parseFloat(formData.claimedAmount) || 0,
        documents: documentUrls,
        memberId: patientId,
        memberName: patientName,
        policyId: policy.id
      })

      if (result.success) {
        setSuccess('Claim submitted successfully!')
        if (onSuccess) onSuccess()
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (error) {
      setError('Failed to submit claim. Please try again.')
      console.error('Error submitting claim:', error)
    } finally {
      setLoading(false)
    }
  }

  const claimTypes = ['Cashless', 'Reimbursement']

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
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-bold text-gray-900">New Insurance Claim</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-teal-50/50 rounded-xl border border-teal-200/50">
          <p className="text-sm text-gray-600">
            <strong>Policy:</strong> {policy.provider} - {policy.policyNumber ? 'XXXX-XXXX-' + policy.policyNumber.slice(-4) : 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Sum Insured:</strong> ₹{policy.sumInsured?.toLocaleString() || 'N/A'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Claim Type *</label>
              <select
                name="claimType"
                value={formData.claimType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                required
              >
                {claimTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name *</label>
              <input
                type="text"
                name="hospitalName"
                value={formData.hospitalName}
                onChange={handleChange}
                placeholder="Enter hospital name"
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment/Procedure *</label>
              <input
                type="text"
                name="treatment"
                value={formData.treatment}
                onChange={handleChange}
                placeholder="e.g., Knee Surgery, MRI Scan"
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Claimed Amount (₹) *</label>
              <input
                type="number"
                name="claimedAmount"
                value={formData.claimedAmount}
                onChange={handleChange}
                placeholder="Enter amount"
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional notes about the claim..."
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all min-h-[80px]"
                rows="2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supporting Documents</label>
            <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-teal-400 transition-all">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif"
                multiple
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Upload className="w-4 h-4" />
                <span>Click or drag to upload documents (PDF, Images)</span>
              </div>
            </div>
            {documents.length > 0 && (
              <div className="mt-2 space-y-1">
                {documents.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-600">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              className="flex-1 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Submit Claim'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default CreateClaimModal