import { motion } from 'framer-motion'
import { Shield, CheckCircle, Lock, Eye, Database, UserCheck, Mail, FileText, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const PrivacyPolicy = () => {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-500 hover:text-forest-700 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-forest-50 rounded-xl border border-forest-200/50">
            <Shield className="w-6 h-6 text-forest-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
          <div className="bg-forest-50/50 p-4 rounded-xl border border-forest-200/50">
            <p className="text-sm text-forest-800">
              <strong>AarogyaSandesh</strong> is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal information.
            </p>
          </div>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-forest-500" />
              Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Personal Information:</strong> Name, email address, phone number, and family member details.</li>
              <li><strong>Health Information:</strong> Medical diagnoses, treatment history, prescriptions, and health records.</li>
              <li><strong>Insurance Information:</strong> Policy details, claims history, and insurance documents.</li>
              <li><strong>Usage Data:</strong> How you interact with the platform, including login times and features used.</li>
              <li><strong>Device Information:</strong> Browser type, IP address, and device identifiers for security purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-forest-500" />
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and maintain the AarogyaSandesh platform</li>
              <li>To facilitate communication between families and hospital staff</li>
              <li>To manage insurance policies and claims</li>
              <li>To send notifications and updates about patient care</li>
              <li>To improve our services and user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-forest-500" />
              Data Security
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>All data is encrypted in transit and at rest</li>
              <li>Secure Firebase authentication and Firestore security rules</li>
              <li>Role-based access control for different user types</li>
              <li>Regular security audits and updates</li>
              <li>Strictly limited employee access to patient data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-forest-500" />
              Your Rights
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access and review your personal information</li>
              <li>Request corrections to inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Opt out of non-essential communications</li>
              <li>Receive notifications about privacy policy changes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-forest-500" />
              Data Sharing
            </h2>
            <p>We do not sell or share your personal information with third parties except:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>With hospital staff directly involved in patient care</li>
              <li>With insurance providers for claim processing (with your consent)</li>
              <li>As required by law or legal obligations</li>
              <li>With your explicit consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-forest-500" />
              Contact Us
            </h2>
            <p>If you have any questions about this Privacy Policy, please contact us:</p>
            <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200/50">
              <p className="text-sm">📧 Email: aarogyasandesh.support@gmail.com</p>
              <p className="text-sm">📞 Phone: +91 8977039397</p>
            </div>
          </section>

          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/50">
            <p className="text-sm text-amber-700">
              <strong>Note:</strong> This policy is subject to change. We will notify users of any significant updates via email or platform notification.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default PrivacyPolicy