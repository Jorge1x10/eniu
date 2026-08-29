import { useState } from 'react'
import { Link } from '../router.jsx'
import { useRouter } from '../routerContext.js'
import { useScrolled } from '../useReveal.js'
import { appUrl, contactEmail, privacyUrl, socialLinks, termsUrl } from '../data/site.js'
import { SocialIcon } from './Icons.jsx'

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Eniu, inicio">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcSet="/eniu-wordmark-yellow.png" />
        <img src="/eniu-wordmark-dark.png" alt="Eniu" />
      </picture>
    </Link>
  )
}

const navLinks = [
  ['/#beneficios', 'Beneficios'],
  ['/#como-funciona', 'Cómo funciona'],
  ['/#demo', 'Pruébalo'],
  ['/#planes', 'Planes'],
  ['/primeros-pasos', 'Primeros pasos'],
]

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { path } = useRouter()
  const scrolled = useScrolled()

  return (
    <div className={scrolled ? 'topbar-wrap stuck' : 'topbar-wrap'}>
      <header className="topbar">
        <Brand />
        <button className="menu-toggle" type="button" aria-label="Abrir menú" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span />
        </button>
        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Navegación principal">
          {navLinks.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? 'current' : undefined} onClick={() => setMenuOpen(false)}>{label}</Link>
          ))}
          <a className="nav-cta" href={appUrl} onClick={() => setMenuOpen(false)}>Crear mi menú</a>
        </nav>
      </header>
    </div>
  )
}

/** Chips de redes sociales. Sin `url` se muestran como placeholder. */
export function SocialChips({ compact = false }) {
  return (
    <div className={compact ? 'social-row compact' : 'social-row'}>
      {socialLinks.map((social) => {
        const content = (
          <>
            <SocialIcon name={social.key} />
            <span>{social.name}</span>
            {!social.url && <em className="soon">Pronto</em>}
          </>
        )
        return social.url
          ? <a className="social-chip" key={social.key} href={social.url} target="_blank" rel="noreferrer">{content}</a>
          : <span className="social-chip pending" key={social.key} title="Muy pronto compartiremos este perfil">{content}</span>
      })}
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Brand />
          <p>Menús digitales para negocios que quieren crecer. Crea, publica y comparte tu carta en minutos.</p>
          <SocialChips compact />
        </div>
        <div className="footer-col">
          <h4>Producto</h4>
          <Link href="/#beneficios">Beneficios</Link>
          <Link href="/#como-funciona">Cómo funciona</Link>
          <Link href="/#planes">Planes y precios</Link>
          <Link href="/primeros-pasos">Primeros pasos</Link>
        </div>
        <div className="footer-col">
          <h4>Contacto</h4>
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          <a href={appUrl}>Crear mi menú</a>
        </div>
      </div>
      <div className="footer-legal">
        <small>© {new Date().getFullYear()} Eniu. Hecho en México.</small>
        <div className="footer-legal-links">
          <a href={termsUrl}>Términos y condiciones</a>
          <a href={privacyUrl}>Aviso de privacidad</a>
        </div>
      </div>
    </footer>
  )
}
