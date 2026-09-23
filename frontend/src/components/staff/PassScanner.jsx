import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { CheckCircle, XCircle, AlertCircle, Hospital, User, Clock, Upload, Camera } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const PassScanner = ({ onClose }) => {
  const [scanResult, setScanResult] = useState(null)
  const [scanning, setScanning] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [pendingToken, setPendingToken] = useState(null)
  const [pendingInfo, setPendingInfo] = useState(null)
  const [confirmName, setConfirmName] = useState('')
  const fileInputRef = useRef(null)
  const scannerRef = useRef(null)

  const handleDecodedResult = async (decodedText) => {
    try {
      const res = await fetch(`${API_URL}/api/visiting-pass/status/${decodedText}`)
      const data = await res.json()
      if (!data.success) {
        setError('Pass not found or invalid.')
        return
      }
      setPendingToken(decodedText)
      setPendingInfo({ visitorName: data.visitorName, patientName: data.patientName, ward: data.ward })
    } catch (err) {
      console.error('Status lookup error:', err)
      setError('Failed to look up pass.')
    }
  }

  const verifyPass = async (passId, staffConfirmedName) => {
    try {
      const response = await fetch(`${API_URL}/api/visiting-pass/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passId, staffConfirmedName })
      })

      const data = await response.json()
      setScanResult(data)
    } catch (error) {
      console.error('Error verifying pass:', error)
      setError('Failed to verify pass')
    }
  }

  useEffect(() => {
    let html5QrCode
    let cancelled = false

    const initializeScanner = async () => {
      if (mode === 'camera') {
        try {
          html5QrCode = new Html5Qrcode('qr-reader-container')
          scannerRef.current = html5QrCode

          const config = {
            fps: 15,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
            formatsToSupport: [
              Html5Qrcode.QR_CODE,
              Html5Qrcode.DATA_MATRIX,
              Html5Qrcode.AZTEC
            ]
          }

          if (cancelled) return

          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            async (decodedText) => {
              setScanning(false)
              await html5QrCode.stop()
              await handleDecodedResult(decodedText)
            },
            (errorMessage) => {
              if (errorMessage.includes('No MultiFormat')) {
              }
            }
          )
        } catch (error) {
          console.error('Scanner initialization error:', error)
          setError('Failed to initialize camera. Please check permissions.')
        }
      }
    }

    initializeScanner()

    return () => {
      cancelled = true
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {})
          scannerRef.current.clear()
        } catch (e) {
          console.warn('Scanner cleanup error:', e)
        }
      }
    }
  }, [mode])

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploadedFile(file)
    setError('')
    setScanResult(null)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const html5QrCode = new Html5Qrcode('qr-upload-container')
        const result = await html5QrCode.scanFile(file, true)
        await handleDecodedResult(result)
        html5QrCode.clear()
      } catch (error) {
        console.error('File scan error:', error)
        setError('Could not read QR code from the uploaded image. Please try another image.')
      }
    }
    reader.readAsDataURL(file)
  }

  const resetScanner = () => {
    setScanResult(null)
    setError('')
    setScanning(true)
    setUploadedFile(null)
    setPendingToken(null)
    setPendingInfo(null)
    setConfirmName('')
    if (mode === 'camera') {
      window.location.reload()
    }
  }

  const switchMode = (newMode) => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (e) {}
    }
    setMode(newMode)
    setScanResult(null)
    setError('')
    setScanning(true)
    setUploadedFile(null)
    setPendingToken(null)
    setPendingInfo(null)
    setConfirmName('')
  }

  return (
    <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-gray-200/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-forest-50 rounded-lg border border-forest-200/50">
            <Hospital className="w-5 h-5 text-forest-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Scan Visiting Pass</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>

      {!mode && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('camera')}
            className="flex-1 px-3 py-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-forest-50 hover:text-forest-700 transition-colors flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Camera
          </button>
          <button
            onClick={() => setMode('upload')}
            className="flex-1 px-3 py-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-forest-50 hover:text-forest-700 transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload QR
          </button>
        </div>
      )}

      {mode && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => switchMode('camera')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mode === 'camera' ? 'bg-forest-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Camera className="w-4 h-4" />
            Camera
          </button>
          <button
            onClick={() => switchMode('upload')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mode === 'upload' ? 'bg-forest-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Upload className="w-4 h-4" />
            Upload QR
          </button>
        </div>
      )}

      {mode === 'camera' && scanning && !scanResult && !error && !pendingToken && (
        <div className="text-center">
          <div id="qr-reader-container" className="w-full"></div>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-600">
              📷 Point camera at QR code to scan
            </p>
            <p className="text-xs text-blue-400 mt-1">
              Ensure the QR code is well lit and in focus
            </p>
            <div className="mt-2 flex justify-center gap-2 text-xs text-blue-400">
              <span>💡 Hold steady</span>
              <span>•</span>
              <span>🔦 Good lighting</span>
              <span>•</span>
              <span>📱 Clear QR</span>
            </div>
          </div>
        </div>
      )}

      {mode === 'upload' && !pendingToken && !scanResult && !error && (
        <div className="text-center">
          <div id="qr-upload-container" className="w-full"></div>
          <div 
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-forest-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Upload QR Code Image</p>
            <p className="text-gray-400 text-sm">Click to select or drag and drop</p>
            <p className="text-xs text-gray-400 mt-2">Supported: PNG, JPG, GIF, BMP</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          {uploadedFile && (
            <p className="text-sm text-gray-500 mt-2">📎 {uploadedFile.name}</p>
          )}
        </div>
      )}

      {pendingToken && pendingInfo && !scanResult && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h3 className="font-semibold text-gray-900 mb-2">Confirm Visitor Identity</h3>
          <p className="text-sm text-gray-600 mb-1">Pass is for: <span className="font-medium">{pendingInfo.visitorName}</span></p>
          <p className="text-sm text-gray-600 mb-3">Patient: <span className="font-medium">{pendingInfo.patientName}</span> • Ward: {pendingInfo.ward}</p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type the name shown on visitor's ID</label>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder="Enter visitor's name to confirm"
            className="w-full px-4 py-2 border border-gray-200 rounded-xl mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setPendingToken(null); setPendingInfo(null); setConfirmName(''); resetScanner() }}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => verifyPass(pendingToken, confirmName)}
              disabled={!confirmName.trim()}
              className="flex-1 px-4 py-2 bg-forest-500 text-white rounded-xl hover:bg-forest-700 disabled:opacity-50"
            >
              Confirm & Verify
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={resetScanner}
            className="ml-auto px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {scanResult && (
        <div className="mt-4">
          {scanResult.valid ? (
            <div className="p-4 bg-forest-50 border border-forest-200 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-8 h-8 text-forest-600" />
                <div>
                  <h3 className="text-lg font-bold text-forest-700">✅ Entry Granted</h3>
                  <p className="text-sm text-gray-600">Pass verified successfully</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Visitor</span>
                  <span className="font-medium">{scanResult.visitorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Patient</span>
                  <span className="font-medium">{scanResult.patientName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ward</span>
                  <span className="font-medium">{scanResult.ward || 'General'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <XCircle className="w-8 h-8 text-red-500" />
                <div>
                  <h3 className="text-lg font-bold text-red-600">❌ Entry Denied</h3>
                  <p className="text-sm text-gray-600">{scanResult.reason || 'Invalid pass'}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={resetScanner}
            className="mt-4 w-full py-2 bg-forest-500 text-white rounded-xl hover:bg-forest-700 transition-colors"
          >
            Scan Another Pass
          </button>
        </div>
      )}
    </div>
  )
}

export default PassScanner