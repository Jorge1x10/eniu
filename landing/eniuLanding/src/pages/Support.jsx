import { Link } from '../router.jsx'
import { contactEmail } from '../data/site.js'

// Preguntas que llegan de verdad al correo, en el orden en que suelen llegar.
// La de la cuenta va primero a propósito: es la que Apple espera encontrar sin
// tener que escribir a nadie.
const respuestas = [
  {
    pregunta: 'Quiero eliminar mi cuenta',
    respuesta: 'Puedes hacerlo tú mismo, sin pedírnoslo. En la app, desde Ajustes → Eliminar cuenta. En el panel web, desde Configuración → Seguridad. Se borran tus negocios, menús, productos y fotos, y los menús publicados dejan de estar disponibles. Si tienes una suscripción activa se cancela antes de borrar nada. No se puede deshacer.',
  },
  {
    pregunta: 'Olvidé mi contraseña',
    respuesta: 'En la pantalla de acceso toca «¿Olvidaste tu contraseña?» y te mandamos un enlace al correo con el que te registraste. El enlace caduca a los quince minutos. Si entraste con Google o con Apple no tienes contraseña que recuperar: usa el mismo botón con el que te diste de alta.',
  },
  {
    pregunta: 'Cambié mi menú y sigo viendo el anterior',
    respuesta: 'Los cambios se publican al instante, pero el navegador de tus clientes puede tener guardada la versión previa unos segundos. Recarga la página. Si el menú aparece vacío o dice que no está disponible, revisa que siga publicado desde la pantalla de publicación.',
  },
  {
    pregunta: 'Cambié de plan y perdí funciones',
    respuesta: 'Al bajar de plan, lo que no incluye se desactiva: la portada, el fondo, la pantalla de bienvenida y las estadísticas. No se borra nada. En cuanto reactivas el plan Esencial vuelve todo tal como lo tenías.',
  },
  {
    pregunta: 'Quiero cancelar mi suscripción',
    respuesta: 'Desde el panel web, en Configuración → Facturación, entras al portal de pagos y cancelas ahí. Conservas el acceso hasta el final del periodo que ya pagaste.',
  },
  {
    pregunta: 'Encontré un menú que no debería estar publicado',
    respuesta: 'Escríbenos con el enlace del menú y qué problema tiene. Retiramos contenido ilegal, fraudulento o que infrinja derechos de terceros, y suspendemos las cuentas que lo publiquen de forma reiterada.',
  },
]

export default function Support() {
  return (
    <main className="legal-page">
      <h1>Soporte</h1>
      <p className="support-lead">
        Eniu lo llevamos de cerca y contestamos todos los correos. Si algo no funciona o no encuentras
        cómo hacer algo, escríbenos y te respondemos.
      </p>

      <div className="support-card">
        <div>
          <span>Escríbenos</span>
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        </div>
        <div>
          <span>Tiempo de respuesta</span>
          <p>De uno a dos días hábiles</p>
        </div>
        <div>
          <span>Atendemos en</span>
          <p>Español, horario de la Ciudad de México</p>
        </div>
      </div>

      {respuestas.map(({ pregunta, respuesta }) => (
        <section className="legal-section" key={pregunta}>
          <h2>{pregunta}</h2>
          <p>{respuesta}</p>
        </section>
      ))}

      <p className="legal-foot">
        ¿Vas empezando? El recorrido completo está en <Link href="/primeros-pasos">primeros pasos</Link>.
        También puedes leer los <Link href="/terminos">términos y condiciones</Link> y el{' '}
        <Link href="/privacidad">aviso de privacidad</Link>.
      </p>
    </main>
  )
}
