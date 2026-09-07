# Sitio público de Eniu

El sitio de `eniu.app`: portada, primeros pasos, soporte y los dos documentos
legales. El panel donde se administran los menús es otra aplicación y vive en
`app.eniu.app` (`client/eniu`).

React 19 y Vite, con Tailwind 4. El enrutado son unas treinta líneas sobre la
History API en `src/router.jsx`: el sitio son cinco páginas y no compensa sumar
una dependencia.

## Desarrollar

```bash
npm install
npm run dev
```

### Variables de entorno

- `VITE_APP_URL` — la dirección a la que llevan los botones de «Crear mi
  menú». En desarrollo no hace falta: sin ella apuntan al ancla de la portada,
  para que ningún botón lleve a un enlace muerto. En producción sale de
  `.env.production`.
- `VITE_PLAUSIBLE_DOMAIN` — enciende la medición. Sin ella no se carga ningún
  script y `track()` no hace nada, que es lo que queremos en local y en las
  vistas previas. `VITE_PLAUSIBLE_SRC` sólo hace falta si se autohospeda.

## Publicar

```bash
npm run build
```

Los menús publicados no se sirven desde aquí: viven en `menu.eniu.app/m/<slug>`,
que es el mismo despliegue del panel bajo otro dominio. `vercel.json` redirige
`eniu.app/m/...` allí, para que un enlace viejo con el dominio corto siga
llegando. La redirección es temporal (307) a propósito: esa dirección acaba
impresa en códigos QR sobre las mesas, y una permanente se queda cacheada en el
navegador de cada cliente sin vuelta atrás.

El sitio se publica en Vercel desde `dist/`. Como es una SPA, hace falta que
cualquier ruta devuelva `index.html`: Vercel sirve los archivos literalmente y
`/terminos` daría 404, que es lo que rompía los enlaces de la app móvil. De eso
se encarga la reescritura de `vercel.json`; Vercel busca primero en el sistema
de archivos, así que las imágenes y `robots.txt` siguen sirviéndose tal cual.
La reescritura es la red de seguridad para las rutas que no existen: las que sí
existen se sirven ya como archivo, porque el build las escribe una por una.

`npm run build` además empaqueta todos los estáticos en base64 dentro de
`dist/server/index.js`, un worker de un solo archivo para hospedajes que lo
admitan (`.openai/hosting.json`). Busca `<ruta>/index.html` antes de caer a la
portada, igual que Vercel. Si añades un archivo con una extensión que no
conozca, agrégala a `CONTENT_TYPES` en `server/index.js` o lo servirá como
binario.

### Prerenderizado

`scripts/prerender.mjs` escribe un HTML por página —diez, cinco por idioma— con
su propio `<title>`, descripción, canonical, `hreflang` y etiquetas Open Graph,
y genera `sitemap.xml` de la misma lista para que no pueda desfasarse. Las
etiquetas salen de `src/content/routes.js`, que es lo que también lee la
aplicación al navegar.

Hace falta porque el sitio es una SPA: con un solo `index.html`, todas las
rutas se servían con la cabecera de la portada. El canonical clavado a la raíz
le decía a Google que cada página era un duplicado —y por eso el espejo en
inglés no se indexaba, porque un canonical que contradice al `hreflang` gana—, y
los rastreadores de WhatsApp y Facebook, que no ejecutan JavaScript, mostraban
la tarjeta de la portada al compartir cualquier página.

Sólo se reescribe la cabecera; el cuerpo lo sigue pintando React en el cliente.

### Atribución de campañas

El registro no ocurre aquí: los CTA se van a `app.eniu.app`. Como los dos
cuelgan del mismo dominio registrable, `src/data/attribution.js` guarda el
origen de la visita (las `utm_*`, `gclid`, `fbclid`, `ttclid`, el referrer y la
página de entrada) en una cookie `eniu_attr` puesta en `.eniu.app`, que el
panel puede leer tal cual. Los mismos parámetros se cuelgan además del enlace,
porque una cookie se puede bloquear.

Todos los CTA pasan por `src/components/AppCta.jsx`. Un `<a href={appUrl}>`
escrito a mano se lleva la campaña por delante: tiraba los parámetros y dejaba
el registro sin origen. **Falta la otra mitad**: que el panel lea la cookie al
registrar y guarde el origen junto al usuario. Mientras eso no exista, la
atribución llega hasta la puerta de la app y ahí se queda.

## Qué vive aquí y por qué

- **Los documentos legales** (`/terminos`, `/privacidad`). Son públicos y sin
  sesión porque App Store Connect exige una URL abierta, y la app móvil los
  lleva compilados apuntando a este dominio. Una sola copia: el panel enlaza
  aquí en vez de duplicar el texto.
- **La página de soporte** (`/soporte`), que es la Support URL que registra
  App Store Connect.
- **Los planes** de `src/data/site.js` reflejan lo que aplica el backend en
  `server/eniu-backend/app/modules/billing/plans.py`. Si allí cambia un límite,
  hay que reflejarlo aquí para no prometer algo que la app no permite.

## Validar

```bash
npm run lint
npm run build
```
