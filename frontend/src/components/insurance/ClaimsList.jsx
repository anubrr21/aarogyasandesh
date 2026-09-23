import { motion } from 'framer-motion'
import { FileText, CheckCircle, Clock, AlertCircle, Eye } from 'lucide-react'

const ClaimsList = ({ claims, policies, maskPolicyNumber, getStatusBadge }) => {
  const getStatusIcon = (status) => {
    switch(status) {
      case 'Approved':
      case 'Settled':
        return <CheckCircle className="w-4 h-4 text-forest-600" />
      case 'Submitted':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'Under Review':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'Rejected':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-400" />
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const getPolicyProvider = (policyId) => {
    const policy = policies.find(p => p.id === policyId)
    return policy?.provider || 'Unknown Provider'
  }

  if (claims.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No claims submitted yet</p>
        <p className="text-sm text-gray-400">Start by filing a claim against a policy</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {claims.map((claim, index) => (
        <motion.div
          key={claim.id || index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white/50 rounded-xl border border-gray-200/50 p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-200/50">
                {getStatusIcon(claim.status)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{claim.claimType || 'Claim'}</p>
                <p className="text-sm text-gray-500">{claim.hospitalName || 'Hospital'}</p>
                <p className="text-xs text-gray-400">Policy: {getPolicyProvider(claim.policyId)}</p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(claim.status)}`}>
              {claim.status || 'Draft'}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-400">Amount</p>
              <p className="font-medium text-gray-900">₹{claim.claimedAmount?.toLocaleString() || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Submitted</p>
              <p className="text-sm text-gray-900">{formatDate(claim.submittedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Treatment</p>
              <p className="text-sm text-gray-900">{claim.treatment || 'N/A'}</p>
            </div>
            <div className="flex items-end justify-end">
              <button className="text-forest-700 hover:text-forest-800 text-sm flex items-center gap-1">
                <Eye className="w-4 h-4" />
                View
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default ClaimsList