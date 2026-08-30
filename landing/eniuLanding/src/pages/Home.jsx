import { Link } from '../router.jsx'
import { useLanguage } from '../languageContext.js'
import { appUrl } from '../data/site.js'
import { SocialChips } from '../components/Layout.jsx'
import MenuDemo from '../components/MenuDemo.jsx'

function TrustGroup({ items, hidden }) {
  return (
    <div className="trust-group" aria-hidden={hidden || undefined}>
      {items.map((item) => <span key={item}>{item}<i /></span>)}
    </div>
  )
}

function PlanCard({ plan, badge, delay }) {
  return (
    <article className={plan.featured ? 'plan-card featured' : 'plan-card'} data-reveal="zoom" style={{ '--reveal-delay': `${delay}ms` }}>
      {plan.featured && <span className="plan-badge">{badge}</span>}
      <span className="plan-tag">{plan.tag}</span>
      <h3 className="plan-name">{plan.name}</h3>
      <div className="plan-price"><sup>$</sup><strong>{plan.price}</strong><small>{plan.unit}</small></div>
      <p className="plan-pitch">{plan.pitch}</p>
      {plan.inherits && <p className="plan-inherits">{plan.inherits}</p>}
      <ul className="plan-features">
        {plan.features.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <p className="plan-note">{plan.note}</p>
      <a className={plan.featured ? 'button dark' : 'button outline'} href={appUrl}>{plan.cta}</a>
    </article>
  )
}

export default function Home() {
  const content = useLanguage().content
  const { hero, trust, features, steps, demo, pricing, social, finalCta } = content

  return (
    <main>
      <section className="hero-section" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow"><span /> {hero.eyebrow}</p>
          <h1>{hero.title[0]}<em>{hero.title[1]}</em></h1>
          <p className="hero-lead">{hero.lead}</p>
          <div className="hero-actions">
            <a className="button primary" href={appUrl}>{hero.primaryCta}</a>
            <Link className="text-link" href="onboarding">{hero.secondaryCta}</Link>
          </div>
          <div className="hero-note"><strong>{hero.noteStrong}</strong> {hero.note}</div>
        </div>

        <div className="hero-visual" aria-label={hero.visualLabel}>
          <div className="sun-disc" />
          <span className="sticker sticker-one">{hero.stickerOne[0]}<br />{hero.stickerOne[1]}</span>
          <span className="sticker sticker-two">{hero.stickerTwo[0]}<br />{hero.stickerTwo[1]}</span>
          <div className="phone">
            <div className="phone-top"><span>9:41</span><i /></div>
            <div className="restaurant-cover">
              <span className="restaurant-mark">C</span>
              <p>{hero.phone.kicker}</p>
              <h2>{hero.phone.name}</h2>
            </div>
            <div className="menu-body">
              <div className="category-row">
                <b>{hero.phone.categories[0]}</b>
                <span>{hero.phone.categories[1]}</span>
                <span>{hero.phone.categories[2]}</span>
              </div>
              {hero.phone.dishes.map((dish, index) => (
                <article className="dish-card" key={dish.name}>
                  <div className={`dish-photo ${index === 0 ? 'photo-one' : 'photo-two'}`} aria-hidden="true"><span /><i /><b /></div>
                  <div><h3>{dish.name}</h3><p>{dish.text}</p><strong>{dish.price}</strong></div>
                </article>
              ))}
            </div>
          </div>
          <div className="scan-card"><span className="mini-qr" aria-hidden="true" /><div><small>{hero.scanLabel}</small><strong>{hero.scanTitle}</strong></div></div>
        </div>
      </section>

      <section className="trust-strip" aria-label={trust.label}>
        <div className="trust-track"><TrustGroup items={trust.items} /><TrustGroup items={trust.items} hidden /></div>
      </section>

      <section className="features-section section-pad" id="beneficios">
        <div className="section-heading" data-reveal>
          <div><p className="eyebrow"><span /> {features.eyebrow}</p><h2>{features.title[0]}<br /><em>{features.title[1]}</em></h2></div>
        </div>
        <p className="section-intro" data-reveal>{features.intro}</p>
        <div className="feature-grid">
          {features.items.map((feature, index) => (
            <article className="feature-card" key={feature.number} data-reveal style={{ '--reveal-delay': `${index * 110}ms` }}>
              <span className="feature-number">{feature.number}</span>
              <div className={`feature-art art-${feature.number}`} aria-hidden="true"><i /><b /></div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="steps-section" id="como-funciona">
        <div className="steps-copy" data-reveal="left">
          <p className="eyebrow light"><span /> {steps.eyebrow}</p>
          <h2>{steps.title[0]}<em>{steps.title[1]}</em></h2>
          <p>{steps.lead}</p>
          <div className="steps-actions">
            <a className="button yellow" href={appUrl}>{steps.primaryCta}</a>
            <Link className="button ghost" href="onboarding">{steps.secondaryCta}</Link>
          </div>
        </div>
        <ol className="steps-list">
          {steps.items.map(([title, text], index) => (
            <li key={title} data-reveal="right" style={{ '--reveal-delay': `${index * 120}ms` }}>
              <span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="demo-section section-pad" id="demo">
        <div className="section-heading" data-reveal>
          <div><p className="eyebrow"><span /> {demo.eyebrow}</p><h2>{demo.title[0]}<br /><em>{demo.title[1]}</em></h2></div>
        </div>
        <p className="section-intro" data-reveal>{demo.intro}</p>
        <div data-reveal="zoom"><MenuDemo /></div>
      </section>

      <section className="pricing-section section-pad" id="planes">
        <span className="anchor-alias" id="precio" aria-hidden="true" />
        <div className="section-heading price-copy" data-reveal>
          <div><p className="eyebrow"><span /> {pricing.eyebrow}</p><h2>{pricing.title[0]}<br />{pricing.title[1]}<em>{pricing.title[2]}</em></h2></div>
        </div>
        <p className="section-intro" data-reveal>{pricing.intro}</p>
        <div className="plans-grid">
          {pricing.plans.map((plan, index) => (
            <PlanCard key={plan.key} plan={plan} badge={pricing.badge} delay={index * 120} />
          ))}
        </div>
        <p className="plans-currency-note" data-reveal>{pricing.currencyNote}</p>
        <p className="plans-foot" data-reveal>
          {pricing.footPrefix}<Link href="onboarding">{pricing.footLink}</Link>.
        </p>
      </section>

      <section className="social-section section-pad" id="redes">
        <div className="social-card" data-reveal="zoom">
          <div>
            <p className="eyebrow"><span /> {social.eyebrow}</p>
            <h2>{social.title[0]}<em>{social.title[1]}</em></h2>
            <p className="social-lead">{social.lead}</p>
            <SocialChips />
          </div>
          <div className="social-art" aria-hidden="true"><i /><b /><span /></div>
        </div>
      </section>

      <section className="final-cta" id="empieza">
        <p className="eyebrow light"><span /> {finalCta.eyebrow}</p>
        <h2>{finalCta.title[0]}<br /><em>{finalCta.title[1]}</em></h2>
        <p>{finalCta.lead}</p>
        <a className="button yellow" href={appUrl === '#empieza' ? '#inicio' : appUrl}>{finalCta.cta}</a>
        <span className="cta-orbit orbit-one" aria-hidden="true" /><span className="cta-orbit orbit-two" aria-hidden="true" />
      </section>
    </main>
  )
}
