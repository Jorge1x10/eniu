import { useState } from 'react'
import './App.css'

const appUrl = import.meta.env.VITE_APP_URL || '#empieza'

const features = [
  { number: '01', title: 'Menú que sí se antoja', text: 'Organiza categorías, precios y fotografías en una experiencia clara para tus clientes.' },
  { number: '02', title: 'Cambios en segundos', text: 'Actualiza productos, disponibilidad o precios sin reimprimir una sola hoja.' },
  { number: '03', title: 'Datos que sirven', text: 'Descubre qué productos miran tus clientes y toma mejores decisiones para tu negocio.' },
]

const steps = [
  ['Crea tu negocio', 'Regístrate y agrega la información esencial de tu restaurante.'],
  ['Diseña tu menú', 'Carga tus productos y elige una plantilla que se sienta como tu marca.'],
  ['Comparte tu QR', 'Publícalo en mesas, mostrador y redes. Los cambios se ven al instante.'],
]

function Brand() {
  return (
    <a className="brand" href="#inicio" aria-label="Eniu, inicio">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcSet="/eniu-wordmark-yellow.png" />
        <img src="/eniu-wordmark-dark.png" alt="Eniu" />
      </picture>
    </a>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="site-shell">
      <header className="topbar">
        <Brand />
        <button className="menu-toggle" type="button" aria-label="Abrir menú" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span />
        </button>
        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Navegación principal">
          <a href="#beneficios" onClick={() => setMenuOpen(false)}>Beneficios</a>
          <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
          <a href="#precio" onClick={() => setMenuOpen(false)}>Precio</a>
          <a className="nav-cta" href={appUrl} onClick={() => setMenuOpen(false)}>Crear mi menú</a>
        </nav>
      </header>

      <main>
        <section className="hero-section" id="inicio">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Tu menú. Más simple. Más tuyo.</p>
            <h1>Convierte cada mesa en una <em>oportunidad.</em></h1>
            <p className="hero-lead">Crea un menú digital atractivo, actualízalo cuando quieras y entiende qué buscan tus clientes. Sin complicaciones.</p>
            <div className="hero-actions">
              <a className="button primary" href={appUrl}>Crear mi menú gratis</a>
              <a className="text-link" href="#como-funciona">Ver cómo funciona</a>
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
          <span>HECHO PARA NEGOCIOS REALES</span><i />
          <span>CAMBIOS AL INSTANTE</span><i />
          <span>SIN DESCARGAR APPS</span><i />
          <span>QR LISTO PARA COMPARTIR</span>
        </section>

        <section className="features-section section-pad" id="beneficios">
          <div className="section-heading">
            <div><p className="eyebrow"><span /> Todo lo que necesitas</p><h2>Menos vueltas.<br /><em>Más servicio.</em></h2></div>
          </div>
          <p className="section-intro">Eniu reúne las herramientas esenciales para que tu menú trabaje a favor de tu negocio, todos los días.</p>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.number}>
                <span className="feature-number">{feature.number}</span>
                <div className={`feature-art art-${feature.number}`} aria-hidden="true"><i /><b /></div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="steps-section" id="como-funciona">
          <div className="steps-copy">
            <p className="eyebrow light"><span /> Empieza hoy</p>
            <h2>De cero a publicado en <em>tres pasos.</em></h2>
            <p>No necesitas experiencia técnica. Si sabes usar tu celular, sabes usar Eniu.</p>
            <a className="button yellow" href={appUrl}>Crear mi menú</a>
          </div>
          <ol className="steps-list">
            {steps.map(([title, text], index) => (
              <li key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>
            ))}
          </ol>
        </section>

        <section className="pricing-section section-pad" id="precio">
          <div className="price-card">
            <div className="price-copy">
              <p className="eyebrow"><span /> Precio simple</p>
              <h2>Todo lo esencial.<br />Un precio <em>honesto.</em></h2>
              <p>Empieza gratis y publica tu menú. Cuando quieras crecer, activa las herramientas avanzadas.</p>
            </div>
            <div className="price-detail">
              <span className="popular">PARA EMPEZAR</span>
              <div className="price"><sup>$</sup><strong>0</strong><small>MXN<br />para crear</small></div>
              <ul>
                <li>Menú digital personalizable</li>
                <li>Productos y categorías</li>
                <li>Código QR para compartir</li>
                <li>Actualizaciones ilimitadas</li>
              </ul>
              <a className="button dark" href={appUrl}>Comenzar ahora</a>
            </div>
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

      <footer>
        <Brand />
        <p>Menús digitales para negocios que quieren crecer.</p>
        <div><a href="#beneficios">Beneficios</a><a href="#como-funciona">Cómo funciona</a><a href="#precio">Precio</a></div>
        <small>© {new Date().getFullYear()} Eniu. Hecho en México.</small>
      </footer>
    </div>
  )
}

export default App
