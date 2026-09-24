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
import { db } from '../../firebase/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { buildFinalBillDoc, getFinalBillRef, getPaymentStatus } from '../../utils/generateFinalBillPDF'
import { amountInWords, formatDateTimeLong } from '../../utils/pdfBranding'
import { doctorFields, openPrintWindow, resolveAttendingDoctor, showPdfForPrint } from '../../utils/pdfContext'
import { buildBillingInsights, computePaymentTotals } from '../../utils/billingHelpers'
import QRCode from 'qrcode'
import LogoImg from '../../assets/Logo.png'

const SectionHeading = ({ children }) => (
  <div className="flex items-center gap-3 mt-7 mb-3">
    <span className="w-1.5 h-5 rounded-sm" style={{ background: '#b8863a' }} />
    <h3 className="text-sm font-bold tracking-[0.18em] uppercase" style={{ color: '#1e3828' }}>{children}</h3>
    <span className="flex-1 h-px bg-gray-200" />
  </div>
)

const BillGenerator = ({ patientId, onClose }) => {
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [billData, setBillData] = useState(null)
  const [qrUrl, setQrUrl] = useState('')
  const [doctor, setDoctor] = useState(null)

  const hospitalName = 'AarogyaSandesh'
  const hospitalAddress = '123, Healthcare District, New Delhi - 110001'
  const hospitalPhone = '+91 8977039397'
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
      const attendingDoctor = await resolveAttendingDoctor(patient)
      const { doc } = await buildFinalBillDoc({ ...billData, attendingDoctor }, patient?.id)
      doc.save(`Bill_${billData.patientId}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      setError('Failed to generate PDF. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const docRef = billData ? getFinalBillRef(billData, patient?.id) : ''
  const paymentStatus = billData ? getPaymentStatus(billData) : ''
  const isDue = !!billData && billData.balance < 0
  const stampColor = isDue ? (billData.totalDeposits > 0 ? '#b8863a' : '#b23434') : '#26804e'
  const stampText = isDue ? (billData.totalDeposits > 0 ? 'PART PAID' : 'PAYMENT DUE') : 'PAID'
  const stampDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  useEffect(() => {
    if (!patient) return
    resolveAttendingDoctor(patient).then(setDoctor)
  }, [patient])

  useEffect(() => {
    if (!billData) return
    QRCode.toDataURL(`AAROGYASANDESH|FINAL-BILL|${docRef}|${billData.patientId}|${billData.totalBill}|${billData.balance}`, { margin: 0, width: 220, errorCorrectionLevel: 'M', color: { dark: '#1e2622', light: '#ffffff' } })
      .then(setQrUrl)
      .catch(() => setQrUrl(''))
  }, [billData, docRef])

  const billTotals = billData
    ? { total: billData.totalBill, ...computePaymentTotals(billData.billingItems) }
    : { total: 0, paid: 0, unpaid: 0 }
  const insights = billData
    ? buildBillingInsights({
      items: billData.billingItems,
      totalBill: billData.totalBill,
      lengthOfStay: 1,
      totalPaid: billTotals.paid,
      totalUnpaid: billTotals.unpaid
    }).map((insight) => insight.text.replace(/\u20b9/g, 'Rs. '))
    : []
  const ledgerEntries = (() => {
    if (!billData) return []
    const entries = [
      ...billData.billingItems.map((item, index) => ({ order: index, date: item.addedAt, text: item.description || 'Charge', category: item.category || 'Other', debit: parseFloat(item.amount) || 0, credit: 0 })),
      ...billData.deposits.map((deposit, index) => ({ order: 1000 + index, date: deposit.depositedAt, text: `Deposit - ${deposit.reason || 'Deposit'}`, category: 'Deposit', debit: 0, credit: parseFloat(deposit.amount) || 0 }))
    ].sort((a, b) => (a.date ? new Date(a.date).getTime() : 0) - (b.date ? new Date(b.date).getTime() : 0) || a.order - b.order)
    let running = 0
    return entries.map((entry) => {
      running += entry.debit - entry.credit
      const balance = running > 0 ? `Rs. ${running.toLocaleString('en-IN')} Dr` : running < 0 ? `Rs. ${(-running).toLocaleString('en-IN')} Cr` : 'Rs. 0'
      return { ...entry, balance }
    })
  })()

  const handlePrint = async () => {
    if (!billData) return
    const printWindow = openPrintWindow()
    try {
      const attendingDoctor = await resolveAttendingDoctor(patient)
      const { doc } = await buildFinalBillDoc({ ...billData, attendingDoctor }, patient?.id)
      showPdfForPrint(doc, printWindow)
    } catch (error) {
      console.error('Error preparing bill for print:', error)
      setError('Failed to prepare the bill for printing. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-forest-500 border-t-transparent rounded-full animate-spin"></div>
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
          className="mt-4 px-6 py-2 bg-forest-500 text-white rounded-xl hover:bg-forest-700 transition-colors"
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
            className="p-2 text-gray-500 hover:text-forest-700 rounded-xl hover:bg-forest-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-forest-700" />
            <h2 className="text-xl font-bold text-gray-900">Bill Generator</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generatePDF}
            disabled={generating}
            className="px-4 py-2 bg-gradient-to-r from-forest-500 to-forest-600 text-white rounded-xl hover:shadow-lg hover:shadow-forest-500/30 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      <div id="bill-content" className="relative bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="relative overflow-hidden" style={{ background: 'linear-gradient(120deg, #1e3828 0%, #1e3828 55%, #396447 100%)' }}>
          <div className="flex flex-col md:flex-row items-center gap-5 px-6 md:px-8 py-6">
            <div className="shrink-0 bg-white rounded-2xl p-2 shadow-lg" style={{ border: '2px solid #b8863a' }}>
              <img src={LogoImg} alt="AarogyaSandesh" className="w-24 h-24 object-contain" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-wide">Aarogya Sandesh</h1>
              <p className="text-[11px] font-semibold tracking-[0.35em] mt-1" style={{ color: '#ecdbba' }}>A HEALTH UPDATE, DELIVERED</p>
              <p className="text-xs text-white/80 mt-2">{hospitalAddress}</p>
              <p className="text-xs text-white/80">Phone: {hospitalPhone} &nbsp;|&nbsp; {hospitalEmail}</p>
              <p className="text-xs text-white/70">{hospitalGST}</p>
            </div>
            {qrUrl && (
              <div className="shrink-0 bg-white rounded-xl p-2 text-center shadow-lg">
                <img src={qrUrl} alt="Document QR" className="w-24 h-24" />
                <p className="text-[8px] tracking-wider text-gray-400 mt-1">DOCUMENT REF</p>
                <p className="text-[9px] font-bold text-forest-700">{docRef}</p>
              </div>
            )}
          </div>
          <div style={{ height: 5, background: '#b8863a' }} />
        </div>

        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-wide" style={{ color: '#1e3828' }}>FINAL BILL - DISCHARGE SUMMARY</h2>
              <div className="w-12 h-1 mt-1.5 rounded" style={{ background: '#b8863a' }} />
              <p className="text-[10px] tracking-[0.25em] text-gray-400 mt-2">ORIGINAL FOR RECIPIENT</p>
            </div>
            <div className="md:text-right">
              <p className="text-sm font-bold text-forest-700">Bill #: {docRef}</p>
              <p className="text-xs text-gray-500">Generated on: {new Date().toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px mt-5 rounded-xl overflow-hidden border border-gray-200/70 bg-gray-200/70 text-sm">
            {[
              ['Bill No.', docRef],
              ['Issued On', formatDateTime(new Date().toISOString())],
              ['Items Billed', `${billData.billingItems.length} item${billData.billingItems.length === 1 ? '' : 's'}`],
              ['Payment Status', paymentStatus]
            ].map(([label, value]) => (
              <div key={label} className="bg-[#f6f3ea] px-4 py-2.5">
                <p className="text-[10px] tracking-widest text-gray-400 uppercase">{label}</p>
                <p className={`font-bold ${label === 'Payment Status' && billData.totalBill > 0 ? (isDue ? 'text-red-700' : 'text-emerald-700') : 'text-gray-900'}`}>{value}</p>
              </div>
            ))}
          </div>

          <SectionHeading>Bill at a Glance</SectionHeading>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Total Billed', billTotals.total, '#1e3828'],
              ['Items Paid', billTotals.paid, '#26804e'],
              ['Items Unpaid', billTotals.unpaid, billTotals.unpaid > 0 ? '#b23434' : '#6e7470'],
              ['Deposits Received', billData.totalDeposits, '#b8863a']
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-xl border border-gray-200/70 bg-[#f6f3ea] px-4 py-3 overflow-hidden" style={{ borderTop: `4px solid ${color}` }}>
                <p className="text-[10px] tracking-widest text-gray-400 uppercase">{label}</p>
                <p className="text-lg font-bold mt-0.5" style={{ color }}>Rs. {value.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>

          <SectionHeading>Patient Information</SectionHeading>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-xl overflow-hidden border border-gray-200/70 bg-gray-200/70 text-sm">
            {[
              ['Patient Name', billData.patientName],
              ['Patient ID', billData.patientId],
              ['Age', `${billData.age} years`],
              ['Gender', billData.gender],
              ['Phone', billData.phone],
              ['Family Member', billData.familyMember],
              ['ABHA ID', billData.abhaId],
              ['Room', billData.room],
              ['Admitted', formatDateTime(billData.admitDate)],
              ['Discharged', formatDateTime(billData.dischargeDate)],
              ['Length of Stay', billData.duration],
              ['Ward (Bed)', `${billData.ward} (${billData.bed})`],
              ...doctorFields(doctor).map((field) => [field.label, field.value])
            ].map(([label, value]) => (
              <div key={label} className="bg-[#f6f3ea] px-4 py-2.5">
                <p className="text-[10px] tracking-widest text-gray-400 uppercase">{label}</p>
                <p className="font-semibold text-gray-900 break-words">{value}</p>
              </div>
            ))}
          </div>

          <SectionHeading>Diagnosis & Medicines</SectionHeading>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200/70 p-4" style={{ borderLeft: '4px solid #396447' }}>
              <p className="text-[10px] tracking-widest text-gray-400 uppercase mb-1">Diagnosis</p>
              {billData.diagnosis.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-gray-800 space-y-0.5">
                  {billData.diagnosis.map((d, i) => (
                    <li key={i}>{d.diagnosis}{d.explainer ? ` - ${d.explainer}` : ''}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No diagnosis recorded</p>
              )}
            </div>
            <div className="rounded-xl border border-gray-200/70 p-4" style={{ borderLeft: '4px solid #b8863a' }}>
              <p className="text-[10px] tracking-widest text-gray-400 uppercase mb-1">Medicines Prescribed</p>
              {billData.medicines.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-gray-800 space-y-0.5">
                  {billData.medicines.map((m, i) => (
                    <li key={i}>{m.name} - {m.dosage} ({m.frequency}, {m.route})</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No medicines prescribed</p>
              )}
            </div>
          </div>

          <SectionHeading>Bill Details</SectionHeading>
          <div className="overflow-x-auto rounded-xl border border-gray-200/70">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#396447' }} className="text-white">
                  <th className="px-4 py-2.5 text-left font-semibold">#</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Description</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Category</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {billData.billingItems.map((item, index) => (
                  <tr key={index} className={index % 2 ? 'bg-[#faf8f3]' : 'bg-white'}>
                    <td className="px-4 py-2.5 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-2.5 text-gray-900">{item.description || 'N/A'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{item.category || 'Other'}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{(parseFloat(item.amount) || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {billData.billingItems.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-4 text-center text-gray-500">No bill items</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {billData.deposits.length > 0 && (
            <>
              <SectionHeading>Deposits Received</SectionHeading>
              <div className="overflow-x-auto rounded-xl border border-gray-200/70">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#606864' }} className="text-white">
                      <th className="px-4 py-2.5 text-left font-semibold">Reason</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Date</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billData.deposits.map((d, index) => (
                      <tr key={index} className={index % 2 ? 'bg-[#faf8f3]' : 'bg-white'}>
                        <td className="px-4 py-2.5 text-gray-900">{d.reason || '-'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{d.depositedAt ? new Date(d.depositedAt).toLocaleDateString('en-IN') : '-'}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">{(parseFloat(d.amount) || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {ledgerEntries.length > 0 && (
            <>
              <SectionHeading>Account Ledger</SectionHeading>
              <div className="overflow-x-auto rounded-xl border border-gray-200/70">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#1e3828' }} className="text-white">
                      <th className="px-4 py-2.5 text-left font-semibold">Date & Time</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Particulars</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Type</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Debit</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Credit</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((entry, index) => (
                      <tr key={index} className={index % 2 ? 'bg-[#faf8f3]' : 'bg-white'}>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{entry.date ? formatDateTimeLong(entry.date) : '-'}</td>
                        <td className="px-4 py-2.5 text-gray-900">{entry.text}</td>
                        <td className="px-4 py-2.5 text-gray-500">{entry.category}</td>
                        <td className="px-4 py-2.5 text-right text-gray-900">{entry.debit ? `Rs. ${entry.debit.toLocaleString('en-IN')}` : '-'}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-700">{entry.credit ? `Rs. ${entry.credit.toLocaleString('en-IN')}` : '-'}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">{entry.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="rounded-xl border border-gray-200/70 bg-[#f6f3ea] p-4 flex flex-col justify-between">
              <div>
                <p className="text-[10px] tracking-widest text-gray-400 uppercase">{billData.balance >= 0 ? 'Refund due in words' : 'Balance due in words'}</p>
                <p className="font-bold text-forest-700 mt-1">{amountInWords(Math.abs(billData.balance))}</p>
              </div>
              <div className="mt-4">
                <p className="text-[10px] tracking-widest text-gray-400 uppercase">Payment status</p>
                <p className={`font-bold ${isDue ? 'text-red-700' : 'text-emerald-700'}`}>{paymentStatus}</p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200/70 overflow-hidden">
              <div className="px-5 py-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-bold text-gray-900">Rs. {billData.totalBill.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Deposits</span><span className="font-bold text-emerald-700">- Rs. {billData.totalDeposits.toLocaleString('en-IN')}</span></div>
              </div>
              <div className="px-5 py-3 flex items-center justify-between text-white" style={{ background: isDue ? '#b23434' : '#396447' }}>
                <span className="text-xs font-bold tracking-widest uppercase">{isDue ? 'Balance (Due)' : 'Balance (Refundable)'}</span>
                <span className="text-xl font-bold">Rs. {Math.abs(billData.balance).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {insights.length > 0 && (
            <div className="mt-6 rounded-xl border border-gray-200/70 bg-[#f6f3ea] p-4">
              <p className="text-xs font-bold text-forest-700 mb-2">Billing Insights</p>
              <ul className="space-y-1 text-sm text-gray-800">
                {insights.map((text, index) => (
                  <li key={index} className="flex gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#b8863a' }} />{text}</li>
                ))}
              </ul>
            </div>
          )}

          {billData.insurance?.provider && (
            <div className="mt-6 rounded-xl border border-gray-200/70 bg-[#f6f3ea] p-4">
              <p className="text-[10px] tracking-widest text-gray-400 uppercase mb-2">Insurance Details</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-gray-400">Provider</p><p className="font-semibold text-gray-900">{billData.insurance.provider}</p></div>
                <div><p className="text-xs text-gray-400">Policy Number</p><p className="font-semibold text-gray-900">{billData.insurance.policyNumber || 'N/A'}</p></div>
                <div><p className="text-xs text-gray-400">Claim Status</p><p className="font-semibold text-gray-900 capitalize">{billData.insurance.claimStatus || 'N/A'}</p></div>
                <div><p className="text-xs text-gray-400">Coverage Used</p><p className="font-semibold text-gray-900">Rs. {billData.insurance.coverageUsed?.toLocaleString('en-IN') || '0'}</p></div>
              </div>
            </div>
          )}

          <div className="relative mt-10 grid grid-cols-3 gap-6 items-end text-xs">
            {['Billing Executive', 'Patient / Attendant', 'Authorised Signatory'].map((label, index) => (
              <div key={label} className="relative pt-24">
                {index === 1 && billData.totalBill > 0 && (
                  <div
                    className="absolute left-1/2 top-0 px-5 py-1.5 text-center font-extrabold tracking-[0.25em] text-xl select-none whitespace-nowrap"
                    style={{
                      color: stampColor,
                      border: `3px double ${stampColor}`,
                      borderRadius: 4,
                      transform: 'translateX(-50%) rotate(-7deg)',
                      opacity: 0.85
                    }}
                  >
                    {stampText}
                    <div className="text-[9px] tracking-[0.2em] font-bold">{stampDate}</div>
                  </div>
                )}
                {index === 2 && (
                  <div
                    className="absolute left-1/2 top-0 -translate-x-1/2 w-[88px] h-[88px] rounded-full flex flex-col items-center justify-center text-center select-none"
                    style={{ border: '2px solid #396447', boxShadow: 'inset 0 0 0 4px #fff, inset 0 0 0 5px #396447', color: '#396447', opacity: 0.9 }}
                  >
                    <span style={{ color: '#b8863a', fontSize: 16, lineHeight: 1, fontWeight: 800 }}>+</span>
                    <span className="text-[9px] font-bold leading-tight">AAROGYA<br />SANDESH</span>
                  </div>
                )}
                <div className="border-t border-gray-400 pt-1.5">
                  <p className="font-bold text-gray-900">{label}</p>
                  <p className="text-gray-400">{index === 2 ? 'For AarogyaSandesh' : 'Name & signature'}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-gray-200/70 bg-[#f6f3ea] overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 pl-6 pr-4 py-4" style={{ borderLeft: '5px solid #396447' }}>
            <div className="w-full">
              <p className="text-[11px] font-bold tracking-[0.2em] text-forest-700">DOCUMENT AUTHENTICATION</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-3 text-sm">
                <div><p className="text-[10px] tracking-widest text-gray-400 uppercase">Document Type</p><p className="font-bold text-gray-900">Final Bill</p></div>
                <div><p className="text-[10px] tracking-widest text-gray-400 uppercase">Document Ref</p><p className="font-bold text-gray-900 break-all">{docRef}</p></div>
                <div><p className="text-[10px] tracking-widest text-gray-400 uppercase">Issued On</p><p className="font-bold text-gray-900">{formatDateTimeLong()}</p></div>
                <div><p className="text-[10px] tracking-widest text-gray-400 uppercase">Patient</p><p className="font-bold text-gray-900">{billData.patientName}</p></div>
              </div>
              <p className="text-xs text-gray-500 mt-3">Electronically issued by the AarogyaSandesh platform. The QR code in the header carries this document reference for record matching.</p>
            </div>
            <svg viewBox="0 0 200 200" className="w-44 h-44 shrink-0 select-none" style={{ opacity: 0.9, transform: 'rotate(-12deg)' }}>
              <defs>
                <path id="bill-stamp-top" d="M 24,100 a 76,76 0 1,1 152,0" />
                <path id="bill-stamp-bottom" d="M 18,100 a 82,82 0 0,0 164,0" />
              </defs>
              <circle cx="100" cy="100" r="96" fill="none" stroke="#396447" strokeWidth="4" />
              <circle cx="100" cy="100" r="89" fill="none" stroke="#396447" strokeWidth="1.2" />
              <circle cx="100" cy="100" r="56" fill="none" stroke="#b8863a" strokeWidth="2.4" />
              <text fontSize="17" fontWeight="700" fill="#396447" letterSpacing="3.5">
                <textPath href="#bill-stamp-top" startOffset="50%" textAnchor="middle">AAROGYA SANDESH</textPath>
              </text>
              <text fontSize="11.5" fontWeight="700" fill="#396447" letterSpacing="1.6">
                <textPath href="#bill-stamp-bottom" startOffset="50%" textAnchor="middle" dominantBaseline="hanging">A HEALTH UPDATE, DELIVERED</textPath>
              </text>
              <circle cx="14" cy="100" r="3" fill="#b8863a" />
              <circle cx="186" cy="100" r="3" fill="#b8863a" />
              <image href={LogoImg} x="55" y="55" width="90" height="90" />
            </svg>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-200/60 text-center">
            <p className="text-xs text-gray-400">This is a system-generated bill. Please verify all details with the hospital accounts department.</p>
            <p className="text-xs text-gray-400 mt-1">Thank you for choosing AarogyaSandesh. Wishing you good health!</p>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
              <span className="text-forest-700">✦</span>
              Made in India
              <span className="text-forest-700">✦</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BillGenerator