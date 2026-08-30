import { LegalDoc, Seccion } from '../../components/LegalDoc.jsx'
import { ACTUALIZADA, CONTACTO, DOMICILIO, RESPONSABLE } from '../../data/legal.js'

export default function PrivacyEs() {
  return (
    <LegalDoc title="Aviso de privacidad" updated={ACTUALIZADA}>
      <Seccion titulo="Quién trata tus datos">
        <p>
          {RESPONSABLE} es responsable del tratamiento de los datos personales que se recaban a través de
          Eniu, con domicilio en {DOMICILIO}. Puedes escribirnos a <strong>{CONTACTO}</strong> para
          cualquier asunto relacionado con este aviso.
        </p>
      </Seccion>

      <Seccion titulo="Qué datos recabamos">
        <p><strong>Si tienes una cuenta en Eniu</strong>, recabamos tu nombre, nombre de usuario, correo
        electrónico y, si lo proporcionas, tu número de teléfono y foto de perfil. También los datos del
        negocio que registras: nombre, descripción, dirección, teléfono, WhatsApp, moneda y zona horaria,
        junto con las fotografías, menús, categorías y productos que subes.</p>
        <p>Si accedes con Google o con Apple, recibimos de ellos únicamente tu identificador de cuenta,
        tu correo y tu nombre. Nunca recibimos tu contraseña de esos servicios.</p>
        <p><strong>Si eres cliente de un negocio</strong> y abres un menú publicado, no te pedimos ningún
        dato ni necesitas cuenta. Registramos la visita de forma anónima: qué menú se abrió, cuándo, desde
        qué tipo de dispositivo y por qué vía llegaste (código QR, enlace, redes). El identificador de
        visitante se guarda transformado con HMAC-SHA256, de modo que no puede revertirse ni asociarse a
        una persona. No almacenamos tu dirección IP ni tu nombre.</p>
      </Seccion>

      <Seccion titulo="Para qué los usamos">
        <p>Para darte acceso a tu cuenta y mantenerla segura, publicar los menús que creas, mostrarte
        estadísticas agregadas de cuántas personas los consultan, cobrar tu suscripción cuando contratas
        un plan de pago, y enviarte correos relacionados con tu cuenta, como la recuperación de
        contraseña. No usamos tus datos para publicidad ni los vendemos a nadie.</p>
      </Seccion>

      <Seccion titulo="Con quién los compartimos">
        <p>Sólo con los proveedores necesarios para que el servicio funcione, y únicamente con lo que cada
        uno necesita:</p>
        <ul>
          <li><strong>Stripe</strong> procesa los pagos. Los datos de tu tarjeta se capturan directamente
          en su plataforma: Eniu nunca los recibe ni los almacena.</li>
          <li><strong>Google</strong> y <strong>Apple</strong>, si eliges iniciar sesión con ellos.</li>
          <li><strong>Render</strong> aloja el servidor y la base de datos, y <strong>Vercel</strong> el
          panel web. Ambos operan en Estados Unidos, por lo que tus datos se almacenan allí.</li>
        </ul>
        <p>También podríamos revelarlos si una autoridad competente lo requiere legalmente.</p>
      </Seccion>

      <Seccion titulo="Cuánto tiempo los conservamos">
        <p>Mientras tu cuenta exista. Las estadísticas anónimas de los menús pueden conservarse aunque
        borres un menú concreto, porque ya no están asociadas a ninguna persona identificable.</p>
      </Seccion>

      <Seccion titulo="Cómo eliminar tu cuenta">
        <p>Puedes eliminarla tú mismo en cualquier momento, sin pedírnoslo: en el panel web desde
        <strong> Configuración → Seguridad</strong>, y en la aplicación móvil desde <strong>Ajustes</strong>.
        Al hacerlo se eliminan tu cuenta, tus negocios, tus menús, tus productos y las fotografías que
        hayas subido, y los menús que tuvieras publicados dejan de estar disponibles. Si tienes una
        suscripción activa, se cancela antes de borrar nada. La eliminación es definitiva y no se puede
        deshacer.</p>
      </Seccion>

      <Seccion titulo="Tus derechos">
        <p>Puedes acceder a tus datos, rectificarlos si son inexactos, cancelarlos u oponerte a su
        tratamiento —los llamados derechos ARCO—, así como revocar tu consentimiento. La mayoría los
        ejerces directamente desde la aplicación: tus datos de perfil y de negocio son editables, y la
        eliminación de la cuenta está a tu alcance sin intermediarios. Para cualquier otra solicitud
        escríbenos a {CONTACTO} y te responderemos en un plazo máximo de veinte días hábiles.</p>
      </Seccion>

      <Seccion titulo="Seguridad">
        <p>Las contraseñas se almacenan cifradas con bcrypt, nunca en claro. El tráfico viaja siempre por
        HTTPS y el acceso a la base de datos está restringido. Ningún sistema es infalible, pero
        trabajamos para que tus datos estén protegidos con medidas razonables.</p>
      </Seccion>

      <Seccion titulo="Menores de edad">
        <p>Eniu está dirigido a personas que administran un negocio y no está pensado para menores de
        edad. No recabamos deliberadamente datos de menores.</p>
      </Seccion>

      <Seccion titulo="Cambios a este aviso">
        <p>Si modificamos este aviso publicaremos la versión actualizada en esta misma dirección y
        cambiaremos la fecha del encabezado. Si el cambio es significativo, te lo haremos saber por
        correo.</p>
      </Seccion>

      <p className="legal-foot">
        ¿Dudas sobre este aviso? Escríbenos a <strong>{CONTACTO}</strong>.
      </p>
    </LegalDoc>
  )
}
