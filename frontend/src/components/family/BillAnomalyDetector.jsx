import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle,
  Upload,
  X,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Camera,
  Loader2,
  Info
} from 'lucide-react'
import { checkAnomaly, searchCGHS } from '../../utils/billAnomaly'
import CGHSExplainer from '../common/CGHSExplainer'
import { callGemini } from '../../utils/gemini'

const BillAnomalyDetector = ({ billingItems = [], patientId, onFlaggedItem }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchAmount, setSearchAmount] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResults, setOcrResults] = useState([])
  const [showUpload, setShowUpload] = useState(false)
  const [error, setError] = useState('')

  const [analyzedItems, setAnalyzedItems] = useState([])
  const [activeView, setActiveView] = useState('auto')
  const [showExplainer, setShowExplainer] = useState(true)

  useEffect(() => {
    if (billingItems && billingItems.length > 0) {
      const results = billingItems.map(item => ({
        ...item,
        anomaly: checkAnomaly(item.description || item.name || '', item.amount || 0)
      }))
      setAnalyzedItems(results)
      
      const flagged = results.filter(r => r.anomaly.status === 'flagged')
      if (flagged.length > 0 && onFlaggedItem) {
        onFlaggedItem(flagged)
      }
    }
  }, [billingItems])

  const handleSearch = () => {
    if (!searchQuery.trim() || !searchAmount) return
    
    setSearchLoading(true)
    const amount = parseFloat(searchAmount)
    const result = checkAnomaly(searchQuery, amount)
    setSearchResult(result)
    setSearchLoading(false)
  }

  const handleSearchInput = (value) => {
    setSearchQuery(value)
    if (value.length >= 2) {
      const suggestions = searchCGHS(value)
      setSearchSuggestions(suggestions)
      setShowSuggestions(true)
    } else {
      setSearchSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectSuggestion = (item) => {
    setSearchQuery(item.name)
    setSearchSuggestions([])
    setShowSuggestions(false)
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'flagged':
        return <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium border border-red-500/20 flex items-center gap-1"><AlertTriangle size={12} /> Flagged</span>
      case 'normal':
        return <span className="px-2 py-1 bg-forest-600/10 text-forest-400 rounded-lg text-xs font-medium border border-forest-600/20 flex items-center gap-1"><CheckCircle size={12} /> Normal</span>
      case 'unmatched':
        return <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded-lg text-xs font-medium border border-gray-500/20 flex items-center gap-1"><Minus size={12} /> Unmatched</span>
      default:
        return null
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      setError('Please upload JPEG, PNG, GIF, WebP, or PDF files only')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setError('')
    setUploadFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadPreview(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = (error) => reject(error)
    })
  }

  const processOCR = async () => {
    if (!uploadFile) return

    setOcrLoading(true)
    setOcrResults([])
    setError('')

    try {
      const base64 = await fileToBase64(uploadFile)

      const prompt = `Extract every billable line item from this hospital bill image.
Return ONLY valid JSON, no markdown, no explanation, in this exact format:
[{"name": "item name as written", "amount": numeric_value_only}]
If a line has no clear amount, skip it. If the image is unreadable, return [].

Important: 
- Extract the item name exactly as written
- Extract the charged amount in Indian Rupees
- Skip any items that don't have a clear amount
- Only include items with clear numerical amounts`

      const responseText = await callGemini(prompt, base64)
      
      if (!responseText) {
        setError('Failed to process image. Please try manual search.')
        setOcrLoading(false)
        return
      }

      let text = responseText.replace(/```json|```/g, '').trim()

      let items = []
      try {
        items = JSON.parse(text)
      } catch (parseError) {
        setError('Could not parse the extracted data. Please try manual search.')
        setOcrLoading(false)
        return
      }

      if (!Array.isArray(items) || items.length === 0) {
        setError('No items found in the image. Please try manual search.')
        setOcrLoading(false)
        return
      }

      const filteredItems = items.filter(item => 
        item.name && 
        item.name.trim() && 
        typeof item.amount === 'number' && 
        item.amount > 0
      )

      const results = filteredItems.map(item => ({
        name: item.name,
        amount: item.amount,
        anomaly: checkAnomaly(item.name, item.amount)
      }))

      setOcrResults(results)

    } catch (error) {
      console.error('OCR Error:', error)
      setError('Failed to process image. Please try manual search.')
    } finally {
      setOcrLoading(false)
    }
  }

  const views = [
    { id: 'auto', label: 'Auto-Flag on Bills', icon: AlertTriangle },
    { id: 'search', label: 'Manual Search', icon: Search },
    { id: 'upload', label: 'Upload & Scan', icon: Camera }
  ]

  const flaggedCount = analyzedItems.filter(r => r.anomaly.status === 'flagged').length
  const totalItems = analyzedItems.length

  const StatCard = ({ label, value, color, icon: Icon }) => (
    <div className={`bg-white/50 p-3 rounded-lg border border-gray-200/50 flex items-center gap-3`}>
      <div className={`p-2 rounded-lg ${color === 'red' ? 'bg-red-50' : color === 'green' ? 'bg-forest-50' : 'bg-gray-50'}`}>
        <Icon className={`w-4 h-4 ${color === 'red' ? 'text-red-400' : color === 'green' ? 'text-forest-400' : 'text-gray-400'}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-lg font-bold ${color === 'red' ? 'text-red-400' : color === 'green' ? 'text-forest-400' : 'text-gray-900'}`}>
          {value}
        </p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-forest-50 rounded-lg border border-forest-200/50">
            <Shield className="w-5 h-5 text-forest-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">AI Bill Anomaly Detector</h3>
            <p className="text-xs text-gray-500">Compare hospital bills against CGHS benchmark rates</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatCard label="Total Items" value={totalItems} color="gray" icon={FileText} />
          {flaggedCount > 0 && (
            <StatCard label="Flagged" value={flaggedCount} color="red" icon={AlertTriangle} />
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100/50 p-1 rounded-xl border border-gray-200/50 self-start">
        {views.map((view) => {
          const Icon = view.icon
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center gap-1.5 ${
                activeView === view.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {view.label}
            </button>
          )
        })}
      </div>

      {showExplainer && (
        <div className="relative">
          <CGHSExplainer />
          <button
            onClick={() => setShowExplainer(false)}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {!showExplainer && (
        <button
          onClick={() => setShowExplainer(true)}
          className="text-xs text-forest-700 hover:text-forest-800 transition-colors flex items-center gap-1"
        >
          <Info size={12} />
          Show tier information
        </button>
      )}

      {activeView === 'auto' && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <FileText size={16} className="text-gray-400" />
            Current Bill Items {flaggedCount > 0 && <span className="text-red-400 text-xs">({flaggedCount} flagged)</span>}
          </h4>
          {analyzedItems.length === 0 ? (
            <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-200/50 rounded-xl">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium text-gray-900">No Bill Items to Analyze</p>
              <p className="text-xs text-gray-400">Bill items will appear here as they are added by hospital staff</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {analyzedItems.map((item, index) => {
                const anomaly = item.anomaly
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`p-3 rounded-xl border ${
                      anomaly.status === 'flagged' 
                        ? 'bg-red-500/5 border-red-500/30' 
                        : anomaly.status === 'normal'
                        ? 'bg-forest-600/5 border-forest-600/30'
                        : 'bg-gray-50/50 border-gray-200/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.description || item.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-500">₹{item.amount}</span>
                          {anomaly.status !== 'unmatched' && anomaly.status !== 'invalid' && (
                            <>
                              <span className="text-xs text-gray-400">|</span>
                              <span className="text-xs text-gray-500">Benchmark: ₹{anomaly.benchmarkRate}</span>
                              <span className="text-xs text-gray-400">|</span>
                              <span className={`text-xs font-medium ${
                                anomaly.diffPercent > 0 ? 'text-red-400' : 'text-forest-400'
                              }`}>
                                {anomaly.diffPercent > 0 ? '+' : ''}{anomaly.diffPercent}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        {anomaly.matchedName && (
                          <span className="text-xs text-gray-400 hidden md:inline max-w-[120px] truncate">
                            {anomaly.matchedName}
                          </span>
                        )}
                        {getStatusBadge(anomaly.status)}
                      </div>
                    </div>
                    {anomaly.status === 'flagged' && (
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-red-400">
                        <TrendingUp size={12} />
                        <span>Charged ₹{(anomaly.chargedAmount - anomaly.benchmarkRate).toFixed(0)} above benchmark ({anomaly.diffPercent}% excess)</span>
                      </div>
                    )}
                    {anomaly.status === 'normal' && anomaly.diffPercent < 0 && (
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-forest-400">
                        <TrendingDown size={12} />
                        <span>Charged {Math.abs(anomaly.diffPercent)}% below benchmark</span>
                      </div>
                    )}
                    {anomaly.status === 'normal' && anomaly.diffPercent >= 0 && (
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-forest-400">
                        <CheckCircle size={12} />
                        <span>Within acceptable range</span>
                      </div>
                    )}
                    {anomaly.status === 'unmatched' && (
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                        <Minus size={12} />
                        <span>No CGHS benchmark available for this item</span>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeView === 'search' && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Search Against CGHS Rates</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Type procedure name (e.g., MRI, Blood Test)"
                className="w-full px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
              />
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                  {searchSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onMouseDown={() => selectSuggestion(item)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-forest-50/50 transition-colors flex items-center justify-between"
                    >
                      <span className="text-gray-900 truncate">{item.name}</span>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">₹{item.rate}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="number"
              value={searchAmount}
              onChange={(e) => setSearchAmount(e.target.value)}
              placeholder="Charged amount (₹)"
              className="w-full sm:w-40 px-4 py-2.5 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all duration-300"
            />
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || !searchAmount}
              className="px-6 py-2.5 bg-gradient-to-r from-forest-700 to-forest-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-forest-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center whitespace-nowrap"
            >
              <Search size={18} />
              Check
            </button>
          </div>

          {searchLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-forest-500 animate-spin" />
            </div>
          )}

          {searchResult && !searchLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl border ${
                searchResult.status === 'flagged' 
                  ? 'bg-red-500/5 border-red-500/30' 
                  : searchResult.status === 'normal'
                  ? 'bg-forest-600/5 border-forest-600/30'
                  : 'bg-gray-50/50 border-gray-200/50'
              }`}
            >
              {searchResult.status === 'unmatched' && (
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">No CGHS benchmark found for "{searchQuery}"</p>
                  <p className="text-xs text-gray-400 mt-1">Try different search terms or check the spelling</p>
                </div>
              )}

              {searchResult.status !== 'unmatched' && searchResult.status !== 'invalid' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm text-gray-500">Matched Procedure</p>
                      <p className="font-medium text-gray-900">{searchResult.matchedName}</p>
                      <p className="text-xs text-gray-400">Tier: {searchResult.tier || 'N/A'} • Category: {searchResult.category || 'N/A'}</p>
                    </div>
                    {getStatusBadge(searchResult.status)}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-white/50 p-3 rounded-lg border border-gray-200/50">
                      <p className="text-xs text-gray-500">CGHS Benchmark</p>
                      <p className="text-lg font-bold text-gray-900">₹{searchResult.benchmarkRate}</p>
                    </div>
                    <div className="bg-white/50 p-3 rounded-lg border border-gray-200/50">
                      <p className="text-xs text-gray-500">Charged Amount</p>
                      <p className={`text-lg font-bold ${searchResult.status === 'flagged' ? 'text-red-400' : 'text-gray-900'}`}>
                        ₹{searchResult.chargedAmount}
                      </p>
                    </div>
                    <div className="bg-white/50 p-3 rounded-lg border border-gray-200/50">
                      <p className="text-xs text-gray-500">Difference</p>
                      <p className={`text-lg font-bold ${searchResult.diffPercent > 0 ? 'text-red-400' : 'text-forest-400'}`}>
                        {searchResult.diffPercent > 0 ? '+' : ''}{searchResult.diffPercent}%
                      </p>
                    </div>
                  </div>

                  {searchResult.status === 'flagged' && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-sm text-red-400 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        <span>Charged ₹{(searchResult.chargedAmount - searchResult.benchmarkRate).toFixed(0)} above benchmark ({searchResult.diffPercent}% excess)</span>
                      </p>
                    </div>
                  )}

                  {searchResult.status === 'normal' && (
                    <div className="p-3 bg-forest-600/10 border border-forest-600/20 rounded-lg">
                      <p className="text-sm text-forest-400 flex items-center gap-2">
                        <CheckCircle size={16} />
                        <span>Charged amount is within acceptable range</span>
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-400">
                    Match confidence: {searchResult.matchConfidence}% 
                    <span className="ml-2 text-gray-300">|</span>
                    <span className="ml-2">Tier: {searchResult.tier || 'N/A'}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {activeView === 'upload' && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Upload Bill Image for AI Scanning</h4>
          
          {!showUpload ? (
            <button
              onClick={() => setShowUpload(true)}
              className="w-full p-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-forest-400 transition-all duration-300 flex flex-col items-center gap-3 bg-white/50"
            >
              <div className="w-16 h-16 bg-forest-50 rounded-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-forest-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Upload Bill Image</p>
                <p className="text-sm text-gray-400">Take a photo or upload a bill to analyze</p>
              </div>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                    onChange={handleFileUpload}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-forest-50 file:text-forest-700 hover:file:bg-forest-100 transition-colors"
                  />
                </div>
                <button
                  onClick={() => {
                    setShowUpload(false)
                    setUploadFile(null)
                    setUploadPreview(null)
                    setOcrResults([])
                    setError('')
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              {uploadPreview && (
                <div className="relative">
                  <img src={uploadPreview} alt="Bill preview" className="max-h-64 rounded-xl border border-gray-200/50 object-contain mx-auto" />
                  <button
                    onClick={() => {
                      setUploadFile(null)
                      setUploadPreview(null)
                      setOcrResults([])
                      setError('')
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg hover:bg-black/80 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {uploadFile && !ocrLoading && ocrResults.length === 0 && (
                <button
                  onClick={processOCR}
                  className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Upload size={18} />
                  Scan with AI
                </button>
              )}

              {ocrLoading && (
                <div className="py-8 text-center">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">AI is extracting bill items...</p>
                  <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
                </div>
              )}

              {ocrResults.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-violet-400" />
                    Extracted Items ({ocrResults.length})
                  </h5>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {ocrResults.map((item, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border ${
                        item.anomaly.status === 'flagged' 
                          ? 'bg-red-500/5 border-red-500/30' 
                          : item.anomaly.status === 'normal'
                          ? 'bg-forest-600/5 border-forest-600/30'
                          : 'bg-gray-50/50 border-gray-200/50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">₹{item.amount}</p>
                          </div>
                          {getStatusBadge(item.anomaly.status)}
                        </div>
                        {item.anomaly.status === 'flagged' && (
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-red-400">
                            <AlertTriangle size={12} />
                            <span>₹{(item.amount - item.anomaly.benchmarkRate).toFixed(0)} above benchmark</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BillAnomalyDetector