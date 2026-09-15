import { Link } from '../../router.jsx'
import { LegalDoc, Seccion } from '../../components/LegalDoc.jsx'
import { ACTUALIZADA, CONTACTO, DOMICILIO, RESPONSABLE } from '../../data/legal.js'

/**
 * Unos términos que funcionan dentro y fuera de México.
 *
 * Los anteriores imponían tribunales mexicanos en exclusiva, declaraban los
 * importes no reembolsables sin matices y ofrecían el servicio "tal cual".
 * Ninguna de las tres cosas se sostiene frente a un consumidor europeo: sus
 * normas imperativas le siguen allá donde contrate, conserva catorce días para
 * desistir y tiene una garantía legal de conformidad sobre el contenido
 * digital que no se puede excluir por contrato.
 *
 * Eniu se contrata sobre todo por negocios, y a un negocio esas reglas no le
 * aplican. Pero un autónomo que se da de alta desde su móvil puede estar en la
 * frontera, así que el documento distingue los dos casos en vez de suponer uno.
 */
export default function TermsEs() {
  return (
    <LegalDoc title="Términos y condiciones" updated={ACTUALIZADA}>
      <Seccion titulo="Qué es Eniu y quién lo ofrece">
        <p>
          Eniu es un servicio de {RESPONSABLE}, con domicilio en {DOMICILIO}, México, que te permite
          crear menús digitales para tu negocio, publicarlos en una dirección web propia, compartirlos
          mediante un código QR y consultar estadísticas de cuántas personas los ven. Al crear una
          cuenta aceptas estos términos.
        </p>
      </Seccion>

      <Seccion titulo="A quién va dirigido">
        <p>
          Eniu es una herramienta profesional: se ofrece a quien administra un negocio y la contrata
          para su actividad. Si contratas en el ejercicio de tu actividad empresarial o profesional, las
          normas de protección del consumidor no te resultan aplicables y esa es la situación habitual.
        </p>
        <p>
          Si aun así contratas como consumidor —una persona física que actúa con un propósito ajeno a
          su actividad— conservas íntegramente los derechos que la ley te reconoce, y este documento no
          los limita. Las secciones marcadas <strong>«Si contratas como consumidor»</strong> recogen lo
          que te aplica de forma adicional.
        </p>
      </Seccion>

      <Seccion titulo="Tu cuenta">
        <p>
          Necesitas una cuenta para usar Eniu y eres responsable de mantener segura tu contraseña y de
          lo que ocurra desde tu cuenta. Debes proporcionar datos reales y mantenerlos al día. Puedes
          eliminar tu cuenta cuando quieras desde Configuración en el panel web o desde Ajustes en la
          aplicación; al hacerlo se borran tus negocios, menús, productos y fotografías, y no se puede
          deshacer.
        </p>
      </Seccion>

      <Seccion titulo="El contenido que publicas">
        <p>
          Los menús, textos, precios y fotografías que subes siguen siendo tuyos. Nos concedes
          únicamente el permiso necesario para almacenarlos y mostrarlos a quienes abran tus menús
          publicados, que es el servicio que contrataste.
        </p>
        <p>
          Te haces responsable de tener derecho a publicar lo que subes y de que la información sea
          veraz. Eso incluye, de forma destacada, la información sobre alérgenos y cualquier otro dato
          que la normativa alimentaria de tu país te obligue a facilitar: en la Unión Europea y en el
          Reino Unido la información sobre los alérgenos de la comida no envasada es obligatoria, y
          debe estar disponible antes de que el cliente decida su pedido. Eniu es la herramienta que
          publica tu menú y pone a tu disposición el aviso de que esa información puede solicitarse al
          personal; no la verifica, no la suple y no responde por su contenido.
        </p>
        <p>
          Podemos retirar contenido ilegal, fraudulento o que infrinja derechos de terceros, y suspender
          cuentas que lo publiquen de forma reiterada.
        </p>
      </Seccion>

      <Seccion titulo="Planes y pagos">
        <p>
          Eniu ofrece un plan gratuito con límites y planes de pago con más funciones. Los planes de
          pago se cobran por adelantado y se renuevan cada mes hasta que los canceles. El pago en la web
          lo procesa Stripe; Eniu no recibe ni almacena los datos de tu tarjeta. Si contratas desde la
          aplicación móvil, el cobro lo realiza la tienda de aplicaciones correspondiente conforme a sus
          propias condiciones, y la cancelación y el reembolso se gestionan allí.
        </p>
        <p>
          Los precios se muestran con los impuestos que correspondan según el país desde el que
          contrates, determinado por la dirección de facturación que facilites. Si eres una empresa con
          número de identificación fiscal a efectos de IVA en la Unión Europea, puedes indicarlo al
          contratar para que se aplique el tratamiento fiscal que proceda.
        </p>
        <p>
          Puedes cancelar cuando quieras desde el portal de facturación y conservarás el acceso hasta el
          final del periodo ya pagado. Si cambias a un plan inferior o cancelas, las funciones que dejan
          de estar incluidas se desactivan: tus menús se despublican y la personalización vuelve a la
          básica. Nada se borra, y recuperas todo al contratar de nuevo.
        </p>
        <p>
          Podemos cambiar los precios avisándote por correo con al menos treinta días de antelación. El
          cambio nunca afecta a un periodo ya pagado, y si no te conviene puedes cancelar antes de que
          entre en vigor sin coste alguno.
        </p>
      </Seccion>

      <Seccion titulo="Si contratas como consumidor: derecho de desistimiento">
        <p>
          Dispones de <strong>catorce días naturales</strong> desde la contratación para desistir del
          contrato sin necesidad de justificarlo y sin penalización. Para ejercerlo basta con que nos
          comuniques tu decisión de forma inequívoca escribiendo a <strong>{CONTACTO}</strong>. No hace
          falta ningún formulario concreto, aunque puedes usar el modelo oficial si lo prefieres. Te
          devolveremos lo pagado sin demora indebida y, a más tardar, en catorce días naturales desde
          que recibamos tu comunicación, por el mismo medio de pago que usaste.
        </p>
        <p>
          Eniu es un servicio digital que empieza a prestarse de inmediato. Si pides expresamente que
          comience antes de que acaben esos catorce días —lo que se recoge marcando la casilla
          correspondiente en la pantalla de pago—, reconoces que{' '}
          <strong>perderás el derecho de desistimiento una vez que el servicio se haya ejecutado por
          completo</strong>. Si desistes mientras se está prestando, te cobraremos únicamente la parte
          proporcional al servicio ya prestado hasta ese momento.
        </p>
        <p>
          Fuera de ese supuesto, los importes ya cobrados no son reembolsables salvo que la ley lo
          exija.
        </p>
      </Seccion>

      <Seccion titulo="Disponibilidad y conformidad del servicio">
        <p>
          Trabajamos para que Eniu esté disponible, pero no podemos garantizar que funcione sin
          interrupciones. Puede haber mantenimientos, fallos o cortes de nuestros proveedores. Si una
          interrupción prolongada te impide usar un plan de pago, escríbenos y buscaremos una solución
          razonable.
        </p>
        <p>
          <strong>Si contratas como consumidor</strong>, nos obliga además la garantía legal de
          conformidad del contenido y los servicios digitales: si Eniu no se ajusta a lo contratado,
          tienes derecho a que lo pongamos en conformidad y, si no lo hacemos en un plazo razonable o no
          es posible, a una reducción del precio o a resolver el contrato. Estos derechos son gratuitos
          y este documento no los excluye ni los limita.
        </p>
      </Seccion>

      <Seccion titulo="Uso aceptable">
        <p>
          No puedes usar Eniu para publicar contenido ilegal, engañoso u ofensivo, para suplantar a otro
          negocio, para intentar vulnerar la seguridad del servicio ni para automatizar accesos que
          degraden su funcionamiento para los demás.
        </p>
      </Seccion>

      <Seccion titulo="Límite de responsabilidad">
        <p>
          En la medida en que la ley lo permita, no respondemos por pérdidas indirectas —ventas no
          realizadas, lucro cesante o daños derivados de información incorrecta en tu menú—, y nuestra
          responsabilidad se limita a lo que hayas pagado por el servicio en los tres meses anteriores
          al hecho que la origine.
        </p>
        <p>
          Nada de lo anterior excluye ni limita nuestra responsabilidad por dolo, por culpa grave, por
          muerte o daños personales, ni cualquier otra que la ley aplicable no permita excluir. Si
          contratas como consumidor, el límite anterior no te resulta aplicable en aquello que las
          normas imperativas de tu país no permitan limitar.
        </p>
      </Seccion>

      <Seccion titulo="Privacidad">
        <p>
          El tratamiento de datos personales se describe en el{' '}
          <Link href="privacy">aviso de privacidad</Link>, que forma parte de estos términos.
        </p>
      </Seccion>

      <Seccion titulo="Cambios y terminación">
        <p>
          Podemos actualizar estos términos; publicaremos la versión nueva en esta dirección y
          cambiaremos la fecha del encabezado. Si el cambio es significativo te avisaremos por correo
          con antelación razonable, y podrás dejar de usar el servicio antes de que entre en vigor si no
          lo aceptas.
        </p>
        <p>
          Puedes dejar de usar el servicio cuando quieras eliminando tu cuenta. Nosotros podemos
          suspender o cerrar una cuenta que incumpla estos términos, avisándote salvo que la gravedad o
          la ley exijan actuar de inmediato.
        </p>
      </Seccion>

      <Seccion titulo="Ley aplicable y tribunales">
        <p>
          Estos términos se rigen por la legislación mexicana y las controversias se someterán a los
          tribunales competentes de los Estados Unidos Mexicanos.
        </p>
        <p>
          <strong>Si contratas como consumidor</strong>, lo anterior no te priva de la protección que te
          otorguen las disposiciones imperativas del país donde tengas tu residencia habitual, que
          siguen siendo aplicables. Y podrás en todo caso demandarnos ante los tribunales de ese país, y
          sólo ante ellos podremos demandarte nosotros.
        </p>
        <p>
          Antes de llegar ahí, escríbenos a <strong>{CONTACTO}</strong>: la mayoría de las
          discrepancias se resuelven por correo. Si resides en la Unión Europea y no llegamos a un
          acuerdo, puedes acudir a las entidades de resolución alternativa de litigios de consumo
          disponibles en tu país.
        </p>
      </Seccion>

      <p className="legal-foot">
        ¿Dudas sobre estos términos? Escríbenos a <strong>{CONTACTO}</strong>.
      </p>
    </LegalDoc>
  )
}
