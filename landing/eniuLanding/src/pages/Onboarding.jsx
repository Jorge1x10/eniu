import { useEffect, useRef, useState } from 'react'
import { Link } from '../router.jsx'
import { appUrl, faq, onboardingSteps } from '../data/site.js'

/** Rellena la línea vertical de la guía conforme avanza el desplazamiento. */
function useRailProgress() {
  const trackRef = useRef(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined

    let frame = 0
    const update = () => {
      frame = 0
      const { top, height } = track.getBoundingClientRect()
      const traveled = window.innerHeight * 0.55 - top
      const progress = Math.min(Math.max(traveled / height, 0), 1)
      track.style.setProperty('--progress', `${(progress * 100).toFixed(2)}%`)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return trackRef
}

function Faq() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div className="faq-list">
      {faq.map(([question, answer], index) => {
        const open = openIndex === index
        return (
          <div className={open ? 'faq-item open' : 'faq-item'} key={question} data-reveal style={{ '--reveal-delay': `${index * 80}ms` }}>
            <button className="faq-q" type="button" aria-expanded={open} onClick={() => setOpenIndex(open ? -1 : index)}>
              {question}<i aria-hidden="true" />
            </button>
            <div className="faq-a"><div><p>{answer}</p></div></div>
          </div>
        )
      })}
    </div>
  )
}

export default function Onboarding() {
  const trackRef = useRailProgress()

  return (
    <main className="onboarding">
      <section className="ob-hero">
        <div className="ob-hero-copy">
          <p className="eyebrow"><span /> Primeros pasos</p>
          <h1>Tu menú publicado, <em>paso a paso.</em></h1>
          <p className="hero-lead">Así funciona Eniu de principio a fin: desde crear tu cuenta hasta compartir tu código QR y ver qué piden más tus clientes.</p>
          <div className="hero-actions">
            <a className="button primary" href={appUrl}>Empezar ahora</a>
            <Link className="text-link" href="/#planes">Comparar planes</Link>
          </div>
          <div className="ob-chips">
            <span className="ob-chip"><b>6</b> pasos</span>
            <span className="ob-chip"><b>~12</b> minutos</span>
            <span className="ob-chip"><b>0</b> conocimientos técnicos</span>
          </div>
        </div>
        <div className="ob-hero-art" aria-hidden="true">
          <span className="ob-orb" />
          <span className="ob-ring" />
          <span className="ob-qr" />
        </div>
      </section>

      <section className="ob-track-section section-pad" id="guia">
        <div className="section-heading" data-reveal>
          <div><p className="eyebrow"><span /> La guía completa</p><h2>De la idea a la mesa<br /><em>en seis pasos.</em></h2></div>
        </div>
        <div className="ob-track" ref={trackRef}>
          <div className="ob-rail" aria-hidden="true"><span /></div>
          <ol className="ob-steps">
            {onboardingSteps.map((step, index) => (
              <li className="ob-step" key={step.title} data-reveal>
                <div className="ob-dot" aria-hidden="true"><span>{index + 1}</span></div>
                <div className="ob-body">
                  <div className="ob-head">
                    <h3>{step.title}</h3>
                    <span className="ob-time">{step.minutes}</span>
                  </div>
                  <p>{step.text}</p>
                  <ul className="ob-points">
                    {step.points.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                </div>
                <div className={`ob-art ${step.art}`} aria-hidden="true"><i /><b /><span /></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ob-faq section-pad" id="preguntas">
        <div className="section-heading" data-reveal>
          <div><p className="eyebrow"><span /> Preguntas frecuentes</p><h2>Lo que casi todos<br /><em>preguntan primero.</em></h2></div>
        </div>
        <Faq />
      </section>

      <section className="final-cta">
        <p className="eyebrow light"><span /> Ya sabes cómo funciona</p>
        <h2>Ahora solo falta<br /><em>tu primer menú.</em></h2>
        <p>Crea tu cuenta y publica tu carta hoy mismo. El plan Básico es gratis.</p>
        <a className="button yellow" href={appUrl}>Crear mi menú gratis</a>
        <span className="cta-orbit orbit-one" aria-hidden="true" /><span className="cta-orbit orbit-two" aria-hidden="true" />
      </section>
    </main>
  )
}
