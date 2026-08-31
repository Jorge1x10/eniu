import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './modules/auth/context/authContext.jsx'
import { LanguageProvider } from './i18n/LanguageProvider.jsx'
import { LocalizedGoogleProvider } from './i18n/LocalizedGoogleProvider.jsx'
import './i18n/index.js'
import './styles/index.css'
import App from './App.jsx'
import { applyTheme, getStoredTheme } from './modules/Settings/utils/theme.js'

applyTheme(getStoredTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* El idioma de la cuenta sólo se conoce con el usuario ya cargado,
            así que el proveedor de idioma va dentro del de sesión, y el de
            Google dentro de ambos: su script se carga con ese idioma. */}
        <LanguageProvider>
          <LocalizedGoogleProvider>
            <App />
          </LocalizedGoogleProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
