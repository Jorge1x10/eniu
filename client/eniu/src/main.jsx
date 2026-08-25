import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './modules/auth/context/authContext.jsx'
import './styles/index.css'
import App from './App.jsx'
import { applyTheme, getStoredTheme } from './modules/Settings/utils/theme.js'
console.log("google Client Id:", import.meta.env.VITE_GOOGLE_CLIENT_ID)

applyTheme(getStoredTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>
)
