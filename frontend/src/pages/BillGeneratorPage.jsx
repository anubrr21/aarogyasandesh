import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, FileText, Building, Home } from 'lucide-react'
import BillGenerator from '../components/staff/BillGenerator'
import { db } from '../firebase/firebase'
import { doc, getDoc } from 'firebase/firestore'

const BillGeneratorPage = () => {
  const { patientId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [patientName, setPatientName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPatientName = async () => {
      if (!patientId) {
        setLoading(false)
        return
      }
      try {
        const docRef = doc(db, 'patients', patientId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          setPatientName(data.name || 'Patient')
        }
      } catch (error) {
        console.error('Error fetching patient:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPatientName()
  }, [patientId])

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-[#FAF6EE] p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/staff')}
              className="flex items-center gap-2 text-gray-500 hover:text-teal-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-50 rounded-xl border border-teal-200/50">
                <FileText className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bill Generator</h1>
                {patientName && (
                  <p className="text-sm text-gray-500">Patient: {patientName}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <BillGenerator patientId={patientId} onClose={() => navigate('/staff')} />
        </motion.div>
      </div>
    </div>
  )
}

export default BillGeneratorPage