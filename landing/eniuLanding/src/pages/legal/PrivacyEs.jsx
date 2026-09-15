import { LegalDoc, Seccion } from '../../components/LegalDoc.jsx'
import {
  ACTUALIZADA,
  CONTACTO,
  DOMICILIO,
  REPRESENTANTE_RU,
  REPRESENTANTE_UE,
  RESPONSABLE,
} from '../../data/legal.js'

/**
 * Un solo aviso para todos los países donde Eniu se usa.
 *
 * Antes estaba escrito sólo en clave mexicana —derechos ARCO, veinte días
 * hábiles— y eso deja de servir en cuanto lo abre alguien desde Europa. En vez
 * de publicar un aviso por región, que se desincronizan en cuanto uno cambia,
 * se escribe el que cumple con lo más exigente: el RGPD europeo pide detallar
 * la base jurídica de cada tratamiento, los plazos de conservación y las
 * transferencias internacionales, y nada de eso estorba a quien lee desde
 * México.
 *
 * Las menciones que sólo aplican en un territorio —el representante en la
 * Unión, la autoridad de control— van señaladas como tales.
 */
export default function PrivacyEs() {
  return (
    <LegalDoc title="Aviso de privacidad" updated={ACTUALIZADA}>
      <Seccion titulo="Quién trata tus datos">
        <p>
          {RESPONSABLE} es el responsable del tratamiento de los datos personales que se recaban a
          través de Eniu, con domicilio en {DOMICILIO}, México. Puedes escribirnos a{' '}
          <strong>{CONTACTO}</strong> para cualquier asunto relacionado con este aviso, incluido el
          ejercicio de tus derechos.
        </p>
        <p>
          No tenemos designado un delegado de protección de datos: el tratamiento que hacemos no
          alcanza los supuestos que obligan a nombrarlo. Las consultas se atienden en esa misma
          dirección.
        </p>
      </Seccion>

      <Seccion titulo="Representantes en la Unión Europea y el Reino Unido">
        <p>
          Eniu se opera desde México y no tiene establecimiento en el Espacio Económico Europeo ni en
          el Reino Unido. Cuando se ofrecen servicios a personas que están allí, ambos ordenamientos
          obligan a designar un representante local ante el que las autoridades y los interesados
          puedan dirigirse.
        </p>
        {REPRESENTANTE_UE ? (
          <p>
            Nuestro representante en la Unión Europea, a efectos del artículo 27 del RGPD, es{' '}
            <strong>{REPRESENTANTE_UE}</strong>.
          </p>
        ) : (
          <p>
            <strong>Designación pendiente.</strong> Estamos en proceso de designar nuestro
            representante en la Unión Europea y publicaremos sus datos aquí en cuanto lo esté. Hasta
            entonces puedes dirigirte directamente a {CONTACTO}, que atendemos con los mismos plazos
            y garantías que se describen más abajo.
          </p>
        )}
        {REPRESENTANTE_RU ? (
          <p>
            Nuestro representante en el Reino Unido es <strong>{REPRESENTANTE_RU}</strong>.
          </p>
        ) : (
          <p>
            <strong>Designación pendiente.</strong> Lo mismo aplica al representante en el Reino
            Unido, que es una designación distinta de la anterior y que publicaremos aquí.
          </p>
        )}
      </Seccion>

      <Seccion titulo="Qué datos recabamos">
        <p>
          <strong>Si tienes una cuenta en Eniu</strong>, recabamos tu nombre, nombre de usuario,
          correo electrónico y, si lo proporcionas, tu número de teléfono y foto de perfil. También
          los datos del negocio que registras: nombre, descripción, dirección, teléfono, WhatsApp,
          moneda y zona horaria, junto con las fotografías, menús, categorías y productos que subes.
        </p>
        <p>
          Si accedes con Google o con Apple, recibimos de ellos únicamente tu identificador de cuenta,
          tu correo y tu nombre. Nunca recibimos tu contraseña de esos servicios.
        </p>
        <p>
          <strong>Si contratas un plan de pago</strong>, guardamos el identificador que Stripe asigna
          a tu cuenta de cliente, el estado y las fechas de tu suscripción. Los datos de tu tarjeta se
          capturan directamente en Stripe: Eniu nunca los recibe ni los almacena.
        </p>
        <p>
          <strong>Si eres cliente de un negocio</strong> y abres un menú publicado, no te pedimos
          ningún dato ni necesitas cuenta. Registramos la visita de forma anónima: qué menú se abrió,
          cuándo, desde qué tipo de dispositivo y por qué vía llegaste (código QR, enlace, redes). No
          almacenamos tu dirección IP ni tu nombre.
        </p>
        <p>
          No guardamos nada en tu dispositivo: ni cookies, ni almacenamiento local, ni identificadores
          que sobrevivan a la visita. Mientras la página está abierta se usa un identificador aleatorio
          que vive sólo en la memoria del navegador y desaparece al cerrarla, y que se transforma con
          HMAC-SHA256 antes de guardarse en nuestros sistemas. Por eso el menú no te pide permiso para
          nada: no hay nada que permitir. Como contrapartida, si vuelves otro día no te reconocemos, y
          la estadística cuenta visitas, no personas.
        </p>
      </Seccion>

      <Seccion titulo="Para qué los usamos y con qué base jurídica">
        <p>
          El RGPD exige decir no sólo para qué se usan los datos, sino con qué legitimación. Estos son
          los tratamientos que hacemos:
        </p>
        <ul>
          <li>
            <strong>Darte acceso a tu cuenta y prestarte el servicio</strong> —publicar tus menús,
            guardar tus productos y fotografías, generar tu enlace y tu código QR—. Base:{' '}
            <em>ejecución del contrato</em> que aceptas al crear la cuenta. Sin estos datos no podemos
            prestarte el servicio.
          </li>
          <li>
            <strong>Cobrar tu suscripción</strong> y llevar la facturación. Base:{' '}
            <em>ejecución del contrato</em>, y <em>obligación legal</em> en lo que respecta a conservar
            los registros contables y fiscales.
          </li>
          <li>
            <strong>Enviarte correos relacionados con tu cuenta</strong>, como la recuperación de
            contraseña o avisos de cambios importantes en el servicio. Base:{' '}
            <em>ejecución del contrato</em>.
          </li>
          <li>
            <strong>Mantener el servicio seguro</strong>: prevenir accesos indebidos, abusos y fraude.
            Base: <em>interés legítimo</em> en proteger el servicio y a quienes lo usan.
          </li>
          <li>
            <strong>Mostrarte estadísticas agregadas</strong> de cuántas personas consultan tus menús.
            Base: <em>ejecución del contrato</em> contigo, que es quien contrata esa función, e{' '}
            <em>interés legítimo</em> en medir el uso del servicio. Los datos que la alimentan no
            identifican a ningún comensal.
          </li>
          <li>
            <strong>Atender requerimientos de autoridades</strong> cuando legalmente proceda. Base:{' '}
            <em>obligación legal</em>.
          </li>
        </ul>
        <p>
          No usamos tus datos para publicidad, no los vendemos a nadie y no tomamos decisiones
          automatizadas que produzcan efectos jurídicos sobre ti ni te afecten significativamente de
          modo similar.
        </p>
      </Seccion>

      <Seccion titulo="Con quién los compartimos">
        <p>
          Sólo con los proveedores necesarios para que el servicio funcione, y únicamente con lo que
          cada uno necesita. Actúan como encargados del tratamiento por cuenta nuestra, salvo Stripe,
          Google y Apple, que en su relación contigo son responsables de su propio tratamiento:
        </p>
        <ul>
          <li>
            <strong>Stripe</strong> procesa los pagos de la web y conserva los datos de facturación.
          </li>
          <li>
            <strong>RevenueCat</strong>, junto con <strong>Apple</strong> y <strong>Google</strong>,
            gestiona las suscripciones contratadas dentro de la aplicación móvil. En esas compras es
            la tienda quien cobra, no nosotros.
          </li>
          <li>
            <strong>Google</strong> y <strong>Apple</strong>, si eliges iniciar sesión con ellos.
          </li>
          <li>
            <strong>Render</strong> aloja el servidor y la base de datos, y <strong>Vercel</strong> el
            panel web y el sitio público.
          </li>
          <li>
            El proveedor de correo que usamos para enviarte mensajes de cuenta.
          </li>
        </ul>
        <p>También podríamos revelarlos si una autoridad competente lo requiere legalmente.</p>
      </Seccion>

      <Seccion titulo="Dónde se guardan y transferencias internacionales">
        <p>
          Los servidores y la base de datos están en Estados Unidos, y nosotros, como responsables,
          accedemos a ellos desde México. Si estás en el Espacio Económico Europeo o en el Reino
          Unido, eso significa que tus datos salen de tu territorio.
        </p>
        <p>
          Para amparar esas transferencias nos apoyamos en las cláusulas contractuales tipo aprobadas
          por la Comisión Europea —y en su adenda para el Reino Unido— suscritas con cada proveedor, y,
          cuando el proveedor está certificado en el marco EU-US Data Privacy Framework, en esa
          certificación. Puedes pedirnos copia de las garantías aplicables escribiendo a {CONTACTO}.
        </p>
      </Seccion>

      <Seccion titulo="Cuánto tiempo los conservamos">
        <ul>
          <li>
            <strong>Tu cuenta y su contenido</strong>: mientras la cuenta exista. Al eliminarla se
            borran de inmediato, sin copia de seguridad recuperable más allá de las rotaciones
            técnicas habituales de nuestros proveedores.
          </li>
          <li>
            <strong>Registros de facturación</strong>: el plazo que impone la normativa fiscal y
            contable aplicable, que puede llegar a diez años. Se conservan aunque borres la cuenta,
            porque la obligación de guardarlos no depende de ti ni de nosotros.
          </li>
          <li>
            <strong>Estadísticas de los menús</strong>: pueden conservarse aunque borres un menú
            concreto, porque no están asociadas a ninguna persona identificable.
          </li>
          <li>
            <strong>En el dispositivo del comensal</strong> no queda nada que conservar: el
            identificador de la visita vive en memoria y desaparece al cerrar la página.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Cómo eliminar tu cuenta">
        <p>
          Puedes eliminarla tú mismo en cualquier momento, sin pedírnoslo: en el panel web desde{' '}
          <strong>Configuración → Seguridad</strong>, y en la aplicación móvil desde{' '}
          <strong>Ajustes</strong>. Al hacerlo se eliminan tu cuenta, tus negocios, tus menús, tus
          productos y las fotografías que hayas subido, y los menús que tuvieras publicados dejan de
          estar disponibles. Si tienes una suscripción activa, se cancela antes de borrar nada. La
          eliminación es definitiva y no se puede deshacer.
        </p>
      </Seccion>

      <Seccion titulo="Tus derechos">
        <p>Sobre tus datos personales puedes ejercer estos derechos:</p>
        <ul>
          <li>
            <strong>Acceso</strong>: saber qué datos tuyos tratamos y obtener una copia.
          </li>
          <li>
            <strong>Rectificación</strong>: corregirlos si son inexactos o están incompletos.
          </li>
          <li>
            <strong>Supresión</strong>: pedir que los borremos, salvo los que tengamos obligación
            legal de conservar.
          </li>
          <li>
            <strong>Limitación</strong>: pedir que dejemos de usarlos mientras se resuelve una
            discrepancia sobre su exactitud o su licitud.
          </li>
          <li>
            <strong>Portabilidad</strong>: recibir en un formato estructurado y de uso común los datos
            que nos diste, y pedir que se transmitan a otro responsable cuando sea técnicamente
            posible.
          </li>
          <li>
            <strong>Oposición</strong>: oponerte a los tratamientos que hacemos por interés legítimo,
            por motivos relacionados con tu situación particular.
          </li>
          <li>
            <strong>Retirar el consentimiento</strong> cuando el tratamiento se base en él, sin que
            ello afecte a la licitud de lo hecho antes de retirarlo.
          </li>
        </ul>
        <p>
          La mayoría los ejerces directamente desde la aplicación: tus datos de perfil y de negocio son
          editables, y la eliminación de la cuenta está a tu alcance sin intermediarios. Para cualquier
          otra solicitud escríbenos a <strong>{CONTACTO}</strong>. Respondemos en el plazo de un mes
          desde la recepción; si la solicitud es compleja podemos prorrogarlo dos meses más,
          avisándote dentro de ese primer mes y explicando por qué. No cobramos por atenderlas.
        </p>
        <p>
          Si vives en México, estos derechos se corresponden con los que allí se conocen como derechos
          ARCO, y el plazo legal de respuesta es de veinte días hábiles: en ese caso aplicamos el que
          te resulte más favorable.
        </p>
      </Seccion>

      <Seccion titulo="Reclamar ante una autoridad">
        <p>
          Si consideras que no hemos atendido bien tu solicitud, o que tratamos tus datos de forma
          indebida, puedes reclamar ante la autoridad de control de protección de datos de tu país, con
          independencia de que nos escribas antes a nosotros. En España es la Agencia Española de
          Protección de Datos; en el Reino Unido, la Information Commissioner's Office; en México, el
          organismo garante en materia de protección de datos personales. En el resto del Espacio
          Económico Europeo, la autoridad del Estado donde residas, trabajes o donde se haya producido
          el hecho.
        </p>
      </Seccion>

      <Seccion titulo="Seguridad">
        <p>
          Las contraseñas se almacenan cifradas con bcrypt, nunca en claro. El tráfico viaja siempre
          por HTTPS y el acceso a la base de datos está restringido. Ningún sistema es infalible, pero
          trabajamos para que tus datos estén protegidos con medidas razonables, y si ocurriera una
          violación de seguridad que suponga un riesgo para tus derechos te lo comunicaríamos y lo
          notificaríamos a la autoridad que corresponda dentro de los plazos legales.
        </p>
      </Seccion>

      <Seccion titulo="Menores de edad">
        <p>
          Eniu está dirigido a personas que administran un negocio y no está pensado para menores de
          edad. No recabamos deliberadamente datos de menores.
        </p>
      </Seccion>

      <Seccion titulo="Cambios a este aviso">
        <p>
          Si modificamos este aviso publicaremos la versión actualizada en esta misma dirección y
          cambiaremos la fecha del encabezado. Si el cambio es significativo, te lo haremos saber por
          correo.
        </p>
      </Seccion>

      <p className="legal-foot">
        ¿Dudas sobre este aviso? Escríbenos a <strong>{CONTACTO}</strong>.
      </p>
    </LegalDoc>
  )
}
