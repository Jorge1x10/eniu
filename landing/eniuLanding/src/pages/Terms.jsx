import { Link } from '../router.jsx'
import { LegalDoc, Seccion } from '../components/LegalDoc.jsx'
import { ACTUALIZADA, CONTACTO, RESPONSABLE } from '../data/legal.js'

export default function Terms() {
  return (
    <LegalDoc title="Términos y condiciones" updated={ACTUALIZADA}>
      <Seccion titulo="Qué es Eniu">
        <p>Eniu es un servicio de {RESPONSABLE} que te permite crear menús digitales para tu negocio,
        publicarlos en una dirección web propia, compartirlos mediante un código QR y consultar
        estadísticas de cuántas personas los ven. Al crear una cuenta aceptas estos términos.</p>
      </Seccion>

      <Seccion titulo="Tu cuenta">
        <p>Necesitas una cuenta para usar Eniu y eres responsable de mantener segura tu contraseña y de
        lo que ocurra desde tu cuenta. Debes proporcionar datos reales y mantenerlos al día. Puedes
        eliminar tu cuenta cuando quieras desde Configuración en el panel web o desde Ajustes en la
        aplicación; al hacerlo se borran tus negocios, menús, productos y fotografías, y no se puede
        deshacer.</p>
      </Seccion>

      <Seccion titulo="El contenido que publicas">
        <p>Los menús, textos, precios y fotografías que subes siguen siendo tuyos. Nos concedes
        únicamente el permiso necesario para almacenarlos y mostrarlos a quienes abran tus menús
        publicados, que es el servicio que contrataste.</p>
        <p>Te haces responsable de tener derecho a publicar lo que subes y de que la información sea
        veraz —precios, ingredientes, alérgenos y cualquier dato que la ley te obligue a mostrar en tu
        giro—. Eniu es la herramienta que publica tu menú; no verifica ni responde por su contenido.</p>
        <p>Podemos retirar contenido ilegal, fraudulento o que infrinja derechos de terceros, y
        suspender cuentas que lo publiquen de forma reiterada.</p>
      </Seccion>

      <Seccion titulo="Planes y pagos">
        <p>Eniu ofrece un plan gratuito con límites y planes de pago con más funciones. Los planes de
        pago se cobran por adelantado y se renuevan cada mes hasta que los canceles. El pago lo procesa
        Stripe; Eniu no recibe ni almacena los datos de tu tarjeta.</p>
        <p>Puedes cancelar cuando quieras desde el portal de facturación y conservarás el acceso hasta
        el final del periodo ya pagado. Los importes cobrados no son reembolsables salvo que la ley lo
        exija. Si cambias a un plan inferior o cancelas, las funciones que dejan de estar incluidas se
        desactivan: tus menús se despublican y la personalización vuelve a la básica. Nada se borra, y
        recuperas todo al contratar de nuevo.</p>
        <p>Podemos cambiar los precios avisándote con antelación razonable. El cambio nunca afecta a un
        periodo ya pagado.</p>
      </Seccion>

      <Seccion titulo="Disponibilidad del servicio">
        <p>Trabajamos para que Eniu esté disponible, pero no podemos garantizar que funcione sin
        interrupciones. Puede haber mantenimientos, fallos o cortes de nuestros proveedores. Si una
        interrupción prolongada te impide usar un plan de pago, escríbenos y buscaremos una solución
        razonable.</p>
      </Seccion>

      <Seccion titulo="Uso aceptable">
        <p>No puedes usar Eniu para publicar contenido ilegal, engañoso u ofensivo, para suplantar a
        otro negocio, para intentar vulnerar la seguridad del servicio ni para automatizar accesos que
        degraden su funcionamiento para los demás.</p>
      </Seccion>

      <Seccion titulo="Límite de responsabilidad">
        <p>Eniu se ofrece tal cual. En la medida que la ley lo permita, no respondemos por pérdidas
        indirectas —ventas no realizadas, lucro cesante o daños derivados de información incorrecta en
        tu menú—. Nuestra responsabilidad se limita a lo que hayas pagado por el servicio en los tres
        meses anteriores al hecho que la origine.</p>
      </Seccion>

      <Seccion titulo="Privacidad">
        <p>El tratamiento de datos personales se describe en el <Link href="/privacidad">aviso de
        privacidad</Link>, que forma parte de estos términos.</p>
      </Seccion>

      <Seccion titulo="Cambios y terminación">
        <p>Podemos actualizar estos términos; publicaremos la versión nueva en esta dirección y
        cambiaremos la fecha del encabezado. Si el cambio es significativo te avisaremos por correo.
        Seguir usando Eniu después de un cambio significa que lo aceptas.</p>
        <p>Puedes dejar de usar el servicio cuando quieras eliminando tu cuenta. Nosotros podemos
        suspender o cerrar una cuenta que incumpla estos términos, avisándote salvo que la gravedad o
        la ley exijan actuar de inmediato.</p>
      </Seccion>

      <Seccion titulo="Ley aplicable">
        <p>Estos términos se rigen por la legislación mexicana. Cualquier controversia se someterá a los
        tribunales competentes de los Estados Unidos Mexicanos.</p>
      </Seccion>

      <p className="legal-foot">
        ¿Dudas sobre estos términos? Escríbenos a <strong>{CONTACTO}</strong>.
      </p>
    </LegalDoc>
  )
}
