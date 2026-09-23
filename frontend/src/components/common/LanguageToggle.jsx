import { useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { Globe, ChevronDown } from 'lucide-react'

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' }
  ]

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0]

  const changeLanguage = (langCode) => {
    setLanguage(langCode)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-forest-700 transition-colors rounded-xl hover:bg-forest-50"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{currentLanguage.flag} {currentLanguage.label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-xl shadow-lg overflow-hidden z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${
                language === lang.code ? 'bg-forest-50 text-forest-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {language === lang.code && <span className="ml-auto text-forest-700">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageToggle