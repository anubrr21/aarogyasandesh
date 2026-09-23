import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, Send, AlertCircle, Loader2, FileText, Shield, Sparkles } from 'lucide-react'
import { callGemini } from '../../utils/gemini'
import useInsurance from '../../hooks/useInsurance'

const InsuranceAIAssistant = () => {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hello! I\'m your AI Insurance Assistant powered by AarogyaSandesh.\n\nI can help you understand your insurance coverage. Ask me questions like:\n\n• "Is hospitalization covered?"\n• "What is my sum insured?"\n• "What documents are required for reimbursement?"\n• "Are there room-rent limits?"\n• "What exclusions are mentioned?"\n\n📌 I answer ONLY based on your uploaded policy document.'
    }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { policies } = useInsurance()

  const getPolicyContext = () => {
    const activePolicies = policies.filter(p => {
      if (!p.expiryDate) return true
      return new Date(p.expiryDate) > new Date()
    })
    
    if (activePolicies.length === 0) {
      return 'No active insurance policies found. Please add a policy first.'
    }
    
    const policyInfo = activePolicies.map(p => `
Provider: ${p.provider || 'N/A'}
Policy Type: ${p.policyType || 'N/A'}
Sum Insured: ₹${p.sumInsured?.toLocaleString() || 'N/A'}
Start Date: ${p.startDate ? new Date(p.startDate).toLocaleDateString() : 'N/A'}
Expiry Date: ${p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : 'N/A'}
TPA: ${p.tpaName || 'N/A'}
${p.memberName ? `Member: ${p.memberName}` : ''}
    `).join('\n---\n')

    return policyInfo
  }

  const generatePrompt = (userQuestion, policyContext) => {
    return `
You are an AI Insurance Assistant for AarogyaSandesh, a healthcare platform.

**IMPORTANT RULES:**
1. ONLY answer based on the policy information provided below.
2. If the user asks something NOT in the policy, say: "I couldn't find this information in your uploaded policy. Please check your policy document or contact your insurance provider."
3. NEVER guarantee coverage - always say "Based on your policy information..."
4. Include a disclaimer at the end of every response.
5. Be helpful, professional, and concise.
6. If the user asks about specific numbers (coverage amount, room rent limit, etc.), provide the exact number from the policy if available.

**USER'S POLICY INFORMATION:**
${policyContext}

**USER'S QUESTION:**
${userQuestion}

**INSTRUCTIONS:**
- If the policy has the information, answer with specific details.
- If the policy doesn't have the information, clearly say it's not found.
- Keep responses helpful and actionable.
- Format the response with bullet points if needed.
- End with: "⚠️ This is an AI-generated analysis based on your uploaded policy. Please contact your insurance provider/TPA for final confirmation."

**YOUR RESPONSE:`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!question.trim()) return

    const userMessage = question.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setQuestion('')
    setLoading(true)
    setError('')

    try {
      const policyContext = getPolicyContext()
      const prompt = generatePrompt(userMessage, policyContext)
      
      const geminiResponse = await callGemini(prompt)
      
      if (!geminiResponse) {
        setError('Sorry, I couldn\'t process your request. Please try again later.')
        setLoading(false)
        return
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: geminiResponse 
      }])
    } catch (error) {
      console.error('AI Assistant error:', error)
      setError('Failed to get response. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const quickQuestions = [
    'Is hospitalization covered?',
    'What is my sum insured?',
    'What documents are required for reimbursement?',
    'Are there room-rent limits?',
    'What exclusions are mentioned in my policy?'
  ]

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: '👋 Hello! I\'m your AI Insurance Assistant powered by AarogyaSandesh.\n\nI can help you understand your insurance coverage. Ask me questions like:\n\n• "Is hospitalization covered?"\n• "What is my sum insured?"\n• "What documents are required for reimbursement?"\n• "Are there room-rent limits?"\n• "What exclusions are mentioned?"\n\n📌 I answer ONLY based on your uploaded policy document.'
      }
    ])
  }

  return (
    <div className="bg-white/50 rounded-xl border border-gray-200/50 overflow-hidden">
      <div className="p-4 border-b border-gray-200/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900">AI Insurance Assistant</h4>
              <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded text-[10px] font-medium border border-violet-200 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                AarogyaSandesh
              </span>
            </div>
            <p className="text-xs text-gray-400">Ask questions about your insurance coverage</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Clear Chat
        </button>
      </div>

      <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-xl ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-forest-500 to-forest-600 text-white'
                  : 'bg-white border border-gray-200/50 text-gray-700 shadow-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-xl border border-gray-200/50 shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
              <span className="text-sm text-gray-400">Thinking...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="p-2 flex flex-wrap gap-1.5 border-t border-gray-200/50 bg-white/30">
        {quickQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => setQuestion(q)}
            className="px-3 py-1 bg-gray-50 rounded-lg text-xs text-gray-600 hover:bg-violet-50 hover:text-violet-600 transition-colors border border-gray-200/50"
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200/50 flex gap-2 bg-white/30">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about your insurance..."
          className="flex-1 px-4 py-2 bg-white/90 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

      <div className="p-2 text-center border-t border-gray-200/50 bg-gray-50/30">
        <p className="text-[10px] text-gray-400">
          ⚠️ AI responses are for informational purposes only. 
          Always verify with your insurance provider/TPA.
        </p>
      </div>
    </div>
  )
}

export default InsuranceAIAssistant