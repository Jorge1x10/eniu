// Contenido del sitio. Los planes reflejan lo que aplica el backend en
// `server/eniu-backend/app/modules/billing/plans.py`: si allí cambia un límite,
// hay que reflejarlo aquí para no prometer algo que la app no permite.

export const appUrl = import.meta.env.VITE_APP_URL || '#empieza'

export const features = [
  { number: '01', title: 'Menú que sí se antoja', text: 'Organiza categorías, precios y fotografías en una experiencia clara para tus clientes.' },
  { number: '02', title: 'Cambios en segundos', text: 'Actualiza productos, disponibilidad o precios sin reimprimir una sola hoja.' },
  { number: '03', title: 'Datos que sirven', text: 'Descubre qué productos miran tus clientes y toma mejores decisiones para tu negocio.' },
]

export const steps = [
  ['Crea tu negocio', 'Regístrate y agrega la información esencial de tu restaurante.'],
  ['Diseña tu menú', 'Carga tus productos y elige una plantilla que se sienta como tu marca.'],
  ['Comparte tu QR', 'Publícalo en mesas, mostrador y redes. Los cambios se ven al instante.'],
]

export const plans = [
  {
    key: 'free',
    tag: 'Plan Básico',
    name: 'Gratis',
    price: '0',
    unit: 'MXN\npara empezar',
    pitch: 'Todo lo necesario para publicar tu primer menú digital y compartirlo hoy mismo.',
    features: [
      '1 negocio',
      '1 menú digital',
      'Hasta 15 productos',
      'Fotografía en cada producto',
      'Código QR y enlace público',
      'Plantilla y tipografía base',
      'Actualizaciones ilimitadas',
    ],
    note: 'Tu menú muestra la insignia “Hecho con Eniu”.',
    cta: 'Crear mi menú gratis',
    featured: false,
  },
  {
    key: 'essential',
    tag: 'Plan Esencial',
    name: 'Esencial',
    price: '129',
    unit: 'MXN\nal mes',
    pitch: 'Para negocios que ya viven de su menú y quieren personalizarlo y medirlo.',
    inherits: 'Todo lo del plan Básico, y además:',
    features: [
      'Hasta 3 negocios',
      '5 menús por negocio',
      'Productos ilimitados',
      'Todas las plantillas y tipografías',
      'Portada y fondo personalizados',
      'Pantalla de bienvenida',
      'Estadísticas de tu menú',
      'Sin la insignia de Eniu',
    ],
    note: 'Cancela cuando quieras desde tu cuenta.',
    cta: 'Contratar Esencial',
    featured: true,
  },
]

export const onboardingSteps = [
  {
    art: 'ob-1',
    title: 'Crea tu cuenta',
    minutes: '1 min',
    text: 'Regístrate con tu correo y una contraseña. No pedimos tarjeta para empezar: el plan Básico es gratuito desde el primer día.',
    points: ['Correo y contraseña', 'Sin tarjeta de crédito', 'Entras al panel al instante'],
  },
  {
    art: 'ob-2',
    title: 'Registra tu negocio',
    minutes: '2 min',
    text: 'Dale nombre a tu negocio y agrega los datos que verán tus clientes: teléfono, WhatsApp, dirección, moneda y zona horaria.',
    points: ['Nombre y descripción', 'Contacto y ubicación', 'Moneda y horario'],
  },
  {
    art: 'ob-3',
    title: 'Arma tu menú',
    minutes: '5 min',
    text: 'Crea las categorías de tu carta y agrega cada producto con su foto, descripción y precio. Puedes reordenarlos cuando quieras.',
    points: ['Categorías a tu manera', 'Producto con foto y precio', 'Marca lo agotado en un toque'],
  },
  {
    art: 'ob-4',
    title: 'Dale tu estilo',
    minutes: '3 min',
    text: 'Elige plantilla y tipografía, y si tienes plan Esencial suma portada, fondo propio y pantalla de bienvenida para que se sienta tuyo.',
    points: ['Plantillas y tipografías', 'Portada y fondo', 'Vista previa en vivo'],
  },
  {
    art: 'ob-5',
    title: 'Publica y comparte tu QR',
    minutes: '1 min',
    text: 'Publica el menú y obtén su enlace público y su código QR. Imprímelo para las mesas o compártelo en tus redes.',
    points: ['Enlace público estable', 'QR listo para imprimir', 'Cambios visibles al instante'],
  },
  {
    art: 'ob-6',
    title: 'Mide y ajusta',
    minutes: 'Siempre',
    text: 'Con el plan Esencial ves qué productos miran más tus clientes. Ajusta precios, fotos y orden según lo que de verdad piden.',
    points: ['Vistas de tu menú', 'Productos más vistos', 'Decisiones con datos'],
  },
]

export const faq = [
  ['¿Necesito descargar algo?', 'No. Tus clientes abren tu menú desde el navegador al escanear el código QR, y tú administras todo desde el panel web o la app de Eniu.'],
  ['¿Puedo cambiar mi menú después de imprimir el QR?', 'Sí. El código QR siempre apunta al mismo enlace, así que puedes cambiar productos, fotos y precios las veces que quieras sin volver a imprimir.'],
  ['¿Qué pasa si cambio de plan?', 'Tu contenido se queda como está. Si bajas de plan, las funciones exclusivas se desactivan y vuelven a estar disponibles cuando reactivas el plan Esencial.'],
  ['¿Puedo tener más de un negocio?', 'Con el plan Básico administras un negocio. El plan Esencial permite hasta tres, cada uno con sus propios menús.'],
]

// Placeholders: en cuanto existan los perfiles, sustituye `url` por el enlace
// real y el chip de "Pronto" desaparece solo.
export const socialLinks = [
  { key: 'instagram', name: 'Instagram', handle: '@eniu.app', url: '' },
  { key: 'facebook', name: 'Facebook', handle: 'Eniu', url: '' },
  { key: 'tiktok', name: 'TikTok', handle: '@eniu.app', url: '' },
  { key: 'whatsapp', name: 'WhatsApp', handle: 'Escríbenos', url: '' },
]

export const contactEmail = 'hola@eniu.app'
