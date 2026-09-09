import { useState } from 'react'
import { Bot } from 'lucide-react'
import { motion } from 'framer-motion'
import SandeshGPT from './SandeshGPT'

const ChatbotButton = ({
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
  const [isOpen, setIsOpen] = useState(false)
  const language = localStorage.getItem('language') || 'en'

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <Bot className="w-6 h-6" />
      </motion.button>

      <SandeshGPT
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        language={language}
        patientData={patientData}
        clinicalData={clinicalData}
        billingData={billingData}
        reports={reports}
        prescriptions={prescriptions}
        dischargeData={dischargeData}
        assignedDoctor={assignedDoctor}
        totalBill={totalBill}
        totalDeposits={totalDeposits}
        balance={balance}
        onNavigate={onNavigate}
      />
    </>
  )
}

export default ChatbotButton