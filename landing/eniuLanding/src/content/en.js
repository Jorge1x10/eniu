// Site content in English. Mirrors the shape of `es.js` exactly — if you add a
// key there, add it here too; the shape test in `content/content.test.js`
// fails otherwise.
//
// This is written as English copy, not as a translation of the Spanish: the
// headlines and the rhythm are chosen to land in English, so the two files
// read as siblings rather than as an original and its echo.
//
// Prices are in USD because the Stripe price behind them carries a USD
// currency option (price_1U8KMMQpR9prNqbY3Re90J6t: 129.00 MXN by default,
// 10.00 USD). Checkout picks the currency from the customer's location, so if
// that option is ever removed this page has to go back to MXN the same day —
// quoting a figure the checkout will not honour is the one thing to avoid.

export default {
  code: 'en',
  label: 'English',
  shortLabel: 'EN',

  paths: {
    home: '/en',
    onboarding: '/en/getting-started',
    support: '/en/support',
    terms: '/en/terms',
    privacy: '/en/privacy',
  },

  meta: {
    home: 'Eniu — Your menu, simpler and more yours',
    onboarding: 'Getting started with Eniu — How it works',
    support: 'Support — Eniu',
    terms: 'Terms and conditions — Eniu',
    privacy: 'Privacy notice — Eniu',
  },

  nav: {
    brandLabel: 'Eniu, home',
    openMenu: 'Open menu',
    mainNav: 'Main navigation',
    cta: 'Create my menu',
    links: [
      ['#beneficios', 'Benefits'],
      ['#como-funciona', 'How it works'],
      ['#demo', 'Try it'],
      ['#planes', 'Pricing'],
      ['onboarding', 'Getting started'],
    ],
    languageLabel: 'Language',
    switchTo: 'Leer en español',
  },

  hero: {
    eyebrow: 'Your menu. Simpler. More yours.',
    title: ['Turn every table into an ', 'opportunity.'],
    lead: 'Build a digital menu people want to read, change it whenever you like, and see what your guests are actually looking for. No hassle.',
    primaryCta: 'Create my free menu',
    secondaryCta: 'See how it works, step by step',
    noteStrong: 'No card required.',
    note: 'Publish your first menu in minutes.',
    visualLabel: 'Preview of a digital menu in Eniu',
    stickerOne: ['DIGITAL', 'MENU'],
    stickerTwo: ['EASY', 'TO USE'],
    scanLabel: 'SCAN AND EXPLORE',
    scanTitle: 'A menu that feels like yours.',
    phone: {
      kicker: 'NEIGHBORHOOD KITCHEN',
      name: 'Casa Nopal',
      categories: ['Favorites', 'Starters', 'Mains'],
      dishes: [
        { name: 'Birria tacos', text: 'Onion, cilantro and house consommé.', price: '$145' },
        { name: 'Nopal salad', text: 'Fresh cheese, tomato and avocado.', price: '$110' },
      ],
    },
  },

  trust: {
    label: 'Key benefits',
    items: [
      'BUILT FOR REAL BUSINESSES',
      'CHANGES GO LIVE INSTANTLY',
      'NO APP TO DOWNLOAD',
      'QR CODE READY TO SHARE',
    ],
  },

  features: {
    eyebrow: 'Everything you need',
    title: ['Less back and forth.', 'More service.'],
    intro: 'Eniu brings together the essentials so your menu works for your business, every single day.',
    items: [
      { number: '01', title: 'A menu worth reading', text: 'Lay out categories, prices and photos in something your guests can actually navigate.' },
      { number: '02', title: 'Changes in seconds', text: 'Update dishes, availability or prices without reprinting a single sheet.' },
      { number: '03', title: 'Numbers you can use', text: 'Find out which dishes your guests linger on, and make better calls for your business.' },
    ],
  },

  steps: {
    eyebrow: 'Start today',
    title: ['From nothing to published in ', 'three steps.'],
    lead: 'No technical background needed. If you can use your phone, you can use Eniu.',
    primaryCta: 'Create my menu',
    secondaryCta: 'Read the full guide',
    items: [
      ['Set up your business', 'Sign up and add the essentials about your restaurant.'],
      ['Design your menu', 'Load your dishes and pick a template that looks like your brand.'],
      ['Share your QR code', 'Put it on tables, the counter and social. Changes show up instantly.'],
    ],
  },

  demo: {
    eyebrow: 'Try it without signing up',
    title: ['Edit this menu', 'the way you would in Eniu.'],
    intro: 'Change names, prices, categories and design. It is the same flow you will use in your dashboard, with the preview updating as you type.',
    editorLabel: 'Sample menu editor',
    tabs: [['menu', 'Menu'], ['productos', 'Dishes'], ['diseno', 'Design']],
    fields: {
      businessName: 'Business name',
      menuName: 'Menu name',
      description: 'Description',
      categories: 'Categories',
      addCategory: '+ Add category',
      categoryNameLabel: (name) => `Name of the ${name} category`,
      remove: (name) => `Delete ${name}`,
      counter: (count, limit) => `${count} of ${limit} dishes`,
      counterPlan: 'Basic plan',
      addProduct: '+ Add dish',
      atLimit: 'You have hit the Basic plan limit. ',
      atLimitLink: 'Essential makes it unlimited.',
      unnamed: 'Unnamed',
      noPrice: 'No price',
      available: 'Available',
      soldOut: 'Sold out',
      done: 'Done',
      edit: 'Edit',
      name: 'Name',
      price: 'Price (USD)',
      category: 'Category',
      noCategory: 'No category',
      photo: 'Photo',
      changePhoto: 'Change photo',
      template: 'Template',
      font: 'Font',
      colors: 'Colors',
      colorPicker: (label) => `${label} picker`,
      coverAndProducts: 'Cover and dishes',
      showCover: 'Show cover',
      showProductImages: 'Show dish photos',
      paidTag: 'Essential',
    },
    templates: {
      modern: { name: 'Modern', description: 'Visual cards and rounded navigation.' },
      minimal: { name: 'Minimal', description: 'Quick to read, clean rows, barely any shadow.' },
      elegant: { name: 'Elegant', description: 'Editorial layout with more room to breathe.' },
      bold: { name: 'Bold', description: 'Strong blocks and heavy borders.' },
    },
    colors: {
      background_color: 'Background color',
      primary_color: 'Primary color',
      accent_color: 'Accent color',
      text_color: 'Text color',
    },
    note: 'Changes show up instantly, exactly like in Eniu. This demo saves nothing.',
    reset: 'Reset demo',
    preview: {
      label: 'Preview of the sample menu',
      navLabel: 'Menu categories',
      all: 'All',
      other: 'Other',
      fallbackBusiness: 'Your business',
      fallbackMenu: 'Your menu',
      askPrice: 'Ask us',
      empty: 'Your dishes will show up here once you add them.',
      badge: 'Menu built with ENIU',
      caption: 'This is what your guests see when they scan the QR code.',
      cta: 'Create my free menu',
    },
    // The demo is the visitor's own menu, not Eniu's bill: an American
    // restaurateur prices dishes in dollars, so the sample does too.
    locale: 'en-US',
    currency: 'USD',
    seed: {
      businessName: 'Casa Nopal',
      menuName: 'House menu',
      menuDescription: 'Neighborhood cooking with seasonal ingredients.',
      newCategory: 'New category',
      newProduct: 'New dish',
      categories: ['Starters', 'Mains', 'Desserts'],
      products: [
        { name: 'Guacamole and totopos', description: 'Avocado, cilantro, serrano and lime.', price: '9' },
        { name: 'Tortilla soup', description: 'Tomato broth, pasilla chile and fresh cheese.', price: '11' },
        { name: 'Birria tacos', description: 'Onion, cilantro and house consommé.', price: '14' },
        { name: 'Green enchiladas', description: 'Chicken, cream and grated cheese.', price: '13' },
        { name: 'Vanilla flan', description: 'Grandma’s recipe, with caramel.', price: '7' },
        { name: 'Café de olla', description: 'Cinnamon and raw cane sugar.', price: '4' },
      ],
    },
  },

  pricing: {
    eyebrow: 'Plans and pricing',
    title: ['Start free.', 'Grow when ', 'you need to.'],
    intro: 'Two plans, no fine print. Basic publishes your menu today; Essential unlocks customization and stats.',
    badge: 'MOST COMPLETE',
    currencyNote: 'Shown in USD. You are billed in your local currency where available.',
    footPrefix: 'Not sure what each plan covers? ',
    footLink: 'See how Eniu works, step by step',
    plans: [
      {
        key: 'free',
        tag: 'Basic plan',
        name: 'Free',
        price: '0',
        unit: 'USD\nto get started',
        pitch: 'Everything you need to publish your first digital menu and share it today.',
        features: [
          '1 business',
          '1 digital menu',
          'Up to 15 dishes',
          'A photo on every dish',
          'QR code and public link',
          'Base template and font',
          'Unlimited updates',
        ],
        note: 'Your menu carries the “Made with Eniu” badge.',
        cta: 'Create my free menu',
        featured: false,
      },
      {
        key: 'essential',
        tag: 'Essential plan',
        name: 'Essential',
        price: '10',
        unit: 'USD\nper month',
        pitch: 'For businesses that live off their menu and want to shape it and measure it.',
        inherits: 'Everything in Basic, plus:',
        features: [
          'Up to 3 businesses',
          '5 menus per business',
          'Unlimited dishes',
          'Every template and font',
          'Custom cover and background',
          'Splash screen',
          'Stats for your menu',
          'No Eniu badge',
        ],
        note: 'Cancel whenever you like, from your account.',
        cta: 'Get Essential',
        featured: true,
      },
    ],
  },

  social: {
    eyebrow: 'The Eniu community',
    title: ['Follow along and see ', 'what is coming.'],
    lead: 'We are setting up our channels: ideas for your menu, product news, and the businesses already using Eniu.',
    soon: 'Soon',
    soonTitle: 'We will share this profile very soon',
  },

  finalCta: {
    eyebrow: 'Your next table is already waiting',
    title: ['Make choosing part', 'of the experience.'],
    lead: 'Build, publish and share your digital menu with Eniu.',
    cta: 'Create my free menu',
  },

  footer: {
    blurb: 'Digital menus for businesses that want to grow. Build, publish and share your menu in minutes.',
    productTitle: 'Product',
    contactTitle: 'Contact',
    benefits: 'Benefits',
    howItWorks: 'How it works',
    pricing: 'Plans and pricing',
    onboarding: 'Getting started',
    support: 'Support and help',
    createMenu: 'Create my menu',
    rights: 'Eniu. Made in Mexico.',
    terms: 'Terms and conditions',
    privacy: 'Privacy notice',
  },

  onboarding: {
    eyebrow: 'Getting started',
    title: ['Your menu published, ', 'step by step.'],
    lead: 'Here is how Eniu works end to end: from creating your account to sharing your QR code and seeing what your guests order most.',
    primaryCta: 'Get started',
    secondaryCta: 'Compare plans',
    chips: [
      ['6', 'steps'],
      ['~12', 'minutes'],
      ['0', 'technical know-how'],
    ],
    guideEyebrow: 'The full guide',
    guideTitle: ['From idea to table', 'in six steps.'],
    faqEyebrow: 'Frequently asked questions',
    faqTitle: ['What almost everyone', 'asks first.'],
    finalEyebrow: 'Now you know how it works',
    finalTitle: ['All that is left', 'is your first menu.'],
    finalLead: 'Create your account and publish your menu today. The Basic plan is free.',
    finalCta: 'Create my free menu',
    steps: [
      {
        art: 'ob-1',
        title: 'Create your account',
        minutes: '1 min',
        text: 'Sign up with your email and a password. We do not ask for a card to get started: the Basic plan is free from day one.',
        points: ['Email and password', 'No credit card', 'Straight into the dashboard'],
      },
      {
        art: 'ob-2',
        title: 'Add your business',
        minutes: '2 min',
        text: 'Name your business and add what your guests will see: phone, WhatsApp, address, currency and time zone.',
        points: ['Name and description', 'Contact and location', 'Currency and hours'],
      },
      {
        art: 'ob-3',
        title: 'Build your menu',
        minutes: '5 min',
        text: 'Create the categories on your menu and add each dish with its photo, description and price. Reorder them whenever you like.',
        points: ['Categories your way', 'Dishes with photo and price', 'Mark something sold out in one tap'],
      },
      {
        art: 'ob-4',
        title: 'Make it yours',
        minutes: '3 min',
        text: 'Pick a template and a font, and on the Essential plan add a cover, your own background and a splash screen so it feels like your place.',
        points: ['Templates and fonts', 'Cover and background', 'Live preview'],
      },
      {
        art: 'ob-5',
        title: 'Publish and share your QR',
        minutes: '1 min',
        text: 'Publish the menu and get its public link and QR code. Print it for the tables or share it on social.',
        points: ['A stable public link', 'QR ready to print', 'Changes visible instantly'],
      },
      {
        art: 'ob-6',
        title: 'Measure and adjust',
        minutes: 'Ongoing',
        text: 'On the Essential plan you can see which dishes your guests look at most. Adjust prices, photos and order based on what they actually want.',
        points: ['Views of your menu', 'Most-viewed dishes', 'Decisions backed by data'],
      },
    ],
    faq: [
      ['Do I need to download anything?', 'No. Your guests open your menu in their browser when they scan the QR code, and you manage everything from the web dashboard or the Eniu app.'],
      ['Can I change my menu after printing the QR code?', 'Yes. The QR code always points to the same link, so you can change dishes, photos and prices as often as you like without reprinting anything.'],
      ['What happens if I change plans?', 'Your content stays exactly as it is. If you move to a smaller plan the paid features switch off, and they come back the moment you reactivate Essential.'],
      ['Can I have more than one business?', 'The Basic plan covers one business. Essential allows up to three, each with its own menus.'],
    ],
  },

  support: {
    title: 'Support',
    lead: 'We run Eniu closely and we answer every email. If something is not working, or you cannot find how to do something, write to us and we will get back to you.',
    writeUs: 'Write to us',
    responseTime: 'Response time',
    responseTimeValue: 'One to two business days',
    languages: 'We answer in',
    languagesValue: 'English and Spanish, Mexico City time',
    answers: [
      {
        question: 'I want to delete my account',
        answer: 'You can do it yourself, without asking us. In the app, from Settings → Delete account. On the web dashboard, from Settings → Security. Your businesses, menus, dishes and photos are deleted, and published menus stop being available. If you have an active subscription it is cancelled before anything is deleted. This cannot be undone.',
      },
      {
        question: 'I forgot my password',
        answer: 'On the sign-in screen tap “Forgot your password?” and we will email a link to the address you signed up with. The link expires after fifteen minutes. If you signed in with Google or Apple there is no password to recover: use the same button you signed up with.',
      },
      {
        question: 'I changed my menu and still see the old one',
        answer: 'Changes publish instantly, but your guests’ browsers may hold on to the previous version for a few seconds. Reload the page. If the menu comes up empty or says it is unavailable, check that it is still published on the publication screen.',
      },
      {
        question: 'I changed plans and lost features',
        answer: 'When you move to a smaller plan, whatever it does not include switches off: the cover, the background, the splash screen and the stats. Nothing is deleted. The moment you reactivate Essential, everything comes back the way you left it.',
      },
      {
        question: 'I want to cancel my subscription',
        answer: 'From the web dashboard, under Settings → Billing, you can open the payments portal and cancel there. You keep access until the end of the period you already paid for.',
      },
      {
        question: 'I found a menu that should not be published',
        answer: 'Write to us with the menu link and what is wrong with it. We take down illegal or fraudulent content and anything that infringes third-party rights, and we suspend accounts that publish it repeatedly.',
      },
    ],
    footPrefix: 'Just starting out? The full walkthrough is in ',
    footOnboarding: 'getting started',
    footMiddle: '. You can also read the ',
    footTerms: 'terms and conditions',
    footAnd: ' and the ',
    footPrivacy: 'privacy notice',
    footSuffix: '.',
  },

  legal: {
    updatedLabel: 'Last updated:',
    // Eniu opera desde México y sus documentos legales se redactaron en
    // español. La traducción se ofrece para que se entienda, no para
    // sustituirla: decirlo evita que alguien invoque un matiz de la versión
    // en inglés que el original no dice.
    referenceNotice:
      'This English text is provided for your convenience. The Spanish version is the binding one; if the two differ, the Spanish version prevails.',
  },
}
