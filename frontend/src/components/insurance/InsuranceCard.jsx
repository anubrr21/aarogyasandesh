import { motion } from 'framer-motion'
import { Shield, FileText, Edit, Trash2, CheckCircle, AlertCircle, Clock, ChevronRight, TrendingUp } from 'lucide-react'

const InsuranceCard = ({ policy, onDelete, onSelectPolicy, onClaim }) => {
  const isActive = !policy.expiryDate || new Date(policy.expiryDate) > new Date()
  const maskPolicyNumber = (number) => {
    if (!number) return 'N/A'
    if (number.length <= 4) return 'XXXX-XXXX-' + number
    return 'XXXX-XXXX-' + number.slice(-4)
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-xl border border-teal-200/50">
            <Shield className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{policy.provider || 'Insurance Provider'}</h4>
            <p className="text-xs text-gray-400">Policy: {maskPolicyNumber(policy.policyNumber)}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
          {isActive ? '● Active' : 'Expired'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-gray-400">Type</p>
          <p className="text-sm font-medium text-gray-900">{policy.policyType || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Sum Insured</p>
          <p className="text-sm font-medium text-teal-600">₹{policy.sumInsured?.toLocaleString() || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Start Date</p>
          <p className="text-sm font-medium text-gray-900">{formatDate(policy.startDate)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Expiry Date</p>
          <p className="text-sm font-medium text-gray-900">{formatDate(policy.expiryDate)}</p>
        </div>
      </div>

      {policy.tpaName && (
        <div className="mt-2 text-xs text-gray-500">
          <span className="text-gray-400">TPA:</span> {policy.tpaName}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onSelectPolicy && onSelectPolicy(policy)}
          className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 text-sm"
        >
          <FileText className="w-4 h-4" />
          View
        </button>
        <button
          onClick={() => onClaim && onClaim()}
          className="flex-1 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 flex items-center justify-center gap-1 text-sm"
        >
          <TrendingUp className="w-4 h-4" />
          Claim
        </button>
        <button
          onClick={() => onDelete && onDelete(policy.id)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

export default InsuranceCard