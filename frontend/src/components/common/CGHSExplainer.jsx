import { useState } from 'react'
import { ChevronDown, ChevronUp, Shield, Building, Home, Award, Info, CheckCircle } from 'lucide-react'

const CGHSExplainer = () => {
  const [expanded, setExpanded] = useState(true)

  const tiers = [
    {
      id: 'TIER I',
      icon: Shield,
      title: 'Tier I Hospitals',
      description: 'NABH-accredited or equivalent hospitals meeting the highest quality standards for patient care, safety, and infrastructure. These hospitals follow strict protocols and have advanced medical facilities.',
      examples: 'Major corporate hospitals, super-specialty centers, and teaching hospitals with NABH accreditation.',
      color: 'text-forest-400',
      bg: 'bg-forest-50/50',
      border: 'border-forest-200/50'
    },
    {
      id: 'TIER II',
      icon: Building,
      title: 'Tier II Hospitals',
      description: 'Hospitals meeting standard quality requirements with basic infrastructure, qualified staff, and adequate facilities for common procedures and treatments.',
      examples: 'District hospitals, medium-sized private hospitals, and nursing homes with good facilities.',
      color: 'text-blue-400',
      bg: 'bg-blue-50/50',
      border: 'border-blue-200/50'
    },
    {
      id: 'TIER III',
      icon: Home,
      title: 'Tier III Hospitals',
      description: 'Primary care facilities providing basic medical services in rural and underserved areas. These are essential for community healthcare access.',
      examples: 'Primary Health Centers (PHCs), Community Health Centers (CHCs), and small nursing homes.',
      color: 'text-amber-400',
      bg: 'bg-amber-50/50',
      border: 'border-amber-200/50'
    }
  ]

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-forest-500" />
          <span className="font-medium text-gray-900 text-sm">Understanding CGHS Rate Tiers & NABH</span>
          <span className="px-2 py-0.5 bg-forest-50 text-forest-700 rounded-full text-xs border border-forest-200/50">
            {expanded ? 'Hide' : 'Show'}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="bg-forest-50/50 p-3 rounded-lg border border-forest-200/50 flex items-start gap-3">
            <Info className="w-4 h-4 text-forest-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900 text-sm">What is NABH?</p>
              <p className="text-xs text-gray-600">National Accreditation Board for Hospitals & Healthcare Providers - India's premier healthcare accreditation body ensuring quality standards, patient safety, and continuous improvement in healthcare delivery.</p>
            </div>
          </div>

          {tiers.map((tier) => {
            const Icon = tier.icon
            return (
              <div key={tier.id} className={`${tier.bg} p-3 rounded-lg border ${tier.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${tier.color}`} />
                  <span className="font-medium text-gray-900 text-sm">{tier.title}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${tier.bg} text-gray-600 border ${tier.border}`}>
                    {tier.id}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{tier.description}</p>
                <p className="text-xs text-gray-400 mt-1">Examples: {tier.examples}</p>
              </div>
            )
          })}

          <div className="bg-forest-50/50 p-3 rounded-lg border border-forest-200/50">
            <p className="text-xs text-forest-800 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-forest-500 mt-0.5 flex-shrink-0" />
              <span><span className="font-medium">How it works:</span> Each procedure has a benchmark rate set by CGHS. If a hospital charges more than 25% above this rate, the bill is flagged for review. This helps ensure transparency and fair pricing.</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default CGHSExplainer