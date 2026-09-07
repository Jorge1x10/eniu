# Correos de la campaña «1MESGRATIS»

La copia lista para pegar en la herramienta de correo. Son dos correos, uno
por segmento de `server/eniu-backend/scripts/export_campaign_audience.py`, en
español y en inglés.

Van en **texto plano** a propósito. Un correo de una persona a otra se ve como
un correo de una persona a otra; una plantilla con cabecera, botón y columnas
se ve como publicidad, la filtran más, y siendo el primer correo que Eniu
manda a sus negocios vale más que parezca lo que es. Por lo mismo, el
remitente es una persona (`jorge@eniu.app`), no un `no-reply`: en este correo
lo que se busca es que contesten.

## Antes de mandar

- [ ] El aviso de privacidad todavía dice «No usamos tus datos para
      publicidad» (`landing/eniuLanding/src/pages/legal/PrivacyEs.jsx`). Hay
      que declarar la finalidad secundaria y cómo darse de baja, en los dos
      idiomas, antes de este envío.
- [ ] En Stripe, que `1MESGRATIS` sea un **promotion code** —no sólo un
      cupón— apuntando a un cupón de 100 % con `duration: once`, y con tope de
      canjes y fecha de vencimiento.
- [ ] El enlace lleva al **panel web**. Un cupón de Stripe no existe para
      quien compra desde el App Store o Google Play.
- [ ] Dominio autenticado (SPF, DKIM, DMARC) en la herramienta de envío.
- [ ] Enlace de baja en el pie. Lo pone la herramienta sola; verifica que esté.

## Qué sustituir

| En el texto | Por |
| --- | --- |
| `[URL]` | `https://app.eniu.app/dashboard/settings` |
| `[FECHA]` | La fecha de vencimiento del código en Stripe |
| `[FIRMA]` | Tu nombre y `Eniu — eniu.app` |

Sobre el saludo: la exportación trae la columna `nombre` vacía cuando la
cuenta no tiene nombre, y un «Hola ,» delata el envío masivo más que
cualquier otra cosa. Lo más seguro es dejar «Hola:» para todos. Si quieres
personalizar, filtra el CSV por las filas con nombre y manda esa variante
aparte con `{{ contact.NOMBRE }}`.

---

## Correo A — segmento `publicado`

Para quien ya tiene al menos un menú publicado. Es el único que lleva el
código.

**Asunto:** Un mes de Esencial, por nuestra cuenta

*Alternativo para probar:* Te debemos un mes de Esencial

```
Hola:

Vi que ya tienes tu menú publicado en Eniu. Gracias, en serio: somos un
equipo muy chico y cada menú que se publica nos dice que esto sirve para
algo.

Te escribo para regalarte un mes del plan Esencial. Con él se te abren los
productos ilimitados, las cuatro plantillas, la portada y el fondo propios,
la pantalla de bienvenida, y las estadísticas de tu menú: cuánta gente lo
abre y qué platillos miran más. Eso último es lo que más nos piden.

El código es 1MESGRATIS y se escribe en la pantalla de pago:

[URL]

El primer mes queda en cero. Después son $129 al mes y puedes cancelarlo
cuando quieras desde tu cuenta, sin llamarle a nadie ni pedirlo por correo.
El código vence el [FECHA].

Si algo no te funciona, o si lo probaste y no te convenció, contéstame este
correo y dime qué le falta. Lo leo yo.

[FIRMA]
```

### Correo A en inglés

**Subject:** A month of Essential, on us

```
Hi,

I saw you already have your menu published on Eniu. Thank you — we're a very
small team, and every menu that goes live tells us this is worth building.

I'm writing to give you a free month of the Essential plan: unlimited
products, all four templates, your own cover and background, a welcome
screen, and your menu's stats — how many people open it and which dishes
they look at most. That last one is what people ask us for the most.

The code is 1MESGRATIS and you enter it at checkout:

[URL]

The first month is free. After that it's $129 MXN a month, and you can cancel
whenever you want from your account — no phone call, no email needed. The
code expires on [FECHA].

If something isn't working, or you tried it and weren't convinced, just reply
and tell me what's missing. I read these myself.

[FIRMA]
```

---

## Correo B — segmento `sin-publicar`

Para quien creó la cuenta y nunca publicó un menú. **Sin código**: un
descuento no le resuelve nada a quien todavía no ha visto el producto
funcionando. Lo que le falta es publicar, y eso es lo que se le ofrece.

Este correo genera trabajo manual, y ése es el punto: cada menú que montes
así es un cliente y además el contenido del viernes.

**Asunto:** ¿Te ayudo a publicar tu menú?

*Alternativo para probar:* Tu menú de Eniu se quedó a medias

```
Hola:

Creaste tu cuenta en Eniu hace un tiempo y tu menú se quedó a medias. No
pasa nada, es lo más normal del mundo: casi siempre es que nunca hubo un rato
tranquilo para sentarse a subir los platillos.

Te propongo algo: lo montamos juntos. Contéstame este correo con la carta que
tengas —una foto de la impresa sirve— y te la dejo publicada, con su código
QR listo para imprimir. Son unos diez minutos, los pongo yo, y no cuesta
nada: el plan Básico es gratis y así se queda.

Si prefieres hacerlo tú, la guía completa está aquí:

https://eniu.app/primeros-pasos

Y si ya no te interesa, contéstame igual y dime por qué. Saber qué nos faltó
me sirve más que el correo que no contestas.

[FIRMA]
```

### Correo B en inglés

**Subject:** Want a hand publishing your menu?

```
Hi,

You created your Eniu account a while back and your menu never quite got
finished. That's completely normal — usually it just means there was never a
quiet moment to sit down and add the dishes.

Here's an offer: let's do it together. Reply to this email with whatever menu
you have — a photo of the printed one works — and I'll leave it published,
with its QR code ready to print. It takes about ten minutes, I'll do them,
and it costs nothing: the Basic plan is free and stays free.

If you'd rather do it yourself, the full guide is here:

https://eniu.app/en/getting-started

And if you're just not interested any more, reply anyway and tell me why.
Knowing what we got wrong helps me more than an email you never answer.

[FIRMA]
```

---

## Cuándo mandarlo

Martes o miércoles, entre las 10 y las 11 de la mañana, hora de la Ciudad de
México: antes de la comida y con el día por delante para contestar. Evita
lunes, viernes y cualquier día de quincena.

Manda primero el correo A. El B genera trabajo manual, así que sale cuando
tengas la tarde libre para montar los menús que lleguen.

## Qué medir

- **Correo A:** cuántos canjean el código, no cuántos abren. El canje se ve en
  Stripe, en el propio promotion code.
- **Correo B:** cuántos contestan. Es el único número que importa ahí.
- Ambos: las bajas. Si pasan del 2 %, el problema es que el correo no se
  esperaba, y eso se arregla en el aviso de privacidad y en la frecuencia, no
  en la copia.
