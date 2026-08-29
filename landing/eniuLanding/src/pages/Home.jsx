import { Link } from '../router.jsx'
import { appUrl, features, plans, steps } from '../data/site.js'
import { SocialChips } from '../components/Layout.jsx'
import MenuDemo from '../components/MenuDemo.jsx'

const trustItems = ['HECHO PARA NEGOCIOS REALES', 'CAMBIOS AL INSTANTE', 'SIN DESCARGAR APPS', 'QR LISTO PARA COMPARTIR']

function TrustGroup({ hidden }) {
  return (
    <div className="trust-group" aria-hidden={hidden || undefined}>
      {trustItems.map((item) => <span key={item}>{item}<i /></span>)}
    </div>
  )
}

function PlanCard({ plan, delay }) {
  return (
    <article className={plan.featured ? 'plan-card featured' : 'plan-card'} data-reveal="zoom" style={{ '--reveal-delay': `${delay}ms` }}>
      {plan.featured && <span className="plan-badge">MÁS COMPLETO</span>}
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
  return (
    <main>
      <section className="hero-section" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Tu menú. Más simple. Más tuyo.</p>
          <h1>Convierte cada mesa en una <em>oportunidad.</em></h1>
          <p className="hero-lead">Crea un menú digital atractivo, actualízalo cuando quieras y entiende qué buscan tus clientes. Sin complicaciones.</p>
          <div className="hero-actions">
            <a className="button primary" href={appUrl}>Crear mi menú gratis</a>
            <Link className="text-link" href="/primeros-pasos">Ver cómo funciona paso a paso</Link>
          </div>
          <div className="hero-note"><strong>Sin tarjeta.</strong> Publica tu primer menú en minutos.</div>
        </div>

        <div className="hero-visual" aria-label="Vista previa de un menú digital en Eniu">
          <div className="sun-disc" />
          <span className="sticker sticker-one">MENÚ<br />DIGITAL</span>
          <span className="sticker sticker-two">FÁCIL<br />DE USAR</span>
          <div className="phone">
            <div className="phone-top"><span>9:41</span><i /></div>
            <div className="restaurant-cover">
              <span className="restaurant-mark">C</span>
              <p>COCINA DE BARRIO</p>
              <h2>Casa Nopal</h2>
            </div>
            <div className="menu-body">
              <div className="category-row"><b>Favoritos</b><span>Entradas</span><span>Platos</span></div>
              <article className="dish-card">
                <div className="dish-photo photo-one" aria-hidden="true"><span /><i /><b /></div>
                <div><h3>Tacos de birria</h3><p>Cebolla, cilantro y consomé de la casa.</p><strong>$145</strong></div>
              </article>
              <article className="dish-card">
                <div className="dish-photo photo-two" aria-hidden="true"><span /><i /><b /></div>
                <div><h3>Ensalada nopal</h3><p>Queso fresco, jitomate y aguacate.</p><strong>$110</strong></div>
              </article>
            </div>
          </div>
          <div className="scan-card"><span className="mini-qr" aria-hidden="true" /><div><small>ESCANEA Y DESCUBRE</small><strong>Un menú que se siente tuyo.</strong></div></div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Ventajas principales">
        <div className="trust-track"><TrustGroup /><TrustGroup hidden /></div>
      </section>

      <section className="features-section section-pad" id="beneficios">
        <div className="section-heading" data-reveal>
          <div><p className="eyebrow"><span /> Todo lo que necesitas</p><h2>Menos vueltas.<br /><em>Más servicio.</em></h2></div>
        </div>
        <p className="section-intro" data-reveal>Eniu reúne las herramientas esenciales para que tu menú trabaje a favor de tu negocio, todos los días.</p>
        <div className="feature-grid">
          {features.map((feature, index) => (
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
          <p className="eyebrow light"><span /> Empieza hoy</p>
          <h2>De cero a publicado en <em>tres pasos.</em></h2>
          <p>No necesitas experiencia técnica. Si sabes usar tu celular, sabes usar Eniu.</p>
          <div className="steps-actions">
            <a className="button yellow" href={appUrl}>Crear mi menú</a>
            <Link className="button ghost" href="/primeros-pasos">Ver la guía completa</Link>
          </div>
        </div>
        <ol className="steps-list">
          {steps.map(([title, text], index) => (
            <li key={title} data-reveal="right" style={{ '--reveal-delay': `${index * 120}ms` }}>
              <span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="demo-section section-pad" id="demo">
        <div className="section-heading" data-reveal>
          <div><p className="eyebrow"><span /> Pruébalo sin registrarte</p><h2>Edita este menú<br /><em>como en Eniu.</em></h2></div>
        </div>
        <p className="section-intro" data-reveal>Cambia nombres, precios, categorías y diseño. Es el mismo flujo que usarás en tu panel, con la vista previa actualizándose al instante.</p>
        <div data-reveal="zoom"><MenuDemo /></div>
      </section>

      <section className="pricing-section section-pad" id="planes">
        <span className="anchor-alias" id="precio" aria-hidden="true" />
        <div className="section-heading price-copy" data-reveal>
          <div><p className="eyebrow"><span /> Planes y precios</p><h2>Empieza gratis.<br />Crece cuando <em>lo necesites.</em></h2></div>
        </div>
        <p className="section-intro" data-reveal>Dos planes, sin letras chiquitas. El Básico publica tu menú hoy; el Esencial abre la personalización y las estadísticas.</p>
        <div className="plans-grid">
          {plans.map((plan, index) => <PlanCard key={plan.key} plan={plan} delay={index * 120} />)}
        </div>
        <p className="plans-foot" data-reveal>¿Dudas sobre qué incluye cada plan? <Link href="/primeros-pasos">Mira cómo funciona Eniu paso a paso</Link>.</p>
      </section>

      <section className="social-section section-pad" id="redes">
        <div className="social-card" data-reveal="zoom">
          <div>
            <p className="eyebrow"><span /> Comunidad Eniu</p>
            <h2>Síguenos y mira <em>lo que viene.</em></h2>
            <p className="social-lead">Estamos preparando nuestras redes: ideas para tu menú, novedades del producto y negocios que ya usan Eniu.</p>
            <SocialChips />
          </div>
          <div className="social-art" aria-hidden="true"><i /><b /><span /></div>
        </div>
      </section>

      <section className="final-cta" id="empieza">
        <p className="eyebrow light"><span /> Tu siguiente mesa ya está esperando</p>
        <h2>Haz que elegir sea<br /><em>parte de la experiencia.</em></h2>
        <p>Crea, publica y comparte tu menú digital con Eniu.</p>
        <a className="button yellow" href={appUrl === '#empieza' ? '#inicio' : appUrl}>Crear mi menú gratis</a>
        <span className="cta-orbit orbit-one" aria-hidden="true" /><span className="cta-orbit orbit-two" aria-hidden="true" />
      </section>
    </main>
  )
}
