import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, X, User, Sparkles, MessageSquare, Trash2, ChevronDown, ChevronUp, Clock, ArrowRight, Zap, FileText, CreditCard, Shield, Stethoscope, Calendar, Mic, MicOff, Volume2, VolumeX, ThumbsUp, ThumbsDown, BarChart3 } from 'lucide-react'
import { callGemini } from '../../utils/gemini'
import { SITE_KNOWLEDGE } from '../../data/siteKnowledge'
import { fetchConditionInfo, fetchMedicineInfo, fetchICD11Info, fetchIndiaHealthContext } from '../../utils/medicalReference'
import { db } from '../../firebase/firebase'
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore'
const SpeechRecognitionAPI = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null

const VALID_TABS = ['overview', 'timeline', 'clinical', 'billing', 'anomaly', 'hospital', 'insurance', 'discharge', 'reports', 'diagnosisinfo', 'indiaopendata']
const TAB_ID_MAP = { diagnosisinfo: 'diagnosisInfo', indiaopendata: 'indiaOpenData' }

function parseActions(rawText) {
  const actionRegex = /\[\[ACTION:([a-z]+):([^\]]+)\]\]/gi
  const actions = []
  let cleanText = rawText

  let match
  while ((match = actionRegex.exec(rawText)) !== null) {
    const rawTab = match[1].toLowerCase()
    const label = match[2].trim()
    if (VALID_TABS.includes(rawTab)) {
      actions.push({ tab: TAB_ID_MAP[rawTab] || rawTab, label })
    }
  }
  cleanText = rawText.replace(actionRegex, '').trim()

  return { cleanText, actions }
}

function analyzeVitals(vitals) {
  if (!vitals || vitals.length === 0) return []
  const latest = vitals[vitals.length - 1]
  const flags = []

  if (latest.bp) {
    const parts = latest.bp.split('/').map(Number)
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const [sys, dia] = parts
      if (sys >= 180 || dia >= 120) {
        flags.push(`Blood pressure ${latest.bp} mmHg is severely elevated (hypertensive-crisis range; normal is roughly 90/60 to 120/80 mmHg). Sustained readings this high put significant strain on the heart and blood vessels and are usually treated as needing urgent medical attention.`)
      } else if (sys >= 140 || dia >= 90) {
        flags.push(`Blood pressure ${latest.bp} mmHg is higher than the typical normal range (roughly 90/60 to 120/80 mmHg) — this falls in a range commonly associated with hypertension (high blood pressure). Elevated blood pressure over time can increase strain on the heart and blood vessels.`)
      } else if (sys < 90 || dia < 60) {
        flags.push(`Blood pressure ${latest.bp} mmHg is lower than the typical normal range (roughly 90/60 to 120/80 mmHg) — this falls in a range commonly associated with hypotension (low blood pressure), which can sometimes cause dizziness or fatigue.`)
      }
    }
  }

  const pulse = parseFloat(latest.pulse)
  if (!isNaN(pulse)) {
    if (pulse > 120) {
      flags.push(`Pulse ${pulse} bpm is significantly higher than the typical resting range (60-100 bpm) — this level of elevated heart rate (tachycardia range) can be caused by fever, pain, dehydration, anxiety, or an underlying cardiac issue.`)
    } else if (pulse > 100) {
      flags.push(`Pulse ${pulse} bpm is higher than the typical resting range (60-100 bpm), sometimes referred to as tachycardia. This can be a normal response to fever, pain, or activity, or may need clinical evaluation depending on the underlying cause.`)
    } else if (pulse < 50) {
      flags.push(`Pulse ${pulse} bpm is significantly lower than the typical resting range (60-100 bpm) — this level (bradycardia range) can sometimes indicate a heart rhythm issue and often warrants closer monitoring.`)
    } else if (pulse < 60) {
      flags.push(`Pulse ${pulse} bpm is lower than the typical resting range (60-100 bpm), sometimes referred to as bradycardia. This can be normal in very fit individuals, or may need evaluation depending on symptoms.`)
    }
  }

  const spo2 = parseFloat(latest.oxygenSaturation)
  if (!isNaN(spo2)) {
    if (spo2 < 90) {
      flags.push(`Oxygen saturation (SpO2) ${spo2}% is significantly below the typical normal range (95-100%) — readings below 90% generally indicate a meaningful oxygen deficiency and are usually treated as needing prompt medical attention.`)
    } else if (spo2 < 95) {
      flags.push(`Oxygen saturation (SpO2) ${spo2}% is below the typical normal range (95-100%). Mildly low SpO2 can be related to a respiratory condition, and monitoring or clinical evaluation is often recommended.`)
    }
  }

  const rr = parseFloat(latest.respiratoryRate)
  if (!isNaN(rr)) {
    if (rr > 24) {
      flags.push(`Respiratory rate ${rr} breaths/min is significantly higher than the typical range (12-20/min) — this level of rapid breathing (tachypnea) can be associated with fever, pain, anxiety, or a respiratory/cardiac issue.`)
    } else if (rr > 20) {
      flags.push(`Respiratory rate ${rr} breaths/min is higher than the typical range (12-20/min), which can be a normal response to fever or exertion, or may warrant clinical evaluation.`)
    } else if (rr < 10) {
      flags.push(`Respiratory rate ${rr} breaths/min is lower than the typical range (12-20/min) — unusually slow breathing (bradypnea) can sometimes be linked to sedation or a respiratory issue and is often worth flagging to staff.`)
    } else if (rr < 12) {
      flags.push(`Respiratory rate ${rr} breaths/min is slightly lower than the typical range (12-20/min).`)
    }
  }

  const temp = parseFloat(latest.temperature)
  if (!isNaN(temp)) {
    const isFahrenheit = latest.temperatureUnit ? latest.temperatureUnit === 'F' : temp > 50
    const tempC = isFahrenheit ? (temp - 32) * 5 / 9 : temp
    const unit = isFahrenheit ? '°F' : '°C'
    if (tempC >= 39.4) {
      flags.push(`Temperature ${temp}${unit} indicates a high fever (well above the normal range of roughly 97-99°F / 36.1-37.2°C). High fevers can indicate an active infection or inflammatory process and are usually monitored closely by staff.`)
    } else if (tempC >= 38) {
      flags.push(`Temperature ${temp}${unit} indicates a fever (normal range is roughly 97-99°F / 36.1-37.2°C). A mild-to-moderate fever is often the body's response to infection.`)
    } else if (tempC < 35) {
      flags.push(`Temperature ${temp}${unit} is lower than the typical normal range (roughly 97-99°F / 36.1-37.2°C) — unusually low body temperature can sometimes need clinical attention.`)
    }
  }

  return flags
}

const SandeshGPT = ({
  isOpen,
  onClose,
  language = 'en',
  patientData,
  clinicalData,
  billingData,
  reports,
  prescriptions,
  dischargeData,
  assignedDoctor,
  totalBill,
  totalDeposits,
  balance,
  onNavigate
}) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: '👋 Namaste! I\'m SandeshGPT, your AI assistant for AarogyaSandesh.\n\nI can help you with:\n• 📋 Using the Family Portal\n• 🏥 Healthcare information\n• 💡 General questions\n• 🔍 Finding features\n\nHow can I assist you today?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [typingIndicator, setTypingIndicator] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
    const hasLoadedHistoryRef = useRef(false)

      const recognitionRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showQualityPanel, setShowQualityPanel] = useState(false)

  // Real evaluation metrics computed from this conversation's own messages — no separate query,
  // no fabricated score. Mirrors how production LLM products track quality: user feedback (👍/👎),
  // response latency, and (since SandeshGPT is RAG-grounded) how often the retrieval sources it
  // relies on actually returned usable data.
  const qualityStats = useMemo(() => {
    const responses = messages.filter(m => m.role === 'assistant' && m.id !== 1)
    const rated = responses.filter(m => m.feedback === 'up' || m.feedback === 'down')
    const thumbsUp = responses.filter(m => m.feedback === 'up').length
    const timed = responses.filter(m => typeof m.responseTimeMs === 'number')
    const avgResponseTimeMs = timed.length
      ? Math.round(timed.reduce((sum, m) => sum + m.responseTimeMs, 0) / timed.length)
      : null
    const grounded = responses.filter(m => m.grounding && m.grounding.attempted > 0)
    const groundingRate = grounded.length
      ? Math.round((grounded.reduce((sum, m) => sum + (m.grounding.succeeded / m.grounding.attempted), 0) / grounded.length) * 100)
      : null
    return {
      totalResponses: responses.length,
      ratedCount: rated.length,
      satisfactionRate: rated.length ? Math.round((thumbsUp / rated.length) * 100) : null,
      avgResponseTimeMs,
      groundingRate
    }
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])
    useEffect(() => {
    const loadHistory = async () => {
      if (!isOpen || !patientData?.id || hasLoadedHistoryRef.current) return
      hasLoadedHistoryRef.current = true
      try {
        const historyRef = collection(db, 'patients', patientData.id, 'chatHistory')
        const q = query(historyRef, orderBy('timestamp', 'asc'))
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          const loadedMessages = snapshot.docs.map(d => ({ id: d.id, ...d.data(), docId: d.id }))
          setMessages(loadedMessages)
        }
      } catch (err) {
        console.error('Error loading chat history:', err)
      }
    }
    loadHistory()
  }, [isOpen, patientData?.id])

  useEffect(() => {
    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN'

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setIsListening(false)
      handleVoiceSubmit(transcript)
    }
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setError('Microphone permission denied. Please allow microphone access to use voice input.')
      }
    }
    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
    }
  }, [language])

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop()
      }
      stopSpeaking()
    }
  }, [isOpen])
  const withTimeout = (promise, ms) => {
    return Promise.race([
      promise,
      new Promise((resolve) => setTimeout(() => resolve(null), ms))
    ])
  }

  const buildPatientContext = async () => {
    if (!patientData) return { context: 'No patient data currently loaded.', grounding: { attempted: 0, succeeded: 0, sources: [] } }

    const lines = []
    lines.push(`Patient: ${patientData.name || 'Unknown'}, Age ${patientData.age || 'N/A'}, Gender ${patientData.gender || 'N/A'}`)
    lines.push(`Ward: ${patientData.ward || 'Not assigned'}, Bed: ${patientData.bed || 'Not assigned'}, Room: ${patientData.room || 'Not assigned'}`)
    lines.push(`Admitted: ${patientData.admitDate || 'N/A'}`)
    lines.push(`Primary problem noted at admission: ${patientData.problem || 'Not specified'}`)

    if (assignedDoctor) {
      lines.push(`Assigned Doctor: ${assignedDoctor.name} (${assignedDoctor.specialization || 'General'})`)
    } else {
      lines.push('Assigned Doctor: none assigned yet')
    }

    const diagnoses = clinicalData?.diagnosis || []
    if (diagnoses.length > 0) {
      lines.push('Recorded diagnoses: ' + diagnoses.map(d => d.diagnosis).join(', '))
    } else {
      lines.push('Recorded diagnoses: none recorded yet')
    }

    const medicines = clinicalData?.medicines || []
    if (medicines.length > 0) {
      lines.push('Current medicines: ' + medicines.map(m => `${m.name} ${m.dosage} (${m.frequency}, ${m.route})`).join('; '))
    } else {
      lines.push('Current medicines: none recorded yet')
    }

    const vitals = clinicalData?.vitals || []
    if (vitals.length > 0) {
      const latest = vitals[vitals.length - 1]
      lines.push(`Most recent vitals: BP ${latest.bp || '--'}, Pulse ${latest.pulse || '--'}, Temp ${latest.temperature || '--'}°${latest.temperatureUnit || 'C'}, SpO2 ${latest.oxygenSaturation || '--'}%`)
    } else {
      lines.push('Vitals: none recorded yet')
    }

    const vitalFlags = analyzeVitals(vitals)
    if (vitalFlags.length > 0) {
      lines.push('VITALS ANALYSIS — FLAGGED FOR FAMILY AWARENESS: ' + vitalFlags.join(' | '))
    } else if (vitals.length > 0) {
      lines.push('VITALS ANALYSIS: latest vitals are within typical normal ranges')
    }

    lines.push(`Billing: Total Bill ₹${totalBill || 0}, Deposits ₹${totalDeposits || 0}, Balance ₹${balance || 0}`)

    const billItems = billingData?.items || []
    if (billItems.length > 0) {
      lines.push('Recent bill items: ' + billItems.slice(-5).map(i => `${i.description} - ₹${i.amount}`).join('; '))
    }

    const consentEvents = clinicalData?.consentEvents || []
    const pendingConsents = consentEvents.filter(c => c.status === 'pending')
    if (pendingConsents.length > 0) {
      lines.push(`Pending consent requests: ${pendingConsents.map(c => c.type).join(', ')} — awaiting family response`)
    }

    lines.push(`Discharge status: ${dischargeData?.discharged ? 'Discharged on ' + (dischargeData.actualTime || 'unknown date') : 'Currently admitted'}`)
    if (dischargeData?.estimatedTime && !dischargeData.discharged) {
      lines.push(`Estimated discharge time: ${dischargeData.estimatedTime}`)
    }

    lines.push(`Reports on file: ${(reports || []).length} (${(reports || []).map(r => r.name).join(', ') || 'none'})`)
    lines.push(`Prescriptions on file: ${(prescriptions || []).length} (${(prescriptions || []).map(p => p.name).join(', ') || 'none'})`)
    lines.push('IMPORTANT: You do NOT have access to the actual contents of uploaded report or prescription files (no text/values from inside the PDF/image are available to you) — only their names, types, and upload dates. Never claim to have read or analyzed what is written inside a report file.')

    // Tracks which retrieval sources actually returned usable data for this response — a real,
    // observable "grounding rate" metric, not a fabricated accuracy score.
    const groundingSources = []

    try {
      const referenceLines = []
      const fetchPromises = []

      if (diagnoses.length > 0) {
        fetchPromises.push(
          withTimeout(fetchConditionInfo(diagnoses[0].diagnosis), 4000).then((conditionInfo) => {
            groundingSources.push({ name: 'MedlinePlus', status: conditionInfo ? 'ok' : 'unavailable' })
            if (conditionInfo) {
              referenceLines.push(`Public reference on "${conditionInfo.title}" (source: ${conditionInfo.source}): ${conditionInfo.summary.slice(0, 700)}`)
            }
          })
        )
        fetchPromises.push(
          withTimeout(fetchICD11Info(diagnoses[0].diagnosis), 4000).then((icdInfo) => {
            groundingSources.push({ name: 'WHO ICD-11', status: icdInfo ? 'ok' : 'unavailable' })
            if (icdInfo) {
              const defPart = icdInfo.definition ? ` — ${icdInfo.definition.slice(0, 500)}` : ''
              const codePart = icdInfo.code ? ` (code ${icdInfo.code})` : ''
              referenceLines.push(`WHO ICD-11 classification for "${diagnoses[0].diagnosis}": ${icdInfo.title}${codePart}${defPart} (source: ${icdInfo.source})`)
            }
          })
        )
      }
      if (medicines.length > 0) {
        fetchPromises.push(
          withTimeout(fetchMedicineInfo(medicines[0].name), 4000).then((medicineInfo) => {
            const hasUsableInfo = !!(medicineInfo && (medicineInfo.purpose || medicineInfo.indications || medicineInfo.warnings))
            groundingSources.push({ name: 'openFDA', status: hasUsableInfo ? 'ok' : 'unavailable' })
            if (medicineInfo) {
              const parts = []
              if (medicineInfo.purpose) parts.push(`Purpose: ${medicineInfo.purpose}`)
              if (medicineInfo.indications) parts.push(`Used for: ${medicineInfo.indications.slice(0, 300)}`)
              if (medicineInfo.warnings) parts.push(`Warnings: ${medicineInfo.warnings.slice(0, 300)}`)
              if (parts.length > 0) {
                referenceLines.push(`Public FDA reference on "${medicines[0].name}" (source: ${medicineInfo.source}): ${parts.join(' | ')}`)
              }
            }
          })
        )
      }
      fetchPromises.push(
        withTimeout(fetchIndiaHealthContext(), 4000).then((healthContext) => {
          groundingSources.push({ name: 'WHO GHO', status: healthContext ? 'ok' : 'unavailable' })
          if (healthContext) {
            const stats = healthContext.indicators.map((i) => `${i.label}: ${i.value} ${i.unit} (${i.year})`).join('; ')
            referenceLines.push(`India national health context (source: ${healthContext.source}): ${stats}`)
          }
        })
      )

      await Promise.all(fetchPromises)

      if (referenceLines.length > 0) {
        lines.push('PUBLIC MEDICAL REFERENCE (general information only, from independent public sources — NOT a validation of this patient\'s diagnosis or treatment):')
        lines.push(...referenceLines)
      }
    } catch (err) {
      console.error('Public medical reference lookup failed:', err)
    }

    return {
      context: lines.join('\n'),
      grounding: {
        attempted: groundingSources.length,
        succeeded: groundingSources.filter(s => s.status === 'ok').length,
        sources: groundingSources
      }
    }
  }
    const saveMessageToHistory = async (role, content, actions = [], metrics = null) => {
    if (!patientData?.id) return null
    try {
      const docRef = await addDoc(collection(db, 'patients', patientData.id, 'chatHistory'), {
        role,
        content,
        actions: actions || [],
        timestamp: new Date().toISOString(),
        ...(metrics || {})
      })
      return docRef
    } catch (err) {
      console.error('Error saving chat message:', err)
      return null
    }
  }

  // Records a 👍/👎 rating for one assistant response — the same core evaluation signal real LLM
  // products collect to measure response quality against real usage.
  const handleFeedback = async (messageLocalId, docId, rating) => {
    setMessages(prev => prev.map(m => m.id === messageLocalId ? { ...m, feedback: rating } : m))
    if (!docId || !patientData?.id) return
    try {
      await updateDoc(doc(db, 'patients', patientData.id, 'chatHistory', docId), { feedback: rating })
    } catch (err) {
      console.error('Error saving feedback:', err)
    }
  }
    const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const cleanedForSpeech = text.replace(/[*_#`]/g, '').replace(/\n+/g, '. ')
    const utterance = new SpeechSynthesisUtterance(cleanedForSpeech)
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
    utterance.rate = 0.95
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const handleVoiceSubmit = async (voiceText) => {
    if (!voiceText || !voiceText.trim() || loading) return

    const userMessage = voiceText.trim()
    setError('')

    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      content: userMessage
    }])
    saveMessageToHistory('user', userMessage)

    setLoading(true)
    setTypingIndicator(true)

    try {
      const requestStartedAt = Date.now()
      const { systemPrompt, grounding } = await getSystemPrompt()
      const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`

      const response = await callGemini(fullPrompt)
      const responseTimeMs = Date.now() - requestStartedAt

      if (!response) {
        setError('Sorry, I couldn\'t process your request. Please try again.')
        setLoading(false)
        setTypingIndicator(false)
        return
      }

      const { cleanText, actions } = parseActions(response)
      const localId = Date.now() + 1

      setMessages(prev => [...prev, {
        id: localId,
        docId: null,
        role: 'assistant',
        content: cleanText,
        actions: actions,
        responseTimeMs,
        grounding,
        feedback: null
      }])
      saveMessageToHistory('assistant', cleanText, actions, { responseTimeMs, grounding }).then(docRef => {
        if (docRef) setMessages(prev => prev.map(m => m.id === localId ? { ...m, docId: docRef.id } : m))
      })

      // Voice-in gets voice-out regardless of the reply-mute toggle — typed questions
      // still respect voiceReplyEnabled further down in handleSubmit, unchanged.
      speakText(cleanText)
    } catch (error) {
      console.error('SandeshGPT voice error:', error)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      setTypingIndicator(false)
    }
  }

  const toggleListening = () => {
    if (!SpeechRecognitionAPI || !recognitionRef.current) {
      setError('Voice input is not supported in this browser. Please try Chrome or Edge.')
      return
    }
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      stopSpeaking()
      setError('')
      setIsListening(true)
      try {
        recognitionRef.current.start()
      } catch (err) {
        console.error('Error starting recognition:', err)
        setIsListening(false)
      }
    }
  }

  // Turns this patient's own past 👍/👎 ratings into concrete guidance for the next response — the
  // real, achievable version of "learning from feedback": no model retraining (not possible against
  // Gemini from this app), just genuinely conditioning each new answer on what this same family has
  // already told us worked or didn't. Returns '' when nothing has been rated yet, so a fresh
  // conversation with no ratings gets byte-identical prompt behavior to before this existed.
  const buildFeedbackGuidance = () => {
    const rated = []
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      if (msg.role === 'assistant' && (msg.feedback === 'up' || msg.feedback === 'down')) {
        const priorUser = messages.slice(0, i).reverse().find(m => m.role === 'user')
        if (priorUser) {
          rated.push({
            rating: msg.feedback,
            question: (priorUser.content || '').slice(0, 200),
            answer: (msg.content || '').slice(0, 300)
          })
        }
      }
    }

    const upvoted = rated.filter(r => r.rating === 'up').slice(-2)
    const downvoted = rated.filter(r => r.rating === 'down').slice(-2)
    if (upvoted.length === 0 && downvoted.length === 0) return ''

    const lines = [`FEEDBACK FROM THIS FAMILY'S OWN PAST CONVERSATION (real 👍/👎 signal — apply it, don't just acknowledge it):`]
    upvoted.forEach((ex) => {
      lines.push(`- They marked this response HELPFUL — match this style and depth when the topic is similar:\n  Q: "${ex.question}"\n  A: "${ex.answer}"`)
    })
    downvoted.forEach((ex) => {
      lines.push(`- They marked this response NOT HELPFUL — do not repeat whatever made it unhelpful (too vague, too long, missed the actual question, etc.):\n  Q: "${ex.question}"\n  A: "${ex.answer}"`)
    })
    return lines.join('\n')
  }

  const getSystemPrompt = async () => {
    const languageInstruction = language === 'hi'
      ? 'IMPORTANT: Respond ONLY in Hindi (Devanagari script). Keep the tone warm and simple, suitable for a worried family member. Do not mix in English except for proper nouns like "AarogyaSandesh" or "SandeshGPT".\n\n'
      : ''

    const { context: patientContext, grounding } = await buildPatientContext()
    const feedbackGuidance = buildFeedbackGuidance()

    const systemPrompt = `${languageInstruction}You are SandeshGPT, an AI assistant for AarogyaSandesh - a healthcare platform that connects hospitals with patient families.

ABOUT AAROGYASANDESH:
- Real-time patient tracking and updates
- Digital consent management with OTP
- Bill anomaly detection against CGHS benchmark rates
- Insurance policy and claim management
- Doctor management and visiting hours
- Reports and prescriptions management
- Staff and Family portals

${SITE_KNOWLEDGE}

AUTHORIZED PATIENT CONTEXT (this is the ONLY patient data you are allowed to reference — it belongs to the family member you are currently speaking with, and no other patient's data is ever available to you):
${patientContext}
${feedbackGuidance ? '\n' + feedbackGuidance + '\n' : ''}
CAPABILITIES:
1. Help users navigate the Family Portal — use the exact tab and button names from the site map above, never guess
2. Explain features like: timeline, clinical data, billing, bill check, hospital info, discharge, reports, insurance, diagnosis info, india open data, hospital directory & PM-JAY empanelment
3. Answer questions about THIS patient using ONLY the authorized context above
4. Provide general healthcare information (not specific to this patient) when relevant
5. Assist with common issues
6. When asked about air quality, blood supply, or health infrastructure statistics for India/a state, explain that this is live in the India Open Data tab (CPCB, e-RaktKosh, National Health Mission sources) and offer to take them there — you do not have this dataset loaded directly into this conversation since it is large and general-purpose, not patient-specific
7. When asked about PM-JAY/Ayushman Bharat empanelled hospitals, a hospital search by state/district, or whether a hospital is covered by a government scheme, explain that this is live in the Insurance tab → Hospital Directory sub-tab (National Hospital Directory + Rajya Sabha PM-JAY empanelment data, via data.gov.in) and offer to take them to the Insurance tab — like the India Open Data tab, this dataset is not loaded directly into this conversation since it requires a state/district to search and is not specific to this patient

GROUNDING RULE (critical — do not break this):
- Only state facts about the patient that appear in the AUTHORIZED PATIENT CONTEXT above.
- If asked something about the patient that is not in that context (e.g. a medicine not listed, a diagnosis not recorded, an instruction to stop/change treatment), do NOT guess or invent an answer. Clearly say the available records don't show that, and suggest confirming with the treating doctor or hospital staff.
- Never suggest changing, stopping, or adjusting any medication or treatment yourself — always redirect that specific decision to the treating doctor.
- Example of a correct refusal: "The available records don't show any instruction about that. Please confirm with the treating doctor before making any changes."

PUBLIC MEDICAL REFERENCE — SIMPLE EXPLANATIONS (when the AUTHORIZED PATIENT CONTEXT includes a "PUBLIC MEDICAL REFERENCE" section):
- When the family asks what a diagnosis or medicine means, or asks you to explain it simply, use that section to give a clear, plain-language explanation — this is exactly what it's for.
- Always make clear this is general public information (name the source, e.g. MedlinePlus, WHO ICD-11, openFDA, or WHO Global Health Observatory) and NOT a confirmation, validation, or clinical opinion about this specific patient's case.
- If the section includes a WHO ICD-11 classification, you may mention the official code (e.g. "WHO classifies this as CA40.Z") alongside the plain-language explanation — this is the same information shown in the Diagnosis Info tab.
- If the section includes "India national health context", use it only as background (e.g. national average life expectancy) — never imply it says anything about this specific patient.
- If no public reference data is present for what they're asking about, say so honestly rather than inventing an explanation, and point them to the Diagnosis Info tab in the Family Portal or their doctor.
- Never use this section to suggest changing, stopping, or adjusting treatment — same rule as above.

SCOPE RESTRICTION (critical — do not break this):
You are a healthcare-platform assistant for AarogyaSandesh ONLY. You must NOT answer requests that are unrelated to this platform, this patient's care, or general healthcare information — this includes writing code, solving programming problems, general trivia, entertainment requests, or any other off-topic task. If asked something off-topic, politely decline and redirect: explain that you're focused on helping with AarogyaSandesh and this patient's care, and ask what you can help them with on the platform.

PROACTIVE HEALTH AWARENESS (be thorough, not brief):
When the AUTHORIZED PATIENT CONTEXT above includes a "VITALS ANALYSIS — FLAGGED FOR FAMILY AWARENESS" line, proactively and thoroughly explain each flagged vital whenever the user asks about the patient's condition, vitals, reports, or how the patient is doing — even if they didn't ask about vitals specifically. For each flagged vital, cover: (1) the actual reading, (2) the typical normal range for comparison, and (3) a plain-language, non-alarming explanation of what this kind of reading can generally indicate — write 2-3 full sentences per flagged vital, do NOT compress it into a single short line. Keep the tone calm and reassuring throughout. Always end vitals-related answers by recommending the family confirm details with the treating doctor or nursing staff. NEVER suggest a medication, dosage, or treatment change yourself — you may only inform, never prescribe or advise a specific medical action beyond "consult the doctor/staff."
When discussing uploaded reports or prescriptions, only reference their name, type, and upload date — never claim to know or summarize what is written inside the file itself.

NAVIGATION ACTIONS:
When your answer would benefit from taking the user directly to a specific tab in the Family Portal, append exactly one tag at the very end of your response, on its own line, in this exact format:
[[ACTION:tabid:Button Label]]

Valid tabid values (use exactly these, lowercase): overview, timeline, clinical, billing, anomaly, hospital, insurance, discharge, reports, diagnosisinfo, indiaopendata

Example: if the user asks where to send a note to staff, end your response with:
[[ACTION:reports:Open Reports Tab]]

Only include this tag when a specific tab genuinely helps — not for every message. Never mention the tag itself in your visible answer; it will be turned into a button automatically.

INSTRUCTIONS:
1. Be helpful, professional, and friendly
2. Keep responses concise but informative
3. If you don't know something, say so honestly
4. For healthcare questions, include a disclaimer
5. Use emojis occasionally for friendliness
6. Format responses with bullet points when helpful
7. When answering navigation questions, always name the exact tab and button from the site map above

DISCLAIMER: "I am an AI assistant. For medical advice, always consult qualified healthcare professionals. For platform issues, contact support at aarogyasandesh.support@gmail.com"

Always include this disclaimer at the end of healthcare-related responses.${language === 'hi' ? ' (Write the disclaimer in Hindi too.)' : ''}`

    return { systemPrompt, grounding }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setError('')

    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      content: userMessage
    }])
        saveMessageToHistory('user', userMessage)

    setLoading(true)
    setTypingIndicator(true)

    try {
      const requestStartedAt = Date.now()
      const { systemPrompt, grounding } = await getSystemPrompt()
      const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`

      const response = await callGemini(fullPrompt)
      const responseTimeMs = Date.now() - requestStartedAt

      if (!response) {
        setError('Sorry, I couldn\'t process your request. Please try again.')
        setLoading(false)
        setTypingIndicator(false)
        return
      }

      const { cleanText, actions } = parseActions(response)
      const localId = Date.now() + 1

      setMessages(prev => [...prev, {
        id: localId,
        docId: null,
        role: 'assistant',
        content: cleanText,
        actions: actions,
        responseTimeMs,
        grounding,
        feedback: null
      }])
      saveMessageToHistory('assistant', cleanText, actions, { responseTimeMs, grounding }).then(docRef => {
        if (docRef) setMessages(prev => prev.map(m => m.id === localId ? { ...m, docId: docRef.id } : m))
      })
      if (voiceReplyEnabled) {
        speakText(cleanText)
      }
    } catch (error) {
      console.error('SandeshGPT error:', error)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      setTypingIndicator(false)
    }
  }

    const clearChat = async () => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: '👋 Namaste! I\'m SandeshGPT, your AI assistant for AarogyaSandesh.\n\nI can help you with:\n• 📋 Using the Family Portal\n• 🏥 Healthcare information\n• 💡 General questions\n• 🔍 Finding features\n\nHow can I assist you today?'
      }
    ])
    if (patientData?.id) {
      try {
        const historyRef = collection(db, 'patients', patientData.id, 'chatHistory')
        const snapshot = await getDocs(historyRef)
        await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)))
        hasLoadedHistoryRef.current = false
      } catch (err) {
        console.error('Error clearing chat history:', err)
      }
    }
  }

  const quickQuestions = [
    { text: 'How do I view my bill?', icon: CreditCard },
    { text: 'How to upload a prescription?', icon: FileText },
    { text: 'What is the Bill Check feature?', icon: Shield },
    { text: 'How to manage insurance?', icon: Shield },
    { text: 'How to send a note to staff?', icon: MessageSquare }
  ]

  const formatTime = () => {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.92 }}
        transition={{ duration: 0.35, type: 'spring', damping: 22 }}
        className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[92vw] rounded-[28px] overflow-hidden shadow-[0_20px_70px_-15px_rgba(15,118,110,0.45)]"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.97), rgba(240,253,250,0.97))',
          border: '1px solid transparent',
          backgroundImage: `linear-gradient(rgba(255,255,255,0.97), rgba(240,253,250,0.97)), linear-gradient(135deg, #0d9488, #6366f1, #10b981)`,
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box'
        }}
      >
        {/* Header */}
        <div className="relative p-4 overflow-hidden" style={{ background: 'linear-gradient(120deg, #0f766e 0%, #4338ca 60%, #059669 100%)' }}>
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-6 w-28 h-28 bg-forest-300/20 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 flex items-center justify-center">
                <motion.span
                  className="absolute inset-0 rounded-full bg-forest-300/40"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="relative w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm tracking-wide">SandeshGPT</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-forest-300 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-white/80 font-medium">Grounded • Consent-Aware</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setVoiceReplyEnabled(prev => {
                    const next = !prev
                    if (!next) stopSpeaking()
                    return next
                  })
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                title={voiceReplyEnabled ? 'Voice replies: ON' : 'Voice replies: OFF'}
              >
                {voiceReplyEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Body */}
        {!isMinimized && (
          <>
            <div className="h-[340px] overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-forest-50/30">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-forest-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-forest-500 to-forest-600 text-white rounded-2xl rounded-br-md shadow-md shadow-forest-500/20'
                        : 'bg-white text-gray-700 rounded-2xl rounded-bl-md shadow-sm border border-forest-100/60'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2.5 flex flex-col gap-1.5">
                        {msg.actions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (onNavigate) onNavigate(action.tab)
                              onClose()
                            }}
                            className="group flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-forest-50 to-indigo-50 hover:from-forest-100 hover:to-indigo-100 text-forest-800 rounded-xl text-xs font-semibold transition-all border border-forest-200/70"
                          >
                            <span className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3" />
                              {action.label}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      {msg.role === 'assistant' && msg.id !== 1 ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleFeedback(msg.id, msg.docId, msg.feedback === 'up' ? null : 'up')}
                            title="Helpful"
                            className={`p-1 rounded-md transition-colors ${msg.feedback === 'up' ? 'text-forest-700 bg-forest-50' : 'text-gray-300 hover:text-forest-600'}`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, msg.docId, msg.feedback === 'down' ? null : 'down')}
                            title="Not helpful"
                            className={`p-1 rounded-md transition-colors ${msg.feedback === 'down' ? 'text-red-500 bg-red-50' : 'text-gray-300 hover:text-red-400'}`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      ) : <span />}
                      <span className={`text-[10px] ${msg.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                        {formatTime()}
                      </span>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
              {typingIndicator && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-end gap-2 justify-start"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-forest-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-white border border-forest-100/60 p-3 rounded-2xl rounded-bl-md shadow-sm">
                    <div className="flex gap-1.5 items-center">
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full bg-forest-500"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: 0 }}
                      />
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: 0.15 }}
                      />
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full bg-forest-600"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: 0.3 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {isListening && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center gap-2 text-red-600 text-xs font-medium">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Listening... speak now
              </div>
            )}
            {isSpeaking && (
              <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between gap-2 text-indigo-600 text-xs font-medium">
                <span className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                  Speaking response...
                </span>
                <button onClick={stopSpeaking} className="underline hover:text-indigo-800">Stop</button>
              </div>
            )}

            {/* Quick Questions */}
            <div className="p-2.5 flex flex-wrap gap-1.5 border-t border-forest-100/60 bg-white/60">
              {quickQuestions.map((q, i) => {
                const Icon = q.icon
                return (
                  <button
                    key={i}
                    onClick={() => setInput(q.text)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-forest-50/80 to-indigo-50/80 rounded-lg text-[11px] font-medium text-gray-600 hover:text-forest-800 hover:from-forest-100 hover:to-indigo-100 transition-all border border-forest-100/70"
                  >
                    <Icon className="w-3 h-3" />
                    {q.text}
                  </button>
                )
              })}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-forest-100/60 flex gap-2 bg-white/70">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask SandeshGPT anything..."
                className="flex-1 px-4 py-2.5 bg-white border border-forest-200/70 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-400 focus:border-transparent transition-all text-sm shadow-sm"
                disabled={loading}
              />
              {SpeechRecognitionAPI && (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={loading}
                  title={isListening ? 'Listening... click to stop' : 'Click to speak'}
                  className={`px-3 py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center ${
                    isListening
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                      : 'bg-white border border-forest-200/70 text-forest-700 hover:bg-forest-50'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-gradient-to-br from-forest-500 via-indigo-500 to-forest-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            {showQualityPanel && (
              <div className="px-4 py-3 border-t border-forest-100/60 bg-white/80 text-xs">
                <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-forest-700" />
                  Response Quality — this conversation
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-forest-50/70 rounded-lg py-2">
                    <p className="font-bold text-gray-900">
                      {qualityStats.satisfactionRate !== null ? `${qualityStats.satisfactionRate}%` : '—'}
                    </p>
                    <p className="text-[10px] text-gray-500">Helpful ({qualityStats.ratedCount} rated)</p>
                  </div>
                  <div className="bg-indigo-50/70 rounded-lg py-2">
                    <p className="font-bold text-gray-900">
                      {qualityStats.avgResponseTimeMs !== null ? `${(qualityStats.avgResponseTimeMs / 1000).toFixed(1)}s` : '—'}
                    </p>
                    <p className="text-[10px] text-gray-500">Avg response time</p>
                  </div>
                  <div className="bg-forest-50/70 rounded-lg py-2">
                    <p className="font-bold text-gray-900">
                      {qualityStats.groundingRate !== null ? `${qualityStats.groundingRate}%` : '—'}
                    </p>
                    <p className="text-[10px] text-gray-500">Grounding rate</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                  "Helpful" comes from your own 👍/👎 on each reply below. "Grounding rate" is how often the live
                  medical/health reference sources (MedlinePlus, WHO ICD-11, openFDA, WHO GHO) actually returned
                  usable data for a response — not a claimed accuracy score.
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="px-3 py-2 text-center border-t border-forest-100/60 bg-gradient-to-r from-forest-50/50 to-indigo-50/50 flex items-center justify-between">
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Powered by AarogyaSandesh
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowQualityPanel(!showQualityPanel)}
                  className={`text-[10px] transition-colors flex items-center gap-1 ${showQualityPanel ? 'text-forest-700' : 'text-gray-400 hover:text-forest-700'}`}
                >
                  <BarChart3 className="w-3 h-3" />
                  Quality
                </button>
                <button
                  onClick={clearChat}
                  className="text-[10px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Chat
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default SandeshGPT