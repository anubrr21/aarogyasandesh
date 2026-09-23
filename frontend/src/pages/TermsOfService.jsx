import { motion } from 'framer-motion'
import { FileText, CheckCircle, AlertCircle, Shield, Users, Heart, Clock, Scale, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const TermsOfService = () => {
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
            <FileText className="w-6 h-6 text-forest-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
            <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
          <div className="bg-forest-50/50 p-4 rounded-xl border border-forest-200/50">
            <p className="text-sm text-forest-800">
              By using <strong>AarogyaSandesh</strong>, you agree to these Terms of Service. Please read them carefully.
            </p>
          </div>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-forest-500" />
              Acceptance of Terms
            </h2>
            <p>By accessing or using AarogyaSandesh, you agree to be bound by these Terms of Service. If you do not agree to all terms, please do not use the platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-forest-500" />
              User Accounts
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must be 18 years or older to create an account</li>
              <li>You are responsible for maintaining account security</li>
              <li>You must provide accurate and complete information</li>
              <li>You may not share your account credentials with others</li>
              <li>You are responsible for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Heart className="w-4 h-4 text-forest-500" />
              Acceptable Use
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the platform only for its intended purpose</li>
              <li>Do not share sensitive health information publicly</li>
              <li>Do not attempt to access unauthorized data</li>
              <li>Do not upload malicious content</li>
              <li>Respect the privacy of other users</li>
              <li>Do not use automated systems to access the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-forest-500" />
              Medical Disclaimer
            </h2>
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/50">
              <p className="text-sm text-amber-700">
                <strong>IMPORTANT:</strong> AarogyaSandesh is a communication and information management platform.
                It does NOT provide medical advice, diagnosis, or treatment.
                Always consult qualified healthcare professionals for medical decisions.
              </p>
            </div>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Information provided is for informational purposes only</li>
              <li>Do not ignore medical advice based on platform information</li>
              <li>Emergency situations should be handled through emergency services</li>
              <li>The platform does not replace doctor-patient relationships</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-forest-500" />
              Limitations of Liability
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>AarogyaSandesh is provided "as is" without warranties</li>
              <li>We are not liable for damages resulting from platform use</li>
              <li>We do not guarantee uninterrupted service</li>
              <li>We are not responsible for third-party content</li>
              <li>Your use is at your own risk</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-forest-500" />
              Termination
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>We may suspend or terminate access for policy violations</li>
              <li>You may delete your account at any time</li>
              <li>Termination does not waive rights accrued</li>
              <li>Certain terms survive termination</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-forest-500" />
              Changes to Terms
            </h2>
            <p>We may update these terms from time to time. Significant changes will be communicated through:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email notification to registered users</li>
              <li>Platform notifications</li>
              <li>Updated date at the top of the page</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-forest-500" />
              Contact Information
            </h2>
            <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200/50">
              <p className="text-sm">📧 Email: aarogyasandesh.support@gmail.com</p>
              <p className="text-sm">📞 Phone: +91 8977039397</p>
            </div>
          </section>

          <div className="bg-forest-50/50 p-4 rounded-xl border border-forest-200/50">
            <p className="text-sm text-forest-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              By using AarogyaSandesh, you acknowledge that you have read, understood, and agree to these Terms of Service.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default TermsOfService