// Contenido del sitio en español. `en.js` es su espejo: las dos exportan la
// misma forma, y `content/index.js` elige una según la ruta. Cuando agregues
// una clave aquí, agrégala también allá — la prueba de forma lo exige.
//
// Los planes reflejan lo que aplica el backend en
// `server/eniu-backend/app/modules/billing/plans.py`: si allí cambia un
// límite, hay que reflejarlo aquí para no prometer algo que la app no permite.

export default {
  code: 'es',
  label: 'Español',
  shortLabel: 'ES',

  // Las rutas se traducen junto con el texto: una dirección en español para
  // quien lee en español es parte de que el sitio se sienta suyo.
  paths: {
    home: '/',
    onboarding: '/primeros-pasos',
    support: '/soporte',
    terms: '/terminos',
    privacy: '/privacidad',
  },

  meta: {
    home: 'Eniu — Tu menú, más simple y más tuyo',
    onboarding: 'Primeros pasos con Eniu — Cómo funciona',
    support: 'Soporte — Eniu',
    terms: 'Términos y condiciones — Eniu',
    privacy: 'Aviso de privacidad — Eniu',
  },

  nav: {
    brandLabel: 'Eniu, inicio',
    openMenu: 'Abrir menú',
    mainNav: 'Navegación principal',
    cta: 'Crear mi menú',
    links: [
      ['#beneficios', 'Beneficios'],
      ['#como-funciona', 'Cómo funciona'],
      ['#demo', 'Pruébalo'],
      ['#planes', 'Planes'],
      ['onboarding', 'Primeros pasos'],
    ],
    languageLabel: 'Idioma',
    switchTo: 'Read in English',
  },

  hero: {
    eyebrow: 'Tu menú. Más simple. Más tuyo.',
    title: ['Convierte cada mesa en una ', 'oportunidad.'],
    lead: 'Crea un menú digital atractivo, actualízalo cuando quieras y entiende qué buscan tus clientes. Sin complicaciones.',
    primaryCta: 'Crear mi menú gratis',
    secondaryCta: 'Ver cómo funciona paso a paso',
    noteStrong: 'Sin tarjeta.',
    note: 'Publica tu primer menú en minutos.',
    visualLabel: 'Vista previa de un menú digital en Eniu',
    stickerOne: ['MENÚ', 'DIGITAL'],
    stickerTwo: ['FÁCIL', 'DE USAR'],
    scanLabel: 'ESCANEA Y DESCUBRE',
    scanTitle: 'Un menú que se siente tuyo.',
    phone: {
      kicker: 'COCINA DE BARRIO',
      name: 'Casa Nopal',
      categories: ['Favoritos', 'Entradas', 'Platos'],
      dishes: [
        { name: 'Tacos de birria', text: 'Cebolla, cilantro y consomé de la casa.', price: '$145' },
        { name: 'Ensalada nopal', text: 'Queso fresco, jitomate y aguacate.', price: '$110' },
      ],
    },
  },

  trust: {
    label: 'Ventajas principales',
    items: [
      'HECHO PARA NEGOCIOS REALES',
      'CAMBIOS AL INSTANTE',
      'SIN DESCARGAR APPS',
      'QR LISTO PARA COMPARTIR',
    ],
  },

  features: {
    eyebrow: 'Todo lo que necesitas',
    title: ['Menos vueltas.', 'Más servicio.'],
    intro: 'Eniu reúne las herramientas esenciales para que tu menú trabaje a favor de tu negocio, todos los días.',
    items: [
      { number: '01', title: 'Menú que sí se antoja', text: 'Organiza categorías, precios y fotografías en una experiencia clara para tus clientes.' },
      { number: '02', title: 'Cambios en segundos', text: 'Actualiza productos, disponibilidad o precios sin reimprimir una sola hoja.' },
      { number: '03', title: 'Datos que sirven', text: 'Descubre qué productos miran tus clientes y toma mejores decisiones para tu negocio.' },
    ],
  },

  steps: {
    eyebrow: 'Empieza hoy',
    title: ['De cero a publicado en ', 'tres pasos.'],
    lead: 'No necesitas experiencia técnica. Si sabes usar tu celular, sabes usar Eniu.',
    primaryCta: 'Crear mi menú',
    secondaryCta: 'Ver la guía completa',
    items: [
      ['Crea tu negocio', 'Regístrate y agrega la información esencial de tu restaurante.'],
      ['Diseña tu menú', 'Carga tus productos y elige una plantilla que se sienta como tu marca.'],
      ['Comparte tu QR', 'Publícalo en mesas, mostrador y redes. Los cambios se ven al instante.'],
    ],
  },

  demo: {
    eyebrow: 'Pruébalo sin registrarte',
    title: ['Edita este menú', 'como en Eniu.'],
    intro: 'Cambia nombres, precios, categorías y diseño. Es el mismo flujo que usarás en tu panel, con la vista previa actualizándose al instante.',
    editorLabel: 'Editor del menú de ejemplo',
    tabs: [['menu', 'Menú'], ['productos', 'Productos'], ['diseno', 'Diseño']],
    fields: {
      businessName: 'Nombre del negocio',
      menuName: 'Nombre del menú',
      description: 'Descripción',
      categories: 'Categorías',
      addCategory: '+ Agregar categoría',
      categoryNameLabel: (name) => `Nombre de la categoría ${name}`,
      remove: (name) => `Eliminar ${name}`,
      counter: (count, limit) => `${count} de ${limit} productos`,
      counterPlan: 'plan Básico',
      addProduct: '+ Agregar producto',
      atLimit: 'Llegaste al tope del plan Básico. ',
      atLimitLink: 'Con Esencial son ilimitados.',
      unnamed: 'Sin nombre',
      noPrice: 'Sin precio',
      available: 'Disponible',
      soldOut: 'Agotado',
      done: 'Listo',
      edit: 'Editar',
      name: 'Nombre',
      price: 'Precio (MXN)',
      category: 'Categoría',
      noCategory: 'Sin categoría',
      photo: 'Fotografía',
      changePhoto: 'Cambiar fotografía',
      template: 'Plantilla',
      font: 'Tipografía',
      colors: 'Colores',
      colorPicker: (label) => `Selector de ${label.toLowerCase()}`,
      coverAndProducts: 'Portada y productos',
      showCover: 'Mostrar portada',
      showProductImages: 'Mostrar imágenes de productos',
      paidTag: 'Esencial',
    },
    templates: {
      modern: { name: 'Moderna', description: 'Tarjetas visuales y navegación redondeada.' },
      minimal: { name: 'Minimalista', description: 'Lectura rápida, filas limpias y pocas sombras.' },
      elegant: { name: 'Elegante', description: 'Composición editorial y más espacio.' },
      bold: { name: 'Impactante', description: 'Bloques fuertes y bordes marcados.' },
    },
    colors: {
      background_color: 'Color de fondo',
      primary_color: 'Color principal',
      accent_color: 'Color de acento',
      text_color: 'Color del texto',
    },
    note: 'Los cambios se ven al instante, igual que en Eniu. Esta demo no guarda nada.',
    reset: 'Reiniciar demo',
    preview: {
      label: 'Vista previa del menú de ejemplo',
      navLabel: 'Categorías del menú',
      all: 'Todo',
      other: 'Otros',
      fallbackBusiness: 'Tu negocio',
      fallbackMenu: 'Tu menú',
      askPrice: 'Consultar',
      empty: 'Los productos aparecerán aquí cuando los agregues.',
      badge: 'Menú creado con ENIU',
      caption: 'Así lo ven tus clientes al escanear el QR.',
      cta: 'Crear mi menú gratis',
    },
    // La demo es el menú del visitante, no la factura de Eniu: quien cocina en
    // México pone sus platos en pesos, así que el ejemplo también.
    locale: 'es-MX',
    currency: 'MXN',
    seed: {
      businessName: 'Casa Nopal',
      menuName: 'Menú de la casa',
      menuDescription: 'Cocina de barrio con ingredientes de temporada.',
      newCategory: 'Nueva categoría',
      newProduct: 'Producto nuevo',
      categories: ['Entradas', 'Platos fuertes', 'Postres'],
      products: [
        { name: 'Guacamole con totopos', description: 'Aguacate, cilantro, serrano y limón.', price: '95' },
        { name: 'Sopa de tortilla', description: 'Caldo de jitomate, pasilla y queso fresco.', price: '110' },
        { name: 'Tacos de birria', description: 'Cebolla, cilantro y consomé de la casa.', price: '145' },
        { name: 'Enchiladas verdes', description: 'Pollo, crema y queso rallado.', price: '135' },
        { name: 'Flan de vainilla', description: 'La receta de la abuela, con caramelo.', price: '75' },
        { name: 'Café de olla', description: 'Canela y piloncillo.', price: '45' },
      ],
    },
  },

  pricing: {
    eyebrow: 'Planes y precios',
    title: ['Empieza gratis.', 'Crece cuando ', 'lo necesites.'],
    intro: 'Dos planes, sin letras chiquitas. El Básico publica tu menú hoy; el Esencial abre la personalización y las estadísticas.',
    badge: 'MÁS COMPLETO',
    currencyNote: 'Los precios se muestran en pesos mexicanos.',
    footPrefix: '¿Dudas sobre qué incluye cada plan? ',
    footLink: 'Mira cómo funciona Eniu paso a paso',
    plans: [
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
    ],
  },

  social: {
    eyebrow: 'Comunidad Eniu',
    title: ['Síguenos y mira ', 'lo que viene.'],
    lead: 'Estamos preparando nuestras redes: ideas para tu menú, novedades del producto y negocios que ya usan Eniu.',
    soon: 'Pronto',
    soonTitle: 'Muy pronto compartiremos este perfil',
  },

  finalCta: {
    eyebrow: 'Tu siguiente mesa ya está esperando',
    title: ['Haz que elegir sea', 'parte de la experiencia.'],
    lead: 'Crea, publica y comparte tu menú digital con Eniu.',
    cta: 'Crear mi menú gratis',
  },

  footer: {
    blurb: 'Menús digitales para negocios que quieren crecer. Crea, publica y comparte tu carta en minutos.',
    productTitle: 'Producto',
    contactTitle: 'Contacto',
    benefits: 'Beneficios',
    howItWorks: 'Cómo funciona',
    pricing: 'Planes y precios',
    onboarding: 'Primeros pasos',
    support: 'Soporte y ayuda',
    createMenu: 'Crear mi menú',
    rights: 'Eniu. Hecho en México.',
    terms: 'Términos y condiciones',
    privacy: 'Aviso de privacidad',
  },

  onboarding: {
    eyebrow: 'Primeros pasos',
    title: ['Tu menú publicado, ', 'paso a paso.'],
    lead: 'Así funciona Eniu de principio a fin: desde crear tu cuenta hasta compartir tu código QR y ver qué piden más tus clientes.',
    primaryCta: 'Empezar ahora',
    secondaryCta: 'Comparar planes',
    chips: [
      ['6', 'pasos'],
      ['~12', 'minutos'],
      ['0', 'conocimientos técnicos'],
    ],
    guideEyebrow: 'La guía completa',
    guideTitle: ['De la idea a la mesa', 'en seis pasos.'],
    faqEyebrow: 'Preguntas frecuentes',
    faqTitle: ['Lo que casi todos', 'preguntan primero.'],
    finalEyebrow: 'Ya sabes cómo funciona',
    finalTitle: ['Ahora solo falta', 'tu primer menú.'],
    finalLead: 'Crea tu cuenta y publica tu carta hoy mismo. El plan Básico es gratis.',
    finalCta: 'Crear mi menú gratis',
    steps: [
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
    ],
    faq: [
      ['¿Necesito descargar algo?', 'No. Tus clientes abren tu menú desde el navegador al escanear el código QR, y tú administras todo desde el panel web o la app de Eniu.'],
      ['¿Puedo cambiar mi menú después de imprimir el QR?', 'Sí. El código QR siempre apunta al mismo enlace, así que puedes cambiar productos, fotos y precios las veces que quieras sin volver a imprimir.'],
      ['¿Qué pasa si cambio de plan?', 'Tu contenido se queda como está. Si bajas de plan, las funciones exclusivas se desactivan y vuelven a estar disponibles cuando reactivas el plan Esencial.'],
      ['¿Puedo tener más de un negocio?', 'Con el plan Básico administras un negocio. El plan Esencial permite hasta tres, cada uno con sus propios menús.'],
    ],
  },

  support: {
    title: 'Soporte',
    lead: 'Eniu lo llevamos de cerca y contestamos todos los correos. Si algo no funciona o no encuentras cómo hacer algo, escríbenos y te respondemos.',
    writeUs: 'Escríbenos',
    responseTime: 'Tiempo de respuesta',
    responseTimeValue: 'De uno a dos días hábiles',
    languages: 'Atendemos en',
    languagesValue: 'Español, horario de la Ciudad de México',
    // Preguntas que llegan de verdad al correo, en el orden en que suelen
    // llegar. La de la cuenta va primero a propósito: es la que Apple espera
    // encontrar sin tener que escribir a nadie.
    answers: [
      {
        question: 'Quiero eliminar mi cuenta',
        answer: 'Puedes hacerlo tú mismo, sin pedírnoslo. En la app, desde Ajustes → Eliminar cuenta. En el panel web, desde Configuración → Seguridad. Se borran tus negocios, menús, productos y fotos, y los menús publicados dejan de estar disponibles. Si tienes una suscripción activa se cancela antes de borrar nada. No se puede deshacer.',
      },
      {
        question: 'Olvidé mi contraseña',
        answer: 'En la pantalla de acceso toca «¿Olvidaste tu contraseña?» y te mandamos un enlace al correo con el que te registraste. El enlace caduca a los quince minutos. Si entraste con Google o con Apple no tienes contraseña que recuperar: usa el mismo botón con el que te diste de alta.',
      },
      {
        question: 'Cambié mi menú y sigo viendo el anterior',
        answer: 'Los cambios se publican al instante, pero el navegador de tus clientes puede tener guardada la versión previa unos segundos. Recarga la página. Si el menú aparece vacío o dice que no está disponible, revisa que siga publicado desde la pantalla de publicación.',
      },
      {
        question: 'Cambié de plan y perdí funciones',
        answer: 'Al bajar de plan, lo que no incluye se desactiva: la portada, el fondo, la pantalla de bienvenida y las estadísticas. No se borra nada. En cuanto reactivas el plan Esencial vuelve todo tal como lo tenías.',
      },
      {
        question: 'Quiero cancelar mi suscripción',
        answer: 'Desde el panel web, en Configuración → Facturación, entras al portal de pagos y cancelas ahí. Conservas el acceso hasta el final del periodo que ya pagaste.',
      },
      {
        question: 'Encontré un menú que no debería estar publicado',
        answer: 'Escríbenos con el enlace del menú y qué problema tiene. Retiramos contenido ilegal, fraudulento o que infrinja derechos de terceros, y suspendemos las cuentas que lo publiquen de forma reiterada.',
      },
    ],
    footPrefix: '¿Vas empezando? El recorrido completo está en ',
    footOnboarding: 'primeros pasos',
    footMiddle: '. También puedes leer los ',
    footTerms: 'términos y condiciones',
    footAnd: ' y el ',
    footPrivacy: 'aviso de privacidad',
    footSuffix: '.',
  },

  legal: {
    updatedLabel: 'Última actualización:',
    // El aviso de versión de referencia sólo aparece en inglés, donde hace
    // falta: en español no hay nada que aclarar porque es el original.
    referenceNotice: null,
  },
}
