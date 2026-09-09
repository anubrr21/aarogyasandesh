import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  FileText, Download, Printer, ArrowLeft, Calendar, User, 
  CreditCard, Wallet, Pill, Stethoscope, Activity, 
  CheckCircle, Clock, AlertCircle, Building, Phone,
  Mail, MapPin, FileCheck, IndianRupee, Receipt, Save,
  DollarSign, Eye, Lock
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { db } from '../../firebase/firebase'
import { doc, getDoc } from 'firebase/firestore'

const BillGenerator = ({ patientId, onClose }) => {
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [billData, setBillData] = useState(null)

  const hospitalName = 'AarogyaSandesh Super Speciality Hospital'
  const hospitalAddress = '123, Healthcare District, New Delhi - 110001'
  const hospitalPhone = '+91 1800-123-4567'
  const hospitalEmail = 'info@aarogyasandesh.com'
  const hospitalGST = 'GSTIN: 22AAAAA1234A1Z5'

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const calculateDuration = (admitDate, dischargeDate) => {
    if (!admitDate || !dischargeDate) return 'N/A'
    const start = admitDate.toDate ? admitDate.toDate() : new Date(admitDate)
    const end = dischargeDate.toDate ? dischargeDate.toDate() : new Date(dischargeDate)
    const diffMs = end - start
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (diffDays === 0) return `${diffHours} hours`
    return `${diffDays} days ${diffHours} hours`
  }

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientId) {
        setError('No patient selected')
        setLoading(false)
        return
      }

      try {
        const docRef = doc(db, 'patients', patientId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() }
          setPatient(data)

          const billingItems = data.billing?.items || []
          const deposits = data.billing?.deposits || []
          const totalBill = billingItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
          const totalDeposits = deposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)

          const admissionDate = data.admitDate || data.admittedAt
          const dischargeDate = data.discharge?.actualTime || new Date().toISOString()

          const medicineList = data.clinical?.medicines || []
          const diagnosisList = data.clinical?.diagnosis || []

          setBillData({
            patientName: data.name || 'N/A',
            patientId: data.patientId || 'N/A',
            age: data.age || 'N/A',
            gender: data.gender || 'N/A',
            phone: data.phone || 'N/A',
            familyMember: data.familyMemberName || 'N/A',
            admitDate: admissionDate,
            dischargeDate: dischargeDate,
            duration: calculateDuration(admissionDate, dischargeDate),
            ward: data.ward || 'N/A',
            bed: data.bed || 'N/A',
            room: data.room || 'N/A',
            diagnosis: diagnosisList,
            medicines: medicineList,
            billingItems: billingItems,
            deposits: deposits,
            totalBill: totalBill,
            totalDeposits: totalDeposits,
            balance: totalDeposits - totalBill,
            dischargeSummary: data.discharge?.dischargeSummary || null,
            insurance: data.billing?.insurance || null,
            abhaId: data.abhaId || 'N/A',
            hospitalName: hospitalName,
            hospitalAddress: hospitalAddress,
            hospitalPhone: hospitalPhone,
            hospitalEmail: hospitalEmail,
            hospitalGST: hospitalGST
          })
        } else {
          setError('Patient not found')
        }
      } catch (error) {
        console.error('Error fetching patient:', error)
        setError('Failed to load patient data')
      } finally {
        setLoading(false)
      }
    }

    fetchPatientData()
  }, [patientId])

  const generatePDF = async () => {
    if (!billData) return
    setGenerating(true)

    try {
      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.width
      let y = 20

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(13, 148, 136)
      doc.text('AarogyaSandesh', pageWidth / 2, y, { align: 'center' })
      y += 8

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text('FINAL BILL - DISCHARGE SUMMARY', pageWidth / 2, y, { align: 'center' })
      y += 6

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(hospitalAddress, pageWidth / 2, y, { align: 'center' })
      y += 4
      doc.text(`Phone: ${hospitalPhone} | Email: ${hospitalEmail}`, pageWidth / 2, y, { align: 'center' })
      y += 4
      doc.text(hospitalGST, pageWidth / 2, y, { align: 'center' })
      y += 10

      doc.setDrawColor(13, 148, 136)
      doc.setLineWidth(0.5)
      doc.line(20, y, pageWidth - 20, y)
      y += 8

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(0, 0, 0)
      doc.text('PATIENT INFORMATION', 20, y)
      y += 6

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const patientInfo = [
        [`Name: ${billData.patientName}`, `Patient ID: ${billData.patientId}`],
        [`Age: ${billData.age} years`, `Gender: ${billData.gender}`],
        [`Phone: ${billData.phone}`, `Family Member: ${billData.familyMember}`],
        [`Admitted: ${formatDateTime(billData.admitDate)}`, `Discharged: ${formatDateTime(billData.dischargeDate)}`],
        [`Length of Stay: ${billData.duration}`, `Ward: ${billData.ward} (Bed: ${billData.bed})`],
        [`ABHA ID: ${billData.abhaId}`, `Room: ${billData.room}`]
      ]
      patientInfo.forEach(row => {
        doc.text(row[0], 20, y)
        doc.text(row[1], pageWidth / 2 + 10, y)
        y += 5.5
      })
      y += 4

      doc.line(20, y, pageWidth - 20, y)
      y += 8

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('DIAGNOSIS & MEDICINES', 20, y)
      y += 6

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      if (billData.diagnosis.length > 0) {
        doc.text('Diagnosis:', 20, y)
        y += 4
        billData.diagnosis.forEach((d, i) => {
          const text = `${i + 1}. ${d.diagnosis}${d.explainer ? ` - ${d.explainer}` : ''}`
          doc.text(text, 25, y)
          y += 4.5
        })
      } else {
        doc.text('No diagnosis recorded', 20, y)
        y += 4
      }

      if (billData.medicines.length > 0) {
        doc.text('Medicines Prescribed:', 20, y)
        y += 4
        billData.medicines.forEach((m, i) => {
          const text = `${i + 1}. ${m.name} - ${m.dosage} (${m.frequency}, ${m.route})`
          doc.text(text, 25, y)
          y += 4.5
        })
      } else {
        doc.text('No medicines prescribed', 20, y)
        y += 4
      }
      y += 4

      doc.line(20, y, pageWidth - 20, y)
      y += 8

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('BILL DETAILS', 20, y)
      y += 6

      const tableColumns = ['S.No.', 'Description', 'Category', 'Amount (₹)']
      const tableRows = billData.billingItems.map((item, index) => [
        index + 1,
        item.description || 'N/A',
        item.category || 'Other',
        item.amount?.toLocaleString() || '0'
      ])

      autoTable(doc, {
  startY: y,
  head: [tableColumns],
  body: tableRows,
  theme: 'grid',
  styles: { fontSize: 8, cellPadding: 2 },
  headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontSize: 9 },
  footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 9 }
})

      const finalY = doc.lastAutoTable.finalY + 6

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(`Subtotal: ₹${billData.totalBill.toLocaleString()}`, pageWidth - 50, finalY)
      doc.text(`Deposits: -₹${billData.totalDeposits.toLocaleString()}`, pageWidth - 50, finalY + 6)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      const balanceColor = billData.balance >= 0 ? [16, 185, 129] : [239, 68, 68]
      doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2])
      const balanceText = billData.balance >= 0 ? 'Refundable' : 'Due'
      doc.text(`Balance (${balanceText}): ₹${Math.abs(billData.balance).toLocaleString()}`, pageWidth - 50, finalY + 14)
      doc.setTextColor(0, 0, 0)

      if (billData.insurance?.provider) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(`Insurance Provider: ${billData.insurance.provider}`, 20, finalY + 20)
        doc.text(`Policy Number: ${billData.insurance.policyNumber || 'N/A'}`, 20, finalY + 26)
        doc.text(`Claim Status: ${billData.insurance.claimStatus || 'N/A'}`, 20, finalY + 32)
      }

      y = finalY + 42
      doc.line(20, y, pageWidth - 20, y)
      y += 8

      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text('This is a system-generated bill. Please verify all details with the hospital accounts department.', 20, y)
      y += 4
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 20, y)
      y += 4
      doc.text('Thank you for choosing AarogyaSandesh. Wishing you good health!', 20, y)

      doc.save(`Bill_${billData.patientId}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      setError('Failed to generate PDF. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-red-600 text-lg font-medium">{error}</p>
        <button
          onClick={() => onClose?.()}
          className="mt-4 px-6 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  if (!billData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <FileText className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500">No bill data available</p>
      </div>
    )
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-200/50 shadow-2xl">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onClose?.()}
            className="p-2 text-gray-500 hover:text-teal-600 rounded-xl hover:bg-teal-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-bold text-gray-900">Bill Generator</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generatePDF}
            disabled={generating}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Download className="w-4 h-4" />
            )}
            {generating ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      <div id="bill-content" className="bg-white rounded-xl p-8 border border-gray-200/50">
        <div className="text-center border-b border-gray-200/50 pb-6">
          <h1 className="text-3xl font-bold text-teal-600">AarogyaSandesh</h1>
          <p className="text-sm text-gray-500">Super Speciality Hospital</p>
          <p className="text-xs text-gray-400">{hospitalAddress}</p>
          <p className="text-xs text-gray-400">Phone: {hospitalPhone} | Email: {hospitalEmail}</p>
          <p className="text-xs text-gray-400">{hospitalGST}</p>
          <h2 className="text-xl font-bold text-gray-900 mt-2">FINAL BILL - DISCHARGE SUMMARY</h2>
          <p className="text-xs text-gray-400">Generated on: {new Date().toLocaleString('en-IN')}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-xs text-gray-400">Patient Name</p>
            <p className="font-semibold text-gray-900">{billData.patientName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Patient ID</p>
            <p className="font-semibold text-gray-900">{billData.patientId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Age / Gender</p>
            <p className="font-semibold text-gray-900">{billData.age} years / {billData.gender}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Phone</p>
            <p className="font-semibold text-gray-900">{billData.phone}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Family Member</p>
            <p className="font-semibold text-gray-900">{billData.familyMember}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">ABHA ID</p>
            <p className="font-semibold text-gray-900">{billData.abhaId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Admit Date</p>
            <p className="font-semibold text-gray-900">{formatDateTime(billData.admitDate)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Discharge Date</p>
            <p className="font-semibold text-gray-900">{formatDateTime(billData.dischargeDate)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Length of Stay</p>
            <p className="font-semibold text-gray-900">{billData.duration}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Ward / Bed / Room</p>
            <p className="font-semibold text-gray-900">{billData.ward} / {billData.bed} / {billData.room}</p>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200/50 pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Diagnosis</h3>
          {billData.diagnosis.length > 0 ? (
            <ul className="list-disc pl-5 text-sm text-gray-700">
              {billData.diagnosis.map((d, i) => (
                <li key={i}>{d.diagnosis}{d.explainer ? ` - ${d.explainer}` : ''}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No diagnosis recorded</p>
          )}
        </div>

        <div className="mt-4 border-t border-gray-200/50 pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Medicines Prescribed</h3>
          {billData.medicines.length > 0 ? (
            <ul className="list-disc pl-5 text-sm text-gray-700">
              {billData.medicines.map((m, i) => (
                <li key={i}>{m.name} - {m.dosage} ({m.frequency}, {m.route})</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No medicines prescribed</p>
          )}
        </div>

        <div className="mt-6 border-t border-gray-200/50 pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Bill Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-50">
                  <th className="px-4 py-2 text-left text-gray-600">#</th>
                  <th className="px-4 py-2 text-left text-gray-600">Description</th>
                  <th className="px-4 py-2 text-left text-gray-600">Category</th>
                  <th className="px-4 py-2 text-right text-gray-600">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {billData.billingItems.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-2 text-gray-900">{item.description || 'N/A'}</td>
                    <td className="px-4 py-2 text-gray-500">{item.category || 'Other'}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">₹{item.amount?.toLocaleString() || '0'}</td>
                  </tr>
                ))}
                {billData.billingItems.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-4 text-center text-gray-500">No bill items</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="font-bold border-t-2 border-gray-300">
                  <td colSpan="3" className="px-4 py-2 text-right text-gray-900">Subtotal</td>
                  <td className="px-4 py-2 text-right text-gray-900">₹{billData.totalBill.toLocaleString()}</td>
                </tr>
                <tr className="font-bold">
                  <td colSpan="3" className="px-4 py-2 text-right text-gray-900">Deposits</td>
                  <td className="px-4 py-2 text-right text-rose-600">-₹{billData.totalDeposits.toLocaleString()}</td>
                </tr>
                <tr className="font-bold text-lg border-t-2 border-gray-300">
                  <td colSpan="3" className="px-4 py-3 text-right text-gray-900">Balance</td>
                  <td className={`px-4 py-3 text-right ${billData.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {billData.balance >= 0 ? '₹' : '-₹'}{Math.abs(billData.balance).toLocaleString()}
                    <span className="block text-xs font-normal text-gray-400">
                      {billData.balance >= 0 ? '(Refundable)' : '(Due)'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {billData.insurance?.provider && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200/50">
            <h3 className="font-semibold text-gray-900 mb-2">Insurance Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Provider</p>
                <p className="font-medium text-gray-900">{billData.insurance.provider}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Policy Number</p>
                <p className="font-medium text-gray-900">{billData.insurance.policyNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Claim Status</p>
                <p className="font-medium text-gray-900 capitalize">{billData.insurance.claimStatus || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Coverage Used</p>
                <p className="font-medium text-gray-900">₹{billData.insurance.coverageUsed?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200/50 text-center">
          <p className="text-xs text-gray-400">This is a system-generated bill. Please verify all details with the hospital accounts department.</p>
          <p className="text-xs text-gray-400 mt-1">Thank you for choosing AarogyaSandesh. Wishing you good health!</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <span className="text-teal-600">✦</span>
            Made in India
            <span className="text-teal-600">✦</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BillGenerator