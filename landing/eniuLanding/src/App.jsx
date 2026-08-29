import { useEffect } from 'react'
import './App.css'
import { RouterProvider } from './router.jsx'
import { useRouter } from './routerContext.js'
import { useReveal } from './useReveal.js'
import { SiteFooter, SiteHeader } from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Onboarding from './pages/Onboarding.jsx'

const routes = {
  '/': { component: Home, title: 'Eniu — Tu menú, más simple y más tuyo' },
  '/primeros-pasos': { component: Onboarding, title: 'Primeros pasos con Eniu — Cómo funciona' },
}

function Site() {
  const { path, key } = useRouter()
  const route = routes[path.replace(/\/+$/, '') || '/'] || routes['/']
  const Page = route.component

  useReveal(key)
  useEffect(() => { document.title = route.title }, [route.title])

  return (
    <div className="site-shell">
      <SiteHeader />
      <Page />
      <SiteFooter />
    </div>
  )
}

export default function App() {
  return (
    <RouterProvider>
      <Site />
    </RouterProvider>
  )
}
