import { Link } from "react-router";

// TODO: sustituir por los datos reales antes de publicar la política.
// Son los tres únicos huecos del documento; el resto describe lo que el
// sistema hace de verdad.
const RESPONSABLE = "[RAZÓN SOCIAL O NOMBRE DEL RESPONSABLE]";
const CONTACTO = "[correo-de-contacto@ejemplo.com]";
const DOMICILIO = "[domicilio fiscal o de contacto]";

const ACTUALIZADA = "28 de agosto de 2026";

function Seccion({ titulo, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-[#111111] sm:text-2xl">{titulo}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-[#444444]">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-dvh bg-[#FFFDF5] px-5 py-12">
      <article className="mx-auto w-full max-w-3xl">
        <Link to="/" className="text-sm font-semibold text-[#8A7420] underline underline-offset-4">Volver a Eniu</Link>
        <h1 className="mt-6 text-3xl font-black text-[#111111] sm:text-4xl">Aviso de privacidad</h1>
        <p className="mt-3 text-sm text-[#666666]">Última actualización: {ACTUALIZADA}</p>

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
          <ul className="ml-5 list-disc space-y-2">
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

        <p className="mt-12 border-t border-[#E9DDB7] pt-6 text-sm leading-7 text-[#666666]">
          ¿Dudas sobre este aviso? Escríbenos a <strong>{CONTACTO}</strong>.
        </p>
      </article>
    </main>
  );
}
