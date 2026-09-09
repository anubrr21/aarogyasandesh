import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslation from './en.json'
import hiTranslation from './hi.json'

const resources = {
  en: { translation: enTranslation },
  hi: { translation: hiTranslation }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    debug: false,
    interpolation: { escapeValue: false }
  })

export default i18n