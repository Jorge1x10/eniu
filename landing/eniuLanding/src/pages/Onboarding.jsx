import { useEffect, useRef, useState } from 'react'
import { Link } from '../router.jsx'
import { useLanguage } from '../languageContext.js'
import { appUrl } from '../data/site.js'

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

function Faq({ items }) {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div className="faq-list">
      {items.map(([question, answer], index) => {
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
  const { onboarding } = useLanguage().content

  return (
    <main className="onboarding">
      <section className="ob-hero">
        <div className="ob-hero-copy">
          <p className="eyebrow"><span /> {onboarding.eyebrow}</p>
          <h1>{onboarding.title[0]}<em>{onboarding.title[1]}</em></h1>
          <p className="hero-lead">{onboarding.lead}</p>
          <div className="hero-actions">
            <a className="button primary" href={appUrl}>{onboarding.primaryCta}</a>
            <Link className="text-link" href="#planes">{onboarding.secondaryCta}</Link>
          </div>
          <div className="ob-chips">
            {onboarding.chips.map(([value, label]) => (
              <span className="ob-chip" key={label}><b>{value}</b> {label}</span>
            ))}
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
          <div><p className="eyebrow"><span /> {onboarding.guideEyebrow}</p><h2>{onboarding.guideTitle[0]}<br /><em>{onboarding.guideTitle[1]}</em></h2></div>
        </div>
        <div className="ob-track" ref={trackRef}>
          <div className="ob-rail" aria-hidden="true"><span /></div>
          <ol className="ob-steps">
            {onboarding.steps.map((step, index) => (
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
          <div><p className="eyebrow"><span /> {onboarding.faqEyebrow}</p><h2>{onboarding.faqTitle[0]}<br /><em>{onboarding.faqTitle[1]}</em></h2></div>
        </div>
        <Faq items={onboarding.faq} />
      </section>

      <section className="final-cta">
        <p className="eyebrow light"><span /> {onboarding.finalEyebrow}</p>
        <h2>{onboarding.finalTitle[0]}<br /><em>{onboarding.finalTitle[1]}</em></h2>
        <p>{onboarding.finalLead}</p>
        <a className="button yellow" href={appUrl}>{onboarding.finalCta}</a>
        <span className="cta-orbit orbit-one" aria-hidden="true" /><span className="cta-orbit orbit-two" aria-hidden="true" />
      </section>
    </main>
  )
}
