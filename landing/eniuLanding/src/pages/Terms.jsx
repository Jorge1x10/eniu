import { Link } from '../router.jsx'
import { contactEmail } from '../data/site.js'

// Contenido provisional: sirve para tener la página y el enlace del pie en su
// sitio, pero el texto definitivo debe redactarlo o revisarlo un abogado antes
// de publicar el sitio.
const sections = [
  ['1. Aceptación de los términos', 'Al crear una cuenta en Eniu o usar cualquiera de sus servicios, aceptas estos términos. Si no estás de acuerdo con ellos, no utilices la plataforma.'],
  ['2. Tu cuenta', 'Eres responsable de la información que registras y de mantener tu contraseña en secreto. Avísanos de inmediato si detectas un uso no autorizado de tu cuenta.'],
  ['3. Uso del servicio', 'Eniu te permite crear, publicar y compartir menús digitales. No puedes usar el servicio para publicar contenido ilegal, engañoso o que infrinja derechos de terceros.'],
  ['4. Planes y pagos', 'El plan Básico es gratuito. El plan Esencial es una suscripción mensual que se cobra por adelantado a través de nuestro procesador de pagos. Puedes cancelarla cuando quieras y conservas el acceso hasta el final del periodo pagado.'],
  ['5. Contenido de tu negocio', 'Los textos, fotografías y precios que publicas siguen siendo tuyos. Nos otorgas permiso para alojarlos y mostrarlos en tu menú público mientras uses el servicio.'],
  ['6. Disponibilidad y cambios', 'Trabajamos para mantener el servicio disponible, pero puede haber interrupciones por mantenimiento o causas ajenas. Podemos ajustar o retirar funciones avisando con antelación razonable.'],
  ['7. Cancelación', 'Puedes cerrar tu cuenta en cualquier momento. También podemos suspender cuentas que incumplan estos términos.'],
  ['8. Cambios a estos términos', 'Si actualizamos estos términos, publicaremos la nueva versión en esta página con su fecha de vigencia.'],
]

export default function Terms() {
  return (
    <main className="legal-page">
      <section className="legal-head">
        <p className="eyebrow"><span /> Legal</p>
        <h1>Términos y <em>condiciones.</em></h1>
        <p className="hero-lead">Estas son las reglas con las que ofrecemos Eniu y con las que lo usas.</p>
        <p className="legal-date">Última actualización: pendiente de publicación</p>
      </section>

      <section className="legal-body">
        <p className="legal-notice" role="note">
          <strong>Documento en preparación.</strong> Este texto es un borrador que muestra la estructura de nuestros términos.
          La versión definitiva será revisada legalmente antes de entrar en vigor.
        </p>

        {sections.map(([title, text], index) => (
          <article className="legal-section" key={title} data-reveal style={{ '--reveal-delay': `${index * 60}ms` }}>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}

        <article className="legal-section" data-reveal>
          <h2>9. Contacto</h2>
          <p>¿Dudas sobre estos términos? Escríbenos a <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
        </article>

        <p className="legal-back"><Link href="/">Volver al inicio</Link></p>
      </section>
    </main>
  )
}
