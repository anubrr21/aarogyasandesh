import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, ShieldAlert, Loader2, WifiOff } from 'lucide-react'
import Logo from '../assets/Logo.png'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const formatDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatDay = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

const rupees = (value) => `Rs. ${(Number(value) || 0).toLocaleString('en-IN')}`

const Row = ({ label, value, strong }) => (
  value === null || value === undefined || value === '' ? null : (
    <div className="flex items-start justify-between gap-6 py-2.5 border-b border-gray-200/70 last:border-0">
      <span className="text-xs tracking-widest uppercase text-gray-400 pt-0.5">{label}</span>
      <span className={`text-sm text-right break-all ${strong ? 'font-bold text-forest-700' : 'font-semibold text-gray-900'}`}>{value}</span>
    </div>
  )
)

const VerifyDocument = () => {
  const { id } = useParams()
  const [state, setState] = useState({ status: 'loading', document: null })

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const response = await fetch(`${API_URL}/api/documents/verify/${encodeURIComponent(id)}`)
        const data = await response.json()
        if (cancelled) return
        if (data.success && data.valid) setState({ status: 'valid', document: data.document })
        else if (data.success) setState({ status: 'invalid', document: null })
        else setState({ status: 'error', document: null })
      } catch {
        if (!cancelled) setState({ status: 'error', document: null })
      }
    }
    run()
    return () => { cancelled = true }
  }, [id])

  const doc = state.document
  const isBill = doc && (doc.kind === 'invoice' || doc.kind === 'final-bill')

  return (
    <div className="min-h-screen bg-[#FAF6EE] px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 justify-center mb-6">
          <img src={Logo} alt="AarogyaSandesh" className="w-14 h-14 object-contain" />
          <div>
            <p className="font-display text-2xl font-bold text-forest-700 leading-tight">Aarogya Sandesh</p>
            <p className="text-[10px] tracking-[0.3em] text-gray-400">DOCUMENT VERIFICATION</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden"
        >
          {state.status === 'loading' && (
            <div className="p-10 text-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-forest-500" />
              Checking this document...
            </div>
          )}

          {state.status === 'valid' && (
            <>
              <div className="px-6 py-6 text-center" style={{ background: 'linear-gradient(120deg, #1e3828, #396447)' }}>
                <ShieldCheck className="w-14 h-14 mx-auto text-white" />
                <h1 className="font-display text-2xl font-bold text-white mt-2">Document verified</h1>
                <p className="text-sm text-white/80 mt-1">This document was issued through the AarogyaSandesh platform.</p>
              </div>
              <div className="px-6 py-4">
                <Row label="Document type" value={doc.type} strong />
                <Row label="Reference" value={doc.reference} />
                <Row label="Patient" value={doc.patientName} />
                <Row label="Patient ID" value={doc.patientId} />
                <Row label="First issued" value={formatDate(doc.firstIssuedAt)} />
                <Row label="Copies generated" value={String(doc.copiesIssued)} />
                {isBill && (
                  <>
                    <Row label="Items billed" value={String(doc.itemCount)} />
                    <Row label="Total billed" value={rupees(doc.totalBill)} />
                    <Row label="Deposits received" value={rupees(doc.totalDeposits)} />
                    <Row label={doc.balance >= 0 ? 'Refund due' : 'Balance due'} value={rupees(Math.abs(doc.balance))} strong />
                  </>
                )}
                {!isBill && (
                  <>
                    <Row label="Admitted" value={formatDay(doc.admitDate)} />
                    <Row label="Discharged" value={formatDay(doc.dischargedAt)} />
                    <Row label="Length of stay" value={doc.lengthOfStay !== null && doc.lengthOfStay !== undefined ? `${doc.lengthOfStay} day(s)` : null} />
                  </>
                )}
              </div>
              <div className="mx-6 mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Compare these details with your printed or downloaded copy. If any figure or date differs, the copy has been altered and should not be trusted. Medical details are never shown on this page.
              </div>
            </>
          )}

          {state.status === 'invalid' && (
            <div className="px-6 py-10 text-center">
              <ShieldAlert className="w-14 h-14 mx-auto text-red-500" />
              <h1 className="font-display text-2xl font-bold text-gray-900 mt-2">Could not verify this document</h1>
              <p className="text-sm text-gray-500 mt-2">
                No record of this document exists on the AarogyaSandesh platform. The QR code may be damaged, or the document may not be genuine. Please contact the hospital billing desk.
              </p>
            </div>
          )}

          {state.status === 'error' && (
            <div className="px-6 py-10 text-center">
              <WifiOff className="w-12 h-12 mx-auto text-gray-400" />
              <h1 className="font-display text-xl font-bold text-gray-900 mt-2">Verification is unavailable right now</h1>
              <p className="text-sm text-gray-500 mt-2">We could not reach the verification service. Please check your connection and scan the code again in a moment.</p>
            </div>
          )}
        </motion.div>

        <p className="text-center text-xs text-gray-400 mt-5">AarogyaSandesh - A Health Update, Delivered.</p>
      </div>
    </div>
  )
}

export default VerifyDocument
