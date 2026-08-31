import { useState } from 'react'
import { Link } from '../router.jsx'
import { useRouter } from '../routerContext.js'
import { useLanguage } from '../languageContext.js'
import { useScrolled } from '../useReveal.js'
import { equivalentPath, resolveHref } from '../content/index.js'
import { appUrl, contactEmail, socialLinks } from '../data/site.js'
import { SocialIcon } from './Icons.jsx'

export function Brand() {
  const content = useLanguage().content
  return (
    <Link className="brand" href="home" aria-label={content.nav.brandLabel}>
      <picture>
        <source media="(prefers-color-scheme: dark)" srcSet="/eniu-wordmark-yellow.png" />
        <img src="/eniu-wordmark-dark.png" alt="Eniu" />
      </picture>
    </Link>
  )
}

/**
 * Cambia de idioma sin perder la página.
 *
 * Manda a la equivalente en el otro idioma en lugar de a la portada: quien
 * está leyendo los términos y cambia de idioma quiere seguir leyéndolos.
 */
function LanguageSwitch({ onNavigate }) {
  const { path, hash } = useRouter()
  const { language, content } = useLanguage()
  const other = language === 'es' ? 'en' : 'es'

  return (
    <Link
      className="lang-switch"
      href={equivalentPath(path, hash, other)}
      lang={other}
      hrefLang={other}
      aria-label={content.nav.languageLabel}
      onClick={onNavigate}
    >
      {content.nav.switchTo}
    </Link>
  )
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { path } = useRouter()
  const { language, content } = useLanguage()
  const scrolled = useScrolled()
  const close = () => setMenuOpen(false)

  return (
    <div className={scrolled ? 'topbar-wrap stuck' : 'topbar-wrap'}>
      <header className="topbar">
        <Brand />
        <button className="menu-toggle" type="button" aria-label={content.nav.openMenu} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span />
        </button>
        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label={content.nav.mainNav}>
          {content.nav.links.map(([target, label]) => (
            <Link
              key={target}
              href={target}
              className={path === resolveHref(target, language) ? 'current' : undefined}
              onClick={close}
            >
              {label}
            </Link>
          ))}
          <LanguageSwitch onNavigate={close} />
          <a className="nav-cta" href={appUrl} onClick={close}>{content.nav.cta}</a>
        </nav>
      </header>
    </div>
  )
}

/** Chips de redes sociales. Sin `url` se muestran como placeholder. */
export function SocialChips({ compact = false }) {
  const content = useLanguage().content
  return (
    <div className={compact ? 'social-row compact' : 'social-row'}>
      {socialLinks.map((social) => {
        const body = (
          <>
            <SocialIcon name={social.key} />
            <span>{social.name}</span>
            {!social.url && <em className="soon">{content.social.soon}</em>}
          </>
        )
        return social.url
          ? <a className="social-chip" key={social.key} href={social.url} target="_blank" rel="noreferrer">{body}</a>
          : <span className="social-chip pending" key={social.key} title={content.social.soonTitle}>{body}</span>
      })}
    </div>
  )
}

export function SiteFooter() {
  const content = useLanguage().content
  const { footer } = content

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Brand />
          <p>{footer.blurb}</p>
          <SocialChips compact />
        </div>
        <div className="footer-col">
          <h4>{footer.productTitle}</h4>
          <Link href="#beneficios">{footer.benefits}</Link>
          <Link href="#como-funciona">{footer.howItWorks}</Link>
          <Link href="#planes">{footer.pricing}</Link>
          <Link href="onboarding">{footer.onboarding}</Link>
        </div>
        <div className="footer-col">
          <h4>{footer.contactTitle}</h4>
          <Link href="support">{footer.support}</Link>
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          <a href={appUrl}>{footer.createMenu}</a>
        </div>
      </div>
      <div className="footer-legal">
        <small>© {new Date().getFullYear()} {footer.rights}</small>
        <div className="footer-legal-links">
          <Link href="terms">{footer.terms}</Link>
          <Link href="privacy">{footer.privacy}</Link>
        </div>
      </div>
    </footer>
  )
}
