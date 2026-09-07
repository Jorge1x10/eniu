# Plan de lanzamiento · Mes 1

Campaña publicitaria y treinta días de contenido orgánico para Eniu. Escrito
para el punto de partida real: perfiles sin abrir, cero prueba social y mil
pesos al mes de presupuesto.

Los precios, límites y nombres de plantilla de este documento salen del
producto tal como está hoy. Si cambian en
`server/eniu-backend/app/modules/billing/plans.py` o en
`landing/eniuLanding/src/content/es.js`, hay que reflejarlos aquí: un plan de
marketing que promete algo que la app no permite cuesta más caro que uno
desactualizado.

## Índice

1. [Punto de partida](#1-punto-de-partida)
2. [La campaña](#2-la-campaña)
3. [Los anuncios](#3-los-anuncios)
4. [Orgánico y rutinas](#4-orgánico-y-rutinas)
5. [Calendario de 30 días](#5-calendario-de-30-días)
6. [Métricas y expectativas](#6-métricas-y-expectativas)

## 1. Punto de partida

Eniu le vende a un dueño o encargado de negocio de comida que administra todo
desde su celular, entre servicio y servicio. El producto ya está listo: plan
Básico gratuito (un negocio, un menú, quince productos con foto, QR y enlace
público, actualizaciones ilimitadas) y plan Esencial a $129 MXN al mes (hasta
tres negocios, cinco menús por negocio, productos ilimitados, las cuatro
plantillas y tipografías, portada, fondo, pantalla de bienvenida, estadísticas
y sin la insignia de Eniu). App en iOS y Android, panel web y landing en
`eniu.app`.

Lo que no está listo es la parte que sostiene una campaña. Cuatro cosas hay que
cerrarlas antes de gastar el primer peso.

### 1.1 Abrir los perfiles antes del día 1

`landing/eniuLanding/src/data/site.js` ya reserva `@eniu.app` en Instagram y
TikTok y «Eniu» en Facebook, pero los tres salen con el chip de «Pronto» porque
`socialLinks` tiene la `url` vacía. Hay que abrir las cuentas, publicar tres
piezas en cada una y sustituir las URLs; el chip desaparece solo. Un anuncio
que manda a un perfil vacío quema presupuesto.

### 1.2 Correo del dominio

El contacto público es hoy una dirección de Gmail porque `eniu.app` todavía no
tiene registros MX, según se documenta en el propio `site.js`. Con tráfico
pagado la gente escribe, y un `hola@eniu.app` sostiene el «Hecho en México» que
promete el pie de página.

### 1.3 Cero prueba social en la landing

No hay un solo testimonio, logo ni captura de un negocio real. El tráfico frío
llega, entiende el producto y no encuentra a nadie que ya lo use. Los pilares
«Antes/después» y «Negocios reales» del plan orgánico existen para producir esa
prueba; en cuanto haya tres casos, van a la home.

### 1.4 Definir los dos eventos de conversión

Antes de encender nada:

- `Lead` — cuenta creada.
- `CompleteRegistration` — menú publicado.

Optimizar por el primero mientras hay poco volumen y moverse al segundo en
cuanto se acumulen cincuenta por semana. Registrarse no es el negocio;
publicar el menú sí.

## 2. La campaña

### 2.1 Concepto: «Despega la cinta»

El enemigo no es el menú impreso, es el menú impreso desactualizado: el precio
tapado con cinta, el corrector encima del número viejo, el «eso ya no lo
tenemos» que se dice quince veces al día. Todo mundo en una cocina lo ha
vivido y nadie lo ha usado para vender un menú digital.

La campaña no habla de digitalización ni de transformación digital: habla de
aguacate caro, de limón por las nubes y del rollo de masking tape que vive
junto a la caja. Cada pieza empieza en ese detalle y termina en un cronómetro:
diez segundos para cambiar un precio, sin reimprimir nada.

Funciona porque es verificable en cámara. No hay que prometer un beneficio
abstracto: se graba la pantalla, se cambia el precio, se muestra el menú
actualizado. La demostración es el anuncio.

### 2.2 Líneas de campaña

| Línea | Dónde se usa |
| --- | --- |
| Subió el aguacate. Tu menú ya lo sabe. | Titular principal, video y estático |
| Sin reimprimir. Sin corrector. Sin pena. | Cierre de video |
| Tu menú tiene más cinta que platillos. | Gancho de contenido orgánico |
| El mismo QR de siempre. La carta de hoy. | Objeción «ya mandé a imprimir mis QR» |
| Publica tu carta hoy. Te va a costar $0. | Cierre de oferta |

### 2.3 A quién le hablamos

**Núcleo.** Dueño o encargado de fonda, taquería, cafetería, food truck,
marisquería o cocina económica en zonas urbanas de México — CDMX, Guadalajara,
Monterrey, Puebla, Querétaro, Mérida. De 25 a 55 años, administra desde el
celular, cambia precios varias veces al año y no tiene diseñador.

**Secundario.** Negocios que ya venden por WhatsApp y mandan un PDF o una foto
del menú. Su dolor es distinto y más fácil de resolver: el PDF ilegible.

### 2.4 Qué se pide en cada etapa

- **Frío:** crear cuenta gratis. Sin tarjeta, sin llamada, sin demo. El plan
  Básico es la oferta; no hay que esconderlo detrás del Esencial.
- **Retargeting:** terminar el menú. Buena parte de las cuentas nuevas se
  quedan a medias, y ese público es el más barato de recuperar.
- **Esencial ($129):** no se vende en el mes 1 con anuncios. Se vende dentro
  del producto, cuando el usuario choca con el tope de quince productos o
  quiere ver sus estadísticas.

### 2.5 Reparto del presupuesto · $1,000 MXN al mes

Con mil pesos al mes —unos treinta y tres al día— no se compra adquisición: se
compra aprendizaje. Conviene decirlo sin rodeos, porque el error más caro con
este presupuesto es repartirlo como si fuera grande.

Meta necesita unos cincuenta eventos de conversión por semana y por conjunto de
anuncios para salir de la fase de aprendizaje. A $33 diarios, con un costo por
registro de $25 a $40 MXN, salen menos de diez registros por semana: el
algoritmo nunca aprende, y un conjunto en aprendizaje permanente entrega el peor
costo posible. **Con este presupuesto no se hace prospección fría.**

Lo que sí funciona con mil pesos:

| Línea | Mes | Cuándo | Qué hace |
| --- | ---: | --- | --- |
| **Impulso de ganadores orgánicos** (Meta y TikTok Spark Ads) | $600 | Desde el día 8 | Solo piezas que ya funcionaron solas. De $60 a $100 por pieza, entre seis y diez impulsos en el mes. Objetivo: alcance e interacción. |
| **Meta · Retargeting** | $400 | Días 15-30 | Unos $28 diarios. Visitantes de `eniu.app`, quien vio el 50% de un video y quien interactuó con los perfiles. Optimiza a `Lead`. |
| **Total** | **$1,000** | | |

El impulso no es solo alcance: cada peso ahí construye el público personalizado
que después usa el retargeting. Por eso va primero en el calendario y por eso el
retargeting no arranca hasta el día 15.

### 2.6 La regla del impulso

Solo se impulsa una pieza que, sin ayuda, alcanzó al menos el triple del
promedio de la cuenta, o juntó veinte guardados o compartidos. Nunca se impulsa
una pieza recién publicada «a ver si jala»: eso es pagar por descubrir lo que el
orgánico dice gratis en cuarenta y ocho horas.

El impulso se hace desde la publicación existente —Spark Ads en TikTok,
publicación existente en Meta— y no como creatividad nueva: así los «me gusta»,
comentarios y compartidos se acumulan en la misma pieza en vez de repartirse.

### 2.7 Qué se agrega primero cuando haya más presupuesto

En este orden, y no en otro:

1. Subir el retargeting a $40 diarios y dejarlo corriendo todo el mes.
2. Google Búsqueda con «menú digital qr», «carta digital para restaurante» y la
   marca en concordancia exacta, unos $600 al mes.
3. Recién entonces, prospección fría en Meta — y nunca por debajo de $100
   diarios sostenidos. Mejor diez días a $100 que treinta a $33: una ventana
   concentrada sí junta datos, un goteo no.

## 3. Los anuncios

Con mil pesos al mes los anuncios dejan de producirse aparte: **son las piezas
del calendario que funcionaron**. Se graban como contenido, se publican como
contenido, y las que destacan se impulsan. Solo dos se escriben específicamente
para pauta, y las dos son de retargeting.

Las fichas de abajo son la referencia creativa. A1, A2, A3 y A5 son piezas
orgánicas del calendario y candidatas a impulso; A4 y A6 son los dos anuncios de
retargeting, que arrancan el día 15.

Todas en vertical 9:16, subtituladas y legibles sin sonido: se ven en una
cocina, con ruido.

### A1 · La cinta — pieza orgánica, video 15 s

**Idea.** Plano cerrado de un menú plastificado con un precio tapado con cinta.
Una mano la despega. Corte a un celular con el menú de Eniu y el precio nuevo.

- **Texto principal:** Subió el aguacate otra vez. ¿Vas a volver a tapar el
  precio con cinta? Con Eniu cambias precios, fotos y platillos desde tu
  celular y tu carta se actualiza al instante. Gratis para empezar, sin
  tarjeta.
- **Titular:** Tu menú se actualiza en 10 segundos
- **Descripción:** Plan Básico gratis, sin tarjeta
- **Botón:** Registrarte

### A2 · El cronómetro — pieza orgánica (D5), video 12 s

**Idea.** Grabación de pantalla real, sin edición: abrir la app, tocar el
producto, escribir el precio nuevo, guardar. Cronómetro sobreimpuesto todo el
tiempo. Termina al escanear el QR y ver el cambio.

- **Texto principal:** Esto es cambiar un precio en Eniu. Sin reimprimir, sin
  diseñador, sin esperar a nadie. Tus clientes escanean el mismo QR de siempre
  y ven la carta de hoy.
- **Titular:** Cambia tu carta sin reimprimir
- **Descripción:** Menú digital con QR desde $0
- **Botón:** Más información

### A3 · Antes / después — pieza orgánica (D3, D10), carrusel de 3

**Idea.** Tarjeta 1, foto real de una carta gastada. Tarjeta 2, el mismo menú
en Eniu, en un celular, sobre la misma mesa. Tarjeta 3, el QR sobre fondo
amarillo.

- **Texto principal:** Del menú plastificado con corrector a una carta que se
  ve como tu negocio. Elige plantilla, sube tus fotos y comparte tu QR el mismo
  día.
- **Titulares:** 1) Antes: cinta y corrector · 2) Después: tu carta, en su
  celular · 3) Publícala gratis hoy
- **Botón:** Registrarte

### A4 · El precio — anuncio de retargeting, estático

**Idea.** Tipografía grande sobre amarillo Eniu: «$0». Abajo, en letra chica,
exactamente qué incluye. Sin foto de comida: destaca justo porque nadie más lo
hace en ese feed.

- **Texto principal:** Menú digital con código QR, gratis. Un menú, hasta
  quince productos con foto, enlace público y actualizaciones ilimitadas. Si tu
  negocio crece, el plan Esencial cuesta $129 al mes y puedes cancelarlo cuando
  quieras.
- **Titular:** Publica tu menú digital gratis
- **Descripción:** Sin tarjeta · Hecho en México
- **Botón:** Registrarte

### A5 · El testimonio — pieza orgánica (D17), video 20 s

**Idea.** Grabado en su cocina, con delantal, sin guion aprendido. Una sola
pregunta: «¿qué hacías antes cuando cambiabas un precio?». Se edita a veinte
segundos.

- **Texto principal:** «Antes reimprimía la carta cada temporada y aun así
  terminaba corrigiendo con pluma. Ahora la cambio desde la cocina.» —
  [Nombre], [negocio], [ciudad].
- **Titular:** Negocios reales, carta al día
- **Nota:** pedir permiso por escrito para usarlo en anuncios, y guardarlo.

### A6 · Te faltó publicar — anuncio de retargeting, desde el día 15

**Público.** Visitó `eniu.app` en 30 días, o creó cuenta y no publicó menú.
Excluir a quien ya publicó.

- **Texto principal:** Ya tienes la cuenta. Te faltan diez minutos: sube tus
  platillos, elige plantilla y comparte tu QR. Si te atoras en algo, escríbenos
  y lo terminamos contigo.
- **Titular:** Termina tu menú
- **Descripción:** Seis pasos, unos doce minutos
- **Botón:** Más información

## 4. Orgánico y rutinas

El orgánico no es el complemento de la campaña: con un producto de $129 al mes,
es lo único que hace sostenible el costo de adquisición.

La regla de producción es una sola: **todo lo vertical se publica en Instagram
Reels y TikTok, sin excepción**, y lo que funciona se recorta a historias. No se
produce por red, se produce una vez y se reparte.

### 4.1 Los cinco pilares

| Pilar | Peso | Qué es | Formato |
| --- | ---: | --- | --- |
| **Enséñalo** | 30% | Micro-tutoriales de una sola acción, grabados de la pantalla real: cambiar un precio, marcar agotado, reordenar categorías, cambiar plantilla. | Reel, TikTok |
| **Duele** | 20% | La cinta, el corrector, el PDF que hay que ampliar con dos dedos, el pizarrón borrado a medias. Reconocimiento puro: aquí llegan los comentarios. | Reel, carrusel |
| **Antes / después** | 20% | El formato con más alcance y el más compartible. Carta vieja, menú Eniu, quince segundos, sin voz. | Reel, carrusel, estático |
| **Negocios reales** | 15% | Un negocio por semana, con nombre y ciudad. Contenido hoy y testimonios para la landing mañana. | Reel, post, historias |
| **Carta que vende** | 15% | Ingeniería de menú aplicada a negocios mexicanos: qué platillo va arriba, qué foto sí antoja, cómo se lee un precio. Aquí entran las estadísticas de Eniu. | Carrusel, reel |

### 4.2 Rutina semanal · una persona, unas seis horas

| Día | Tiempo | Qué se hace |
| --- | --- | --- |
| Domingo | 2-3 h | **Bloque de producción.** Grabar los cinco videos de la semana de corrido: mismo lugar, misma luz. Escribir los cinco copys y programar lo que se pueda. Es el único bloque largo de la semana y es innegociable. |
| Lunes | 20 min | **Reel educativo.** El de mayor esfuerzo va el lunes. Publicar entre 12:00 y 14:00, la hora muerta entre comidas. |
| Martes | 20 min | **Carrusel más historia con encuesta.** La encuesta da la idea de contenido de la semana siguiente sin tener que inventarla. |
| Miércoles | 20 min | **Antes / después.** El formato de más alcance, a media semana. Mencionar el enlace de la bio dentro del video, no solo en el texto. |
| Jueves | 45 min | **Historias más prospección.** Tres o cuatro historias de producto y media hora comentando de verdad en diez cuentas de negocios de comida locales. Nada de «qué buen post». |
| Viernes | 25 min | **Negocio real.** El caso de la semana, etiquetando al negocio: casi siempre lo comparte, y su público es exactamente el nuestro. |
| Sábado | 15 min | **Ligero.** Repost de alguien que publicó su menú, o un estático con el QR de la demo. |

### 4.3 Rutina diaria · 20 minutos

- **Primeros 60 minutos tras publicar:** contestar cada comentario.
- **Diez comentarios al día** en cuentas de fondas, cafés y proveedores de la
  ciudad, desde la cuenta de Eniu.
- **Bandeja a cero:** ningún mensaje directo sin responder al cerrar el día,
  aunque sea para decir que mañana se ve.

### 4.4 Rutina mensual

Los días 29 y 30 son de medición, no de publicación: reporte en una hoja, tres
mejores y tres peores videos con el porqué escrito, y republicación del ganador
con gancho nuevo.

### 4.5 Rutina de calle · 2 horas por semana

Con mil pesos de pauta, el canal más rentable no está en internet. Dos horas a
la semana, un día fijo, visitando diez negocios de comida de la zona con un QR
impreso del menú demo en la mano.

El guion es corto: enseñar el menú demo en el celular del dueño, no en el
propio; ofrecer montarle el menú ahí mismo en diez minutos, gratis; salir con el
menú publicado o con su WhatsApp. De cada diez visitas suelen salir dos o tres
menús publicados, y cada uno es además el contenido del viernes.

Es el mismo trabajo del día 25 del calendario, pero cada semana. Si algo de este
plan hay que hacer sin falta, es esto.

### 4.6 Orgánico que no es redes

- **Búsqueda.** Una página en `eniu.app` por plantilla —«menú digital para
  taquería», «carta digital para cafetería»— con la demo embebida. El
  `sitemap.xml` ya existe; solo hay que darle qué indexar.
- **WhatsApp.** El enlace público del menú es contenido en sí mismo. Darle a
  cada negocio un texto listo para mandarle a sus clientes.
- **Comunidad.** Grupos de dueños de restaurantes en Facebook. Se entra a
  ayudar durante dos semanas antes de mencionar el producto una sola vez.

## 5. Calendario de 30 días

Cada semana tiene un trabajo distinto que hacer. Los ganchos están escritos
para usarse tal cual: son la primera línea del video o la primera lámina del
carrusel.

### Semana 1 · Existimos

Objetivo: abrir perfiles y encontrar el nervio.

**D1 · Lunes — Reel y TikTok · Marca**
«Tu menú tiene más cinta que platillos.» Presentación de Eniu en veinticinco
segundos: qué es, para quién y cuánto cuesta. Decir el precio en voz alta,
incluido el cero.
*CTA: síguenos, el enlace está en la bio.*

**D2 · Martes — Carrusel · Duele**
«5 señales de que tu carta ya caducó»: precio tapado con cinta, foto borrosa de
2019, PDF que hay que ampliar, plastificado despintado, «eso ya no lo tenemos».
*CTA: guarda esto si te viste reflejado.*

**D3 · Miércoles — Reel y TikTok · Antes/después**
«Misma mesa. Misma carta. Dos épocas.» Quince segundos, sin voz: solo texto en
pantalla y el ruido real de la cocina de fondo.
*CTA: ¿quieres el tuyo así? Enlace en la bio.*

**D4 · Jueves — Historias · Comunidad**
«¿Cada cuánto cambias tus precios?» Encuesta de tres opciones: cada mes, dos
veces al año, cuando ya no aguanto. Después, caja de preguntas: «¿qué es lo que
más te choca de tu menú?».
*CTA: responde, contestamos todas.*

**D5 · Viernes — Reel y TikTok · Enséñalo**
«Subió el aguacate. Mira cuánto tardo.» Grabación de pantalla con cronómetro
visible. Diez segundos reales, sin cortes ni acelerado. Este video se convierte
en el anuncio A2.
*CTA: pruébalo gratis, sin tarjeta.*

**D6 · Sábado — Post · Enséñalo**
«Escanea. Así se ve un menú hecho en Eniu.» QR grande sobre amarillo,
apuntando al menú demo. Cero explicación: que lo descubran escaneando.
*CTA: escanea y dinos qué le cambiarías.*

**D7 · Domingo — Historias y producción · Rutina**
Detrás de cámaras del primer bloque. Grabar los cinco videos de la semana 2,
publicar dos historias del proceso y una encuesta: «¿qué video quieres ver?».

### Semana 2 · Enseñamos

Objetivo: utilidad pura, sin vender. **Hito de pauta:** a partir del día 8 se
impulsa la primera pieza de la semana 1 que haya superado el umbral.

**D8 · Lunes — Reel y TikTok · Enséñalo**
«El error número uno del menú QR: subir un PDF.» Mostrar el zoom infinito con
dos dedos contra un menú que se lee de un vistazo.
*CTA: guárdalo antes de mandar a hacer tus QR.*

**D9 · Martes — Carrusel · Carta que vende**
«Los 4 tipos de platillo que tiene tu carta»: estrella, caballo de batalla,
rompecabezas y perro, con ejemplos de taquería. Termina en «¿sabes cuál es cuál
en la tuya?».
*CTA: dinos cuál es tu estrella.*

**D10 · Miércoles — Reel y TikTok · Antes/después**
«Del pizarrón borroso al menú en su celular.» Caso de cafetería. Cambiar el
tipo de negocio cada semana para que el formato no se agote.
*CTA: enlace en la bio.*

**D11 · Jueves — Historias · Enséñalo**
«Se acabó la birria: dos toques y listo.» Tutorial en tres pantallas de marcar
un producto como agotado.
*CTA: desliza hacia arriba para probar.*

**D12 · Viernes — Reel y TikTok · Duele**
«Lo que te cuesta reimprimir tu carta al año.» Números en pantalla: treinta
menús plastificados por temporada, tres temporadas al año, comparados con $0 y
con $129 al mes. Usar las cifras de una imprenta local, sin exagerar.
*CTA: haz tus cuentas y dinos.*

**D13 · Sábado — Post · Negocios reales**
«El primer menú publicado por alguien que no somos nosotros.» Captura real, con
permiso, y dos líneas de la historia del negocio. Etiquetarlo.
*CTA: etiqueta a un negocio que lo necesita.*

**D14 · Domingo — Historias y producción · Rutina**
«Pregúntanos lo que sea de menús digitales.» Caja de preguntas abierta: las
respuestas son el guion de los reels de objeciones de la semana 3.

### Semana 3 · Nos creen

Objetivo: resolver objeciones y mostrar gente real. **Hito de pauta:** el día 15
arranca el retargeting con los anuncios A6 y A4.

**D15 · Lunes — Reel y TikTok · Duele**
«¿Y si mi cliente no sabe escanear un QR?» La objeción más común, respondida
con honestidad: la cámara del celular lo hace sola, y aun así hay que dejar dos
cartas impresas en la barra. No prometer que nadie las va a pedir.
*CTA: comenta tu duda, la contestamos en video.*

**D16 · Martes — Carrusel · Enséñalo**
«Las 4 plantillas y a qué negocio le queda cada una»: Moderna para fondas y
taquerías con foto, Minimalista para cafés y barras, Elegante para restaurante
de mantel, Impactante para food trucks y bares.
*CTA: ¿cuál eres tú?*

**D17 · Miércoles — Reel y TikTok · Negocios reales**
«Un día con [negocio]: cómo cambia su carta entre comida y cena.» Grabado en su
cocina. De aquí sale el testimonio del anuncio A5: pedir el permiso por escrito
el mismo día.
*CTA: enlace en la bio.*

**D18 · Jueves — Historias · Enséñalo**
«Gratis vs. $129: qué abre cada plan.» Comparación honesta en cuatro pantallas,
cerrando con la recomendación de empezar en el gratuito.
*CTA: empieza en el Básico.*

**D19 · Viernes — Reel y TikTok · Carta que vende**
«Los platillos que más miran casi nunca son los que más vendes.» Usar las
estadísticas de Eniu: vistas del menú y productos más vistos. Un dato real de
un negocio vale más que cualquier teoría.
*CTA: mídelo en tu propio menú.*

**D20 · Sábado — Post · Marca**
«Hecho en México, por dos personas.» Quién está detrás y por qué existe Eniu.
Foto real, no ilustración. Construye la confianza que la landing todavía no
tiene.

**D21 · Domingo — Historias y producción · Rutina**
«¿Qué te gustaría que hiciera Eniu y hoy no hace?» Encuesta abierta: sirve para
contenido y para la hoja de ruta del producto. Grabar la semana 4.

### Semana 4 · Convertimos

Objetivo: empujar a publicar el primer menú.

**D22 · Lunes — Reel largo y TikTok · Enséñalo**
«Te acompaño a publicar tu menú en 12 minutos.» Sesenta segundos con los seis
pasos reales del onboarding, en tiempo real y sin cortes tramposos.
*CTA: hazlo conmigo, enlace en la bio.*

**D23 · Martes — Carrusel · Enséñalo**
«Tu menú digital en 6 pasos (guárdalo).» Checklist visual: cuenta, negocio,
productos, estilo, QR, medir. Formato pensado para guardarse, no para gustar.
*CTA: guárdalo y hazlo hoy.*

**D24 · Miércoles — Reel y TikTok · Antes/después**
«El antes/después que más se compartió, con final nuevo.» Volver a grabar el
mejor del mes con otro negocio y con llamada a la acción explícita al final.
*CTA: enlace en la bio.*

**D25 · Jueves — Historias y mensajes directos · Negocios reales**
«Hoy montamos gratis el menú de 5 negocios.» Escríbenos «MENÚ» por mensaje
directo. Es la mejor jugada del mes: genera clientes, contenido y testimonios
de un solo golpe. Hay que bloquear la tarde en la agenda.
*CTA: mándanos MENÚ por DM.*

**D26 · Viernes — Carrusel · Negocios reales**
«Los 5 menús que montamos ayer», con nombre y ciudad de cada negocio y su QR.
Etiquetarlos a todos: cinco cuentas compartiendo el mismo día.
*CTA: ¿quieres ser de los de la próxima semana?*

**D27 · Sábado — Reel y TikTok · Marca**
«5 cosas que aprendimos en 30 días hablando con cocinas.» Aprendizajes
honestos, incluido alguno incómodo. Cierra el mes construyendo comunidad, no
vendiendo.
*CTA: síguenos para el mes 2.*

**D28 · Domingo — Historias · Rutina**
«Gracias, y esto viene en el mes 2.» Recordatorio del enlace y adelanto real de
lo que sigue. Cerrar con la caja de preguntas otra vez.
*CTA: enlace en la bio.*

### Cierre · Medimos y reciclamos

Objetivo: decidir el mes 2 con datos, no con ganas.

**D29 · Lunes — Sin publicar · Rutina**
Reporte del mes en una sola hoja: alcance, seguidores, sesiones, cuentas
creadas, menús publicados, suscripciones y costo por menú publicado. Elegir los
tres mejores videos y los tres peores, y escribir por qué.

**D30 · Martes — Post y Spark Ads · Marca**
El mejor contenido del mes, republicado con copy nuevo: casi nadie lo vio la
primera vez. Detrás, el último impulso del mes. Planear el mes 2 sobre lo que
ya funcionó.

## 6. Métricas y expectativas

Rangos realistas para un primer mes con $1,000 MXN de pauta y perfiles recién
abiertos. La mayor parte de estos números los produce el orgánico y la rutina de
calle, no los anuncios: con este presupuesto la pauta amplifica, no adquiere.

| Indicador | Meta mes 1 | Dónde se mide y qué significa |
| --- | ---: | --- |
| Alcance orgánico | 15,000-30,000 | Instagram y TikTok. Con cuentas nuevas, un solo video puede aportar la mitad. |
| Seguidores nuevos | 250-500 | Importa poco por sí solo; importa como público personalizado para el retargeting. |
| Sesiones en `eniu.app` | 600-1,000 | Con UTM por canal desde el día 1. Sin UTM, este mes no se puede leer. |
| **Cuentas creadas** | 45-75 | Evento `Lead`. Entre quince y veinte vendrán de la calle, no de internet. |
| **Menús publicados** | 18-32 | La métrica reina: del 35% al 45% de las cuentas. Por debajo de 30%, revisar los seis pasos del onboarding antes de gastar un peso más. |
| Suscripciones Esencial | 2-4 | Del 8% al 12% de quienes publicaron. Casi siempre disparadas por el tope de quince productos. |
| MRR nuevo | $258-$516 | MXN al mes. |
| Costo por menú publicado (mezclado) | ≤ $45 | MXN. Los $1,000 entre todos los menús publicados, vengan de donde vengan. Este es el número que se compara mes contra mes. |
| Costo por registro en retargeting | ≤ $30 | MXN. Es el único costo por anuncio que se puede leer con este presupuesto. |
| **Piezas ganadoras identificadas** | 2-3 | Videos que superaron el triple del alcance promedio sin pauta. Es el entregable más valioso del mes. |

Si el retargeting cuesta más de $50 por registro, el problema es la creatividad.
Si el costo está bien pero no hay menús publicados, el problema es el
onboarding, no el marketing.

### 6.1 La cuenta que hay que tener clara desde ahora

A $129 MXN al mes, un suscriptor que costó $300 de adquisición se paga en poco
más de dos meses; uno que costó $900, en siete. Con mil pesos al mes el número
sostenible es el primero, y solo se consigue si la mayor parte de las
activaciones llega por orgánico y por la calle. En cuanto la pauta empiece a
cargar con la adquisición, ese costo sube — por eso el orden de la sección 2.7
importa.

Con este presupuesto, el mes 1 tiene un solo trabajo: **encontrar dos o tres
piezas de contenido que funcionen sin pauta**. Eso es lo que se impulsa el mes 2
y lo que baja el costo por menú publicado. Un mes que termina con veinte menús
publicados y dos videos repetibles vale más que uno con cuarenta menús y ninguna
pieza que se pueda volver a usar.
