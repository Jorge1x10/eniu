import { useLanguage } from '../languageContext.js'
import PrivacyEn from './legal/PrivacyEn.jsx'
import PrivacyEs from './legal/PrivacyEs.jsx'

// Ver la nota en `Terms.jsx`: la prosa legal vive en archivos por idioma.
export default function Privacy() {
  const { language } = useLanguage()
  return language === 'en' ? <PrivacyEn /> : <PrivacyEs />
}
