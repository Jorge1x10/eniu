import { useLanguage } from '../languageContext.js'
import TermsEn from './legal/TermsEn.jsx'
import TermsEs from './legal/TermsEs.jsx'

// Los legales no salen de un árbol de contenido como el resto del sitio: son
// prosa que hay que poder leer y revisar entera, párrafo por párrafo, y
// trocearla en claves la volvería ilegible justo donde más importa.
export default function Terms() {
  const { language } = useLanguage()
  return language === 'en' ? <TermsEn /> : <TermsEs />
}
