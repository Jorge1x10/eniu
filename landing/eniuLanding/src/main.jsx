import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { captureAttribution } from './data/attribution.js'
import { initAnalytics } from './data/analytics.js'

// Antes de pintar: el origen de la visita se guarda aunque la persona cierre
// la pestaña sin llegar al botón, y la cola de eventos queda lista para el
// clic de quien entra y toca el CTA de inmediato.
captureAttribution()
initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
