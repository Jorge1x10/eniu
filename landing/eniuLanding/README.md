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

Además del `dist/` habitual, `scripts/prepare-sites-build.mjs` empaqueta todos
los archivos estáticos en base64 dentro de `dist/server/index.js`, un worker de
un solo archivo que los sirve. Ese worker devuelve `index.html` para cualquier
ruta sin extensión, que es lo que hace que `/soporte` o `/terminos` funcionen
al recargar o al compartir el enlace.

Un archivo nuevo con una extensión que el worker no conozca se serviría como
binario: si añades una, agrégala a `CONTENT_TYPES` en `server/index.js`.

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
