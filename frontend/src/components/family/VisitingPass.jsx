import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'qrcode'
import { Download, User, Clock, AlertCircle, CheckCircle, XCircle, Hospital } from 'lucide-react'

const VisitingPass = ({ patientId, patientName, visitorName, ward, onClose }) => {
  const [passToken, setPassToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [slotData, setSlotData] = useState(null)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  useEffect(() => {
    const generatePass = async () => {
      try {
        if (!patientId || !visitorName) {
          setError('Patient ID and Visitor Name are required')
          setLoading(false)
          return
        }

        const response = await fetch(`${API_URL}/api/visiting-pass/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            patientName: patientName || 'Patient',
            visitorName: visitorName || 'Family Member',
            ward: ward || 'General'
          })
        })

        const data = await response.json()
        if (data.success) {
          setPassToken(data.passId)
          setSlotData({ expiresAt: data.expiresAt, visitingHours: data.visitingHours })
        } else {
          setError(data.error || 'Failed to generate pass')
        }
      } catch (error) {
        console.error('Error generating pass:', error)
        setError('Failed to generate visiting pass')
      } finally {
        setLoading(false)
      }
    }

    generatePass()
  }, [patientId, patientName, visitorName, ward])

  useEffect(() => {
    if (passToken && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, passToken, {
        width: 200,
        margin: 2,
        color: {
          dark: '#0d9488',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('QR generation error:', error)
      })
    }
  }, [passToken])

  const downloadQR = () => {
    if (canvasRef.current) {
      const link = document.createElement('a')
      link.download = `visiting-pass-${patientId}.png`
      link.href = canvasRef.current.toDataURL('image/png')
      link.click()
    }
  }

  const copyLink = () => {
    if (passToken) {
      navigator.clipboard.writeText(passToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white rounded-2xl">
        <div className="w-8 h-8 border-2 border-forest-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-500">Generating pass...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-white rounded-2xl">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-600">{error}</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-forest-500 text-white rounded-xl hover:bg-forest-700 transition-colors"
        >
          Close
        </button>
      </div>
    )
  }

  const expiryTime = slotData?.expiresAt
    ? new Date(slotData.expiresAt).toLocaleString()
    : '4 hours from generation'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-2xl p-6 max-w-md w-full border border-gray-200/50 shadow-2xl"
    >
      <div className="text-center border-b border-gray-200/50 pb-4">
        <h2 className="text-xl font-bold text-gray-900">Visiting Pass</h2>
        <p className="text-sm text-gray-500">Show this QR code at the hospital reception</p>
      </div>

      <div className="py-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Patient</span>
          <span className="font-medium text-gray-900">{patientName || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Visitor</span>
          <span className="font-medium text-gray-900">{visitorName || 'Family Member'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Ward</span>
          <span className="font-medium text-gray-900">{ward || 'General'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Valid Until</span>
          <span className="font-medium text-forest-700">{expiryTime}</span>
        </div>
        {slotData?.visitingHours && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Visiting Hours</span>
            <span className="font-medium text-gray-900">{slotData.visitingHours}</span>
          </div>
        )}
      </div>

      <div className="flex justify-center py-4 bg-gray-50 rounded-xl border border-gray-200/50">
        <canvas ref={canvasRef} className="mx-auto" />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={downloadQR}
          className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        <button
          onClick={copyLink}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-forest-500 to-forest-600 text-white rounded-xl hover:shadow-lg hover:shadow-forest-500/30 transition-all duration-300 flex items-center justify-center gap-2"
        >
          {copied ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

      <div className="mt-4 text-center text-xs text-gray-400">
        <p>⚠️ This pass expires at the end of the visiting slot</p>
        <p className="mt-1">Show this QR code at the hospital gate for entry</p>
      </div>

      <button
        onClick={onClose}
        className="mt-4 w-full py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
      >
        Close
      </button>
    </motion.div>
  )
}

export default VisitingPass