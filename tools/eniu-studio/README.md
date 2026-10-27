# Eniu Studio

Maneja Eniu desde la terminal: crea negocios, menús, categorías, productos,
promociones y plantillas, publica, y llena la pantalla de Analíticas con
tráfico creíble para sacar capturas (App Store, Play Store, anuncios).

Todo el contenido pasa por la API de Eniu, con las mismas validaciones y
límites de plan que un usuario real: lo que crea el estudio es exactamente lo
que vería un restaurante. Sólo las analíticas y el plan se escriben directo en
la base de datos, porque la API pública de eventos únicamente acepta los
últimos 7 días y el plan se cobra con Stripe.

```
tools/eniu-studio/
├── studio.py            punto de entrada: python tools/eniu-studio/studio.py --help
├── demos/               demos listas: casa-nopal.json (CDMX, MXN) y lantern-yard.json (Londres, GBP, en inglés)
├── eniu_studio/         código (cliente de la API, generador de tráfico, fotos, entorno local)
├── tests/               pruebas sin servidor ni base de datos
└── .studio/             estado local, ignorado por git (base de datos, fotos, sesiones, cuenta demo)
```

## Requisitos

- Python 3.11 con `requests`, `Pillow` y `tzdata`.
- Las dependencias del backend. Si el Python con el que corres el estudio no
  las tiene, el estudio usa solo el venv de `server/eniu-backend/venv`, o el
  del checkout principal si estás en un worktree.
- Node y `npm install` en `client/eniu`, para compilar el dashboard local.

## Arranque rápido (todo en tu máquina)

```bash
python tools/eniu-studio/studio.py local init
python tools/eniu-studio/studio.py local serve
```

`local serve` se queda corriendo. En otra terminal:

```bash
python tools/eniu-studio/studio.py demo apply tools/eniu-studio/demos/casa-nopal.json --with-stats
```

En un minuto tienes:

- **Dashboard:** http://localhost:5055. Entra con la cuenta demo; sus
  credenciales de prueba están en `tools/eniu-studio/.studio/local-account.json`.
- **Menú público:** http://localhost:5055/m/casa-nopal-menu-principal
- **Analíticas:** 60 días de visitas en Dashboard → Casa Nopal → Menú principal → Analíticas.

El entorno local es una API real del backend sobre SQLite, más el dashboard
compilado (`vite build`), servidos juntos en el puerto 5055. Va compilado y no
con el servidor de desarrollo para que se vea igual que en producción. Si
cambias código de `client/eniu`, vuelve a compilarlo con `local build`.

`local init --reset` borra la base local y empieza de cero. La cuenta demo
local tiene plan Pro, o el que pidas con `--plan`.

## Comandos

Opciones globales, válidas en cualquier posición:

- `--env local|staging|prod`: entorno; por defecto `local`, o lo que diga `ENIU_STUDIO_ENV`.
- `--json`: salida en JSON, para scripts.
- `--yes`: confirma borrados y escrituras directas en la base de datos.

Los menús se nombran por nombre (sin importar acentos ni mayúsculas), por
slug o por id. Lo mismo vale para negocios, categorías, productos y
promociones dentro de su menú.

| Comando | Qué hace |
| --- | --- |
| `local init [--plan pro] [--reset] [--skip-dashboard]` | prepara la base local, la cuenta demo y el dashboard |
| `local serve` | API y dashboard en http://localhost:5055 |
| `local build` | vuelve a compilar el dashboard |
| `local status` | qué está corriendo |
| `login` / `whoami` | sesión y plan de la cuenta |
| `language es\|en` | idioma de la cuenta |
| `ls` | negocios y menús, con su estado, URL pública y cuánto contenido tienen |
| `templates` | layouts, paletas y fuentes disponibles |
| `business create NOMBRE [--currency --timezone --description --address --phone --photo auto\|ruta]` | crea un negocio (`--photo auto` dibuja un logo con iniciales) |
| `business update NEGOCIO [--name --description --phone --whatsapp --address --currency --timezone --website --photo]` | edita un negocio |
| `menu create NEGOCIO NOMBRE [--description]` | crea un menú |
| `menu publish\|unpublish MENÚ` | publica o despublica |
| `menu template MENÚ [--layout --palette --font --cover auto\|ruta --show-cover yes\|no --show-images yes\|no]` | cambia el diseño |
| `menu delete MENÚ --yes` | borra un menú con todo su contenido |
| `category add MENÚ NOMBRE [--description]` / `category delete MENÚ NOMBRE --yes` | categorías |
| `product add MENÚ NOMBRE --price 120 [--category --description --available yes\|no --image auto\|ruta\|none]` | crea un producto; por defecto con foto dibujada |
| `product update MENÚ NOMBRE [--new-name --price --category --description --available --image]` | edita un producto; `--image` reemplaza sus fotos |
| `product delete MENÚ NOMBRE --yes` | borra un producto |
| `promo add MENÚ NOMBRE [--badge 2x1 --days 4,5 --products "A,B" --categories "C" --from AAAA-MM-DD --to AAAA-MM-DD]` | crea una promoción; los días van de 0 (lunes) a 6 |
| `promo delete MENÚ NOMBRE --yes` | borra una promoción |
| `demo apply ARCHIVO.json [--with-stats] [--refresh-images] [--business OTRO]` | crea o actualiza todo lo que describe el archivo |
| `stats seed MENÚ [--days 60 --daily-views 40 --growth 0.6 --returning 0.28 --popular "A=10,B=6" --seed N --keep-previous]` | siembra analíticas |
| `stats show MENÚ [--days 30]` | lo que enseña la pantalla de Analíticas |
| `stats clear MENÚ [--all --yes]` | borra lo sembrado; con `--all`, también las visitas reales |
| `plan set free\|essential\|pro [--email]` | cambia el plan de una cuenta demo sin cobro; bajar a `free` desactiva lo que el gratuito no incluye, igual que una cancelación real |

La API no tiene ruta para borrar negocios, así que el estudio tampoco.

Ejemplo rápido:

```bash
python tools/eniu-studio/studio.py business create "La Esquina" --currency MXN --timezone America/Mexico_City --photo auto
python tools/eniu-studio/studio.py menu create "La Esquina" "Carta"
python tools/eniu-studio/studio.py category add Carta Hamburguesas
python tools/eniu-studio/studio.py product add Carta "Hamburguesa clásica" --price 149 --category Hamburguesas
python tools/eniu-studio/studio.py menu template Carta --layout bistro --palette midnight --font oswald --cover auto
python tools/eniu-studio/studio.py menu publish Carta
python tools/eniu-studio/studio.py stats seed Carta --daily-views 30
```

## Archivos de demo

Un archivo de demo describe una cuenta completa. `demo apply` es
idempotente: busca todo por nombre, crea lo que falta y actualiza lo que
cambió, así que puedes editar el archivo y volver a aplicarlo sin duplicar
nada. Mira `demos/casa-nopal.json` como ejemplo completo.

```jsonc
{
  "account": { "name": "Lucía Ramírez" },            // el dashboard saluda "Hola, Lucía Ramírez"
  "business": {
    "name": "Casa Nopal",
    "currency": "MXN",
    "timezone": "America/Mexico_City",                 // las horas pico de las analíticas van en esta zona
    "description": "…", "address": "…", "phone": "…",
    "photo": "auto",                                   // logo con iniciales; o una ruta a una imagen
    "logo": { "background": "#1F3D2B", "foreground": "#F6E7C1" }
  },
  "menus": [
    {
      "name": "Menú principal",
      "publish": true,
      "template": {
        "layout": "modern", "palette": "classic", "font": "manrope",
        "show_cover": true, "show_product_images": true,
        "cover": "auto"                                // portada dibujada con los platillos del menú
      },
      "categories": [
        {
          "name": "Tacos",
          "products": [
            { "name": "Tacos de birria", "price": 145, "description": "…", "popularity": 10 },
            { "name": "Cerveza artesanal", "price": 85, "available": false, "image": "fotos/cerveza.jpg" }
          ]
        }
      ],
      "promotions": [
        { "name": "2x1 en tacos", "badge": "2x1", "days": "all", "products": ["Tacos de birria"] },
        { "name": "Hora feliz", "badge": "Hora feliz", "days": [3, 4], "categories": ["Bebidas"] }
      ],
      "stats": { "days": 60, "daily_views": 38, "growth": 0.65, "returning": 0.3, "seed": 7 }
    }
  ]
}
```

Imágenes (`image` de cada producto, `photo` del negocio, `cover` de la plantilla):

- `"auto"`, el valor por defecto en productos: foto cenital dibujada según el
  nombre del platillo (tacos, hamburguesa, pizza, sopa, ensalada, guacamole,
  postre, bebida, café, papas o plato genérico).
- `"auto:pizza"`: fuerza un tipo de dibujo.
- `"fotos/tacos.jpg"`: tu propia foto, con la ruta relativa al archivo de la demo.
- `null`: sin imagen.

Las fotos dibujadas sirven para que una demo se vea completa. Para las
capturas definitivas conviene cambiar los platillos estrella por fotos
reales. `demo apply --refresh-images` vuelve a subir todas las fotos.

Otros campos:

- `"days": "all"` en una promoción: la etiqueta sale todos los días, así se
  ve sin importar qué día se tomen las capturas.
- `popularity` en un producto: cuánto se mira en las analíticas sembradas.
  El de mayor peso sale como «Producto con más interés».
- `stats` del menú: lo usa `demo apply --with-stats`. Sus campos son los de
  `stats seed`.

## Analíticas de demostración

`stats seed` genera los mismos eventos que manda un menú público real
(`menu_view`, `product_view`, `category_select`) y los escribe en la base de
datos. El tráfico está pensado para que la pantalla cuente una historia
creíble:

- picos de comida (13 a 15 h) y de cena (19 a 21 h) en la zona horaria del
  negocio, y viernes y sábados más llenos;
- crecimiento a lo largo del periodo, con ruido diario, y hoy siempre por
  encima de ayer (el inicio de la app compara las vistas de hoy contra las de
  ayer, y un lunes perdería contra el domingo);
- clientes habituales, así que hay menos visitantes únicos que visitas;
- popularidad desigual de productos y categorías;
- un 84 % de visitas desde el móvil y más o menos la mitad entrando por QR.

Para que la captura salga bien, el estudio repite la simulación con otra
semilla hasta que las visitas suben al menos un 8 % contra la semana anterior
y un 12 % contra el mes anterior, y el producto más popular queda arriba. Con
`--days 60`, el valor por defecto, se pueden comparar 30 días contra 30.

Cada evento sembrado lleva `dedup_key` con el prefijo `seed:`. Volver a sembrar
reemplaza sólo lo sembrado, y `stats clear` borra sólo eso: las visitas reales
nunca se tocan, salvo con `stats clear --all --yes`. Las claves de producto y
categoría se leen del menú público, así que no hace falta conocer el secreto
del servidor.

En local (SQLite) el backend agrupa por hora en UTC y en producción
(Postgres) en la zona del negocio. El estudio genera con el reloj que va a
usar la pantalla, así que el pico de comida cae a la hora correcta en los dos.

## Capturas para App Store y anuncios (producción)

Las capturas de la tienda se sacan con el workflow **App Store Screenshots**
de GitHub Actions (`.github/workflows/appstore-screenshots.yml`). Compila la
app para el simulador apuntando a producción e inicia sesión con la cuenta
de los secrets `EXPO_SCREENSHOT_EMAIL` y `EXPO_SCREENSHOT_PASSWORD`. Para que
esa cuenta tenga un menú bonito y analíticas llenas:

1. Pon las credenciales de la cuenta demo de producción en la terminal (no se
   guardan en ningún archivo):

   ```powershell
   $env:ENIU_EMAIL = "<correo de la cuenta demo>"
   $env:ENIU_PASSWORD = "<su contraseña>"
   ```

   Sin estas variables, el estudio usa `EXPO_SCREENSHOT_EMAIL` y `EXPO_SCREENSHOT_PASSWORD`.

2. Las analíticas y el plan se escriben directo en la base de datos. Define la
   URL de la base de producción (Render → base de datos de Postgres →
   *External Database URL*):

   ```powershell
   $env:DATABASE_URL = "<postgresql://… de producción>"
   ```

3. Comprueba la cuenta y su plan. La demo necesita plan Esencial o Pro: el
   gratuito sólo permite un menú de 15 productos, sin portada ni plantillas, y
   bloquea la pantalla de Analíticas. Si hace falta, súbele el plan (sin cobro):

   ```bash
   python tools/eniu-studio/studio.py --env prod whoami
   python tools/eniu-studio/studio.py --env prod plan set pro --yes
   ```

4. Crea el contenido y siembra las analíticas. Cada archivo es un negocio,
   y la cuenta puede tener varios:

   ```bash
   python tools/eniu-studio/studio.py --env prod demo apply tools/eniu-studio/demos/casa-nopal.json --with-stats --yes
   python tools/eniu-studio/studio.py --env prod demo apply tools/eniu-studio/demos/lantern-yard.json --with-stats --yes
   ```

   Sin `--with-stats` sólo se usa la API y no hace falta `DATABASE_URL`.

   Siembra justo antes de las capturas. La siembra llena hasta el final del
   día siguiente, en la zona de cada negocio, así que aguanta aunque Londres
   cambie de día mientras corre el workflow. Si capturas más tarde, los días
   nuevos salen vacíos y las comparaciones bajan. Volver a correr los mismos
   comandos sólo reemplaza lo sembrado.

   El workflow elige el negocio según el idioma: Casa Nopal en las capturas
   en español y en el App Preview, y Lantern Yard en las capturas en inglés
   (`mobile/eniu-mobile/.maestro/subflows/select-business.yaml`). Si cambias
   los nombres de las demos, cámbialos también ahí.

5. Corre el workflow desde GitHub (Actions → App Store Screenshots → Run
   workflow) o con `gh workflow run appstore-screenshots.yml`.

Lo mismo funciona contra staging con `--env staging` y el `DATABASE_URL` de staging.

Las cifras sembradas son de un restaurante de demostración. En anuncios,
preséntalas como ejemplo del producto, no como resultados de un cliente real.

## Seguridad

- Todo lo local vive en `.studio/` y git lo ignora: la base de datos, las
  fotos subidas, los secretos de la API local, la cuenta demo y los tokens de
  sesión. `local build` además escribe `client/eniu/.env.studio.local`, también
  ignorado.
- Contra staging o producción, el estudio nunca guarda contraseñas: las lee
  de variables de entorno y sólo guarda los tokens de sesión en
  `.studio/session-<entorno>.json`.
- Escribir en la base de datos de staging o producción exige `DATABASE_URL` y
  `--yes`. Antes de sembrar, el estudio comprueba que el menú existe en esa
  base, por si la URL es de otro entorno. Además, el menú siempre se resuelve
  con la sesión de la API, así que sólo se siembran menús de la cuenta con la
  que iniciaste sesión.
- Las analíticas de cada menú se guardan en una sola transacción (con `COPY`
  en Postgres): si el comando se corta, no queda nada a medias. Si otra
  conexión tiene la tabla bloqueada más de 20 s, se detiene con un aviso en
  vez de quedarse esperando.
- Borrar menús, categorías, productos o promociones pide `--yes`.

## Pruebas

```bash
python -m unittest discover tools/eniu-studio/tests
```
