import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Plus, FileText, CheckCircle, Clock, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import useInsurance from '../../hooks/useInsurance'
import InsuranceCard from './InsuranceCard'
import AddInsuranceModal from './AddInsuranceModal'
import ClaimsList from './ClaimsList'
import CreateClaimModal from './CreateClaimModal'
import InsuranceAIAssistant from './InsuranceAIAssistant'
import HospitalDirectoryPanel from './HospitalDirectoryPanel'

const InsuranceDashboard = ({ patientId, patientName }) => {
  const { policies, loading, deletePolicy, getClaims, getStatusBadge, maskPolicyNumber } = useInsurance()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [claims, setClaims] = useState([])
  const [activeTab, setActiveTab] = useState('policies')

  useEffect(() => {
    if (selectedPolicy) {
      loadClaims(selectedPolicy.id)
    }
  }, [selectedPolicy])

  const loadClaims = async (policyId) => {
    try {
      const claimsList = await getClaims(policyId)
      setClaims(claimsList)
    } catch (error) {
      console.error('Error loading claims:', error)
    }
  }

  const handleDeletePolicy = async (policyId) => {
    if (window.confirm('Are you sure you want to delete this policy?')) {
      try {
        await deletePolicy(policyId)
      } catch (error) {
        console.error('Error deleting policy:', error)
      }
    }
  }

  const totalSumInsured = policies.reduce((sum, p) => sum + (p.sumInsured || 0), 0)
  const activePolicies = policies.filter(p => {
    if (!p.expiryDate) return true
    return new Date(p.expiryDate) > new Date()
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-forest-50 rounded-xl border border-forest-200/50">
            <Shield className="w-5 h-5 text-forest-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Insurance</h3>
            <p className="text-sm text-gray-500">{activePolicies.length} active policies</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-forest-500 to-forest-600 text-white rounded-xl hover:shadow-lg hover:shadow-forest-500/30 transition-all duration-300 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Policy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white/50 rounded-xl border border-gray-200/50 p-4">
          <p className="text-sm text-gray-500">Total Policies</p>
          <p className="text-xl font-bold text-gray-900">{policies.length}</p>
        </div>
        <div className="bg-white/50 rounded-xl border border-gray-200/50 p-4">
          <p className="text-sm text-gray-500">Total Coverage</p>
          <p className="text-xl font-bold text-forest-700">₹{totalSumInsured.toLocaleString()}</p>
        </div>
        <div className="bg-white/50 rounded-xl border border-gray-200/50 p-4">
          <p className="text-sm text-gray-500">Active Policies</p>
          <p className="text-xl font-bold text-forest-700">{activePolicies.length}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200/50">
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 text-sm transition-all duration-200 ${activeTab === 'policies' ? 'text-forest-700 border-b-2 border-forest-500 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Policies ({policies.length})
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 text-sm transition-all duration-200 ${activeTab === 'claims' ? 'text-forest-700 border-b-2 border-forest-500 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Claims ({claims.length})
        </button>
        <button
          onClick={() => setActiveTab('assistant')}
          className={`px-4 py-2 text-sm transition-all duration-200 ${activeTab === 'assistant' ? 'text-forest-700 border-b-2 border-forest-500 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
        >
          AI Assistant
        </button>
        <button
          onClick={() => setActiveTab('hospitals')}
          className={`px-4 py-2 text-sm transition-all duration-200 ${activeTab === 'hospitals' ? 'text-forest-700 border-b-2 border-forest-500 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Hospital Directory
        </button>
      </div>

      {activeTab === 'policies' && (
        <div>
          {policies.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No insurance policies added</p>
              <p className="text-sm text-gray-400">Click "Add Policy" to add your first policy</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.map((policy) => (
                <InsuranceCard
                  key={policy.id}
                  policy={policy}
                  onDelete={handleDeletePolicy}
                  onSelectPolicy={setSelectedPolicy}
                  onClaim={() => {
                    setSelectedPolicy(policy)
                    setShowClaimModal(true)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'claims' && (
        <ClaimsList
          claims={claims}
          policies={policies}
          maskPolicyNumber={maskPolicyNumber}
          getStatusBadge={getStatusBadge}
        />
      )}

      {activeTab === 'assistant' && (
        <InsuranceAIAssistant />
      )}

      {activeTab === 'hospitals' && (
        <HospitalDirectoryPanel />
      )}

      {showAddModal && (
        <AddInsuranceModal
          onClose={() => setShowAddModal(false)}
          patientId={patientId}
          patientName={patientName}
        />
      )}

      {showClaimModal && selectedPolicy && (
        <CreateClaimModal
          onClose={() => {
            setShowClaimModal(false)
            setSelectedPolicy(null)
          }}
          policy={selectedPolicy}
          patientId={patientId}
          patientName={patientName}
          onSuccess={() => {
            if (selectedPolicy) {
              loadClaims(selectedPolicy.id)
            }
          }}
        />
      )}
    </div>
  )
}

export default InsuranceDashboard