import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { db } from '../firebase/firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { FileText, Search, Download, Eye, User, Calendar, File, Image, ChevronDown, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ReportsDashboard = () => {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

  useEffect(() => {
    const unsubscribePatients = onSnapshot(
      collection(db, 'patients'),
      (snapshot) => {
        const patientsList = []
        snapshot.forEach((doc) => {
          patientsList.push({ id: doc.id, ...doc.data() })
        })
        setPatients(patientsList)
      }
    )

    const unsubscribeReports = onSnapshot(
      collection(db, 'patients'),
      (snapshot) => {
        const allReports = []
        snapshot.forEach((doc) => {
          const patientData = doc.data()
          const patientName = patientData.name || 'Unknown Patient'
          const patientId = doc.id
          
          const patientReports = (patientData.reports || []).map(report => ({
            ...report,
            patientName,
            patientId,
            patientAge: patientData.age || 'N/A'
          }))
          
          allReports.push(...patientReports)
          
          const patientPrescriptions = (patientData.prescriptions || []).map(prescription => ({
            ...prescription,
            patientName,
            patientId,
            patientAge: patientData.age || 'N/A',
            isPrescription: true
          }))
          
          allReports.push(...patientPrescriptions)
        })
        allReports.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        setReports(allReports)
        setLoading(false)
      }
    )

    return () => {
      unsubscribePatients()
      unsubscribeReports()
    }
  }, [])

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.patientName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPatient = selectedPatient === 'all' || report.patientId === selectedPatient
    const matchesType = selectedType === 'all' || 
      (selectedType === 'report' && !report.isPrescription) ||
      (selectedType === 'prescription' && report.isPrescription)
    return matchesSearch && matchesPatient && matchesType
  })

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return <File className="w-5 h-5 text-red-400" />
    if (fileType?.includes('image')) return <Image className="w-5 h-5 text-blue-400" />
    return <FileText className="w-5 h-5 text-gray-400" />
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <button
        onClick={() => navigate('/staff')}
        className="flex items-center gap-2 text-gray-500 hover:text-teal-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-teal-50 rounded-xl border border-teal-200/50">
          <FileText className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1>
          <p className="text-sm text-gray-500">{reports.length} total documents across all patients</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by report name or patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          />
        </div>
        <select
          value={selectedPatient}
          onChange={(e) => setSelectedPatient(e.target.value)}
          className="px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all min-w-[150px]"
        >
          <option value="all">All Patients</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name || patient.id}
            </option>
          ))}
        </select>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-3 bg-white/90 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all min-w-[150px]"
        >
          <option value="all">All Types</option>
          <option value="report">Reports</option>
          <option value="prescription">Prescriptions</option>
        </select>
      </div>

      {filteredReports.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No reports found</p>
          <p className="text-sm text-gray-400">Upload reports from patient details page</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report, index) => (
            <motion.div
              key={report.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-xl border border-gray-200/50">
                    {getFileIcon(report.fileType)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm truncate max-w-[180px]">
                      {report.name || 'Untitled'}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="flex items-center gap-0.5">
                        <User className="w-3 h-3" />
                        {report.patientName}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>{report.patientAge}y</span>
                    </div>
                  </div>
                </div>
                {report.isPrescription && (
                  <span className="px-2 py-0.5 bg-pink-50 text-pink-600 rounded-lg text-xs border border-pink-200">
                    Prescription
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                <span>{formatDate(report.uploadedAt)}</span>
                {report.type && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded-lg">
                    {report.type}
                  </span>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                {report.downloadUrl && (
                  <>
                    <a
                      href={report.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 bg-teal-50 text-teal-600 rounded-lg text-sm hover:bg-teal-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </a>
                    <a
                      href={report.downloadUrl}
                      download={report.fileName}
                      className="flex-1 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ReportsDashboard