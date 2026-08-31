import { LegalDoc, Seccion } from '../../components/LegalDoc.jsx'
import { ACTUALIZADA_EN, CONTACTO, DOMICILIO, RESPONSABLE } from '../../data/legal.js'

// Traducción de `PrivacyEs.jsx`. La versión en español es la vinculante y así
// lo dice el aviso que pinta `LegalDoc`; si cambias un párrafo allá, cámbialo
// aquí en el mismo commit para que no acaben diciendo cosas distintas.

export default function PrivacyEn() {
  return (
    <LegalDoc title="Privacy notice" updated={ACTUALIZADA_EN}>
      <Seccion titulo="Who handles your data">
        <p>
          {RESPONSABLE} is responsible for processing the personal data collected through Eniu, with
          address at {DOMICILIO}. You can write to us at <strong>{CONTACTO}</strong> about anything
          related to this notice.
        </p>
      </Seccion>

      <Seccion titulo="What data we collect">
        <p><strong>If you have an Eniu account</strong>, we collect your name, username, email address
        and, if you provide them, your phone number and profile photo. We also collect the details of
        the business you register: name, description, address, phone, WhatsApp, currency and time zone,
        along with the photographs, menus, categories and dishes you upload.</p>
        <p>If you sign in with Google or Apple, all we receive from them is your account identifier,
        your email address and your name. We never receive your password for those services.</p>
        <p><strong>If you are a guest at a business</strong> and open a published menu, we do not ask
        you for any data and you do not need an account. We record the visit anonymously: which menu was
        opened, when, from what kind of device, and how you arrived (QR code, link, social). The visitor
        identifier is stored transformed with HMAC-SHA256, so it cannot be reversed or linked back to a
        person. We do not store your IP address or your name.</p>
      </Seccion>

      <Seccion titulo="What we use it for">
        <p>To give you access to your account and keep it secure, publish the menus you create, show you
        aggregate statistics on how many people view them, charge your subscription when you take a paid
        plan, and send you emails related to your account, such as password recovery. We do not use your
        data for advertising and we do not sell it to anyone.</p>
      </Seccion>

      <Seccion titulo="Who we share it with">
        <p>Only with the providers needed to run the service, and only with what each one needs:</p>
        <ul>
          <li><strong>Stripe</strong> processes payments. Your card details are captured directly on
          their platform: Eniu never receives or stores them.</li>
          <li><strong>Google</strong> and <strong>Apple</strong>, if you choose to sign in with them.</li>
          <li><strong>Render</strong> hosts the server and the database, and <strong>Vercel</strong> the
          web dashboard. Both operate in the United States, so your data is stored there.</li>
        </ul>
        <p>We may also disclose it if a competent authority legally requires us to.</p>
      </Seccion>

      <Seccion titulo="How long we keep it">
        <p>For as long as your account exists. Anonymous menu statistics may be kept even if you delete
        a particular menu, because they are no longer linked to any identifiable person.</p>
      </Seccion>

      <Seccion titulo="How to delete your account">
        <p>You can delete it yourself at any time, without asking us: in the web dashboard from
        <strong> Settings → Security</strong>, and in the mobile app from <strong>Settings</strong>.
        Doing so deletes your account, your businesses, your menus, your dishes and the photographs you
        uploaded, and any menus you had published stop being available. If you have an active
        subscription, it is cancelled before anything is deleted. Deletion is permanent and cannot be
        undone.</p>
      </Seccion>

      <Seccion titulo="Your rights">
        <p>You can access your data, correct it if it is inaccurate, delete it or object to its
        processing — the rights known in Mexico as ARCO — as well as withdraw your consent. You can
        exercise most of them directly in the app: your profile and business details are editable, and
        deleting your account is in your hands without going through anyone. For any other request,
        write to us at {CONTACTO} and we will reply within a maximum of twenty business days.</p>
      </Seccion>

      <Seccion titulo="Security">
        <p>Passwords are stored hashed with bcrypt, never in the clear. Traffic always travels over
        HTTPS and access to the database is restricted. No system is infallible, but we work to keep
        your data protected with reasonable measures.</p>
      </Seccion>

      <Seccion titulo="Minors">
        <p>Eniu is aimed at people who run a business and is not intended for minors. We do not
        knowingly collect data from minors.</p>
      </Seccion>

      <Seccion titulo="Changes to this notice">
        <p>If we change this notice we will publish the updated version at this same address and change
        the date in the header. If the change is significant, we will let you know by email.</p>
      </Seccion>

      <p className="legal-foot">
        Questions about this notice? Write to us at <strong>{CONTACTO}</strong>.
      </p>
    </LegalDoc>
  )
}
