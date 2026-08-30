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

`VITE_APP_URL` es la dirección a la que llevan los botones de «Crear mi menú».
En desarrollo no hace falta: sin ella apuntan al ancla de la portada, para que
ningún botón lleve a un enlace muerto. En producción sale de `.env.production`.

## Publicar

```bash
npm run build
```

Los menús publicados se sirven desde el panel, en `/m/<slug>`, no desde aquí.
`vercel.json` redirige `eniu.app/m/...` a `app.eniu.app/m/...` para que un
enlace o un código QR con el dominio corto siga funcionando; la redirección es
temporal (307) a propósito, porque esa dirección va impresa en códigos QR y una
permanente se queda cacheada en el navegador de cada cliente sin vuelta atrás.

El sitio se publica en Vercel desde `dist/`. Como es una SPA, hace falta que
cualquier ruta devuelva `index.html`: Vercel sirve los archivos literalmente y
`/terminos` daría 404, que es lo que rompía los enlaces de la app móvil. De eso
se encarga la reescritura de `vercel.json`; Vercel busca primero en el sistema
de archivos, así que las imágenes, `robots.txt` y `sitemap.xml` siguen
sirviéndose tal cual.

`npm run build` además empaqueta todos los estáticos en base64 dentro de
`dist/server/index.js`, un worker de un solo archivo para hospedajes que lo
admitan (`.openai/hosting.json`). Hace lo mismo que la reescritura: devuelve
`index.html` para cualquier ruta sin extensión. Si añades un archivo con una
extensión que no conozca, agrégala a `CONTENT_TYPES` en `server/index.js` o lo
servirá como binario.

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
