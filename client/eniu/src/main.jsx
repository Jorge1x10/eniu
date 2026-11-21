import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './i18n/index.js'
import './styles/index.css'
import App from './App.jsx'
import { applyTheme, getStoredTheme } from './modules/Settings/utils/theme.js'

applyTheme(getStoredTheme())

// Las pantallas se descargan por partes. Si se publica una versión nueva con
// la página abierta, las partes de la anterior ya no existen y la sección
// fallaría al abrirse: se recarga para tomar la versión nueva. Una sola vez
// por minuto, para no entrar en bucle si la causa es otra (sin red, etc.).
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'eniu_reloaded_for_new_version'
  let last = 0
  try { last = Number(sessionStorage.getItem(KEY)) || 0 } catch { /* sin almacenamiento */ }
  if (Date.now() - last < 60_000) return
  event.preventDefault()
  try { sessionStorage.setItem(KEY, String(Date.now())) } catch { /* sin almacenamiento */ }
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
