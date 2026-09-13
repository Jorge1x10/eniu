import { LegalDoc, Seccion } from '../../components/LegalDoc.jsx'
import {
  ACTUALIZADA_EN,
  CONTACTO,
  DOMICILIO,
  REPRESENTANTE_RU,
  REPRESENTANTE_UE,
  RESPONSABLE,
} from '../../data/legal.js'

// Traducción de `PrivacyEs.jsx`. La versión en español es la vinculante y así
// lo dice el aviso que pinta `LegalDoc`; si cambias un párrafo allá, cámbialo
// aquí en el mismo commit para que no acaben diciendo cosas distintas.

export default function PrivacyEn() {
  return (
    <LegalDoc title="Privacy notice" updated={ACTUALIZADA_EN}>
      <Seccion titulo="Who handles your data">
        <p>
          {RESPONSABLE} is the controller of the personal data collected through Eniu, with address at{' '}
          {DOMICILIO}, Mexico. You can write to us at <strong>{CONTACTO}</strong> about anything
          related to this notice, including exercising your rights.
        </p>
        <p>
          We have not appointed a data protection officer: our processing does not meet the thresholds
          that require one. Enquiries are handled at that same address.
        </p>
      </Seccion>

      <Seccion titulo="Representatives in the European Union and the United Kingdom">
        <p>
          Eniu is operated from Mexico and has no establishment in the European Economic Area or the
          United Kingdom. When services are offered to people located there, both regimes require a
          local representative that authorities and individuals can address.
        </p>
        {REPRESENTANTE_UE ? (
          <p>
            Our representative in the European Union, for the purposes of Article 27 GDPR, is{' '}
            <strong>{REPRESENTANTE_UE}</strong>.
          </p>
        ) : (
          <p>
            <strong>Appointment pending.</strong> We are in the process of appointing our representative
            in the European Union and will publish their details here as soon as it is done. Until then
            you can contact us directly at {CONTACTO}, and we will respond with the same deadlines and
            safeguards described below.
          </p>
        )}
        {REPRESENTANTE_RU ? (
          <p>
            Our representative in the United Kingdom is <strong>{REPRESENTANTE_RU}</strong>.
          </p>
        ) : (
          <p>
            <strong>Appointment pending.</strong> The same applies to the United Kingdom
            representative, which is a separate appointment from the one above and which we will
            publish here.
          </p>
        )}
      </Seccion>

      <Seccion titulo="What data we collect">
        <p>
          <strong>If you have an Eniu account</strong>, we collect your name, username, email address
          and, if you provide them, your phone number and profile photo. We also collect the details of
          the business you register: name, description, address, phone, WhatsApp, currency and time
          zone, along with the photographs, menus, categories and dishes you upload.
        </p>
        <p>
          If you sign in with Google or Apple, all we receive from them is your account identifier, your
          email address and your name. We never receive your password for those services.
        </p>
        <p>
          <strong>If you take a paid plan</strong>, we store the identifier Stripe assigns to your
          customer account and the status and dates of your subscription. Your card details are
          captured directly on Stripe: Eniu never receives or stores them.
        </p>
        <p>
          <strong>If you are a guest at a business</strong> and open a published menu, we do not ask you
          for any data and you do not need an account. We record the visit anonymously: which menu was
          opened, when, from what kind of device, and how you arrived (QR code, link, social). We do not
          store your IP address or your name.
        </p>
        <p>
          We store nothing on your device: no cookies, no local storage, no identifiers that outlive the
          visit. While the page is open we use a random identifier that lives only in the browser's
          memory and disappears when you close it, and that is transformed with HMAC-SHA256 before being
          stored in our systems. That is why the menu does not ask you for permission for anything:
          there is nothing to permit. The trade-off is that if you come back another day we do not
          recognise you, and the statistics count visits, not people.
        </p>
      </Seccion>

      <Seccion titulo="What we use it for and on what legal basis">
        <p>
          The GDPR requires us to state not only what the data is used for, but on what legal basis.
          These are the processing activities we carry out:
        </p>
        <ul>
          <li>
            <strong>Giving you access to your account and providing the service</strong> — publishing
            your menus, storing your dishes and photographs, generating your link and QR code. Basis:{' '}
            <em>performance of the contract</em> you accept when you create the account. Without this
            data we cannot provide the service.
          </li>
          <li>
            <strong>Charging your subscription</strong> and handling invoicing. Basis:{' '}
            <em>performance of the contract</em>, and <em>legal obligation</em> as regards keeping
            accounting and tax records.
          </li>
          <li>
            <strong>Sending you account-related emails</strong>, such as password recovery or notices of
            important changes to the service. Basis: <em>performance of the contract</em>.
          </li>
          <li>
            <strong>Keeping the service secure</strong>: preventing unauthorised access, abuse and
            fraud. Basis: <em>legitimate interest</em> in protecting the service and the people who use
            it.
          </li>
          <li>
            <strong>Showing you aggregate statistics</strong> on how many people view your menus. Basis:{' '}
            <em>performance of the contract</em> with you, who are the one taking that feature, and{' '}
            <em>legitimate interest</em> in measuring use of the service. The data behind it does not
            identify any guest.
          </li>
          <li>
            <strong>Responding to requests from authorities</strong> where legally required. Basis:{' '}
            <em>legal obligation</em>.
          </li>
        </ul>
        <p>
          We do not use your data for advertising, we do not sell it to anyone, and we do not take
          automated decisions producing legal effects concerning you or similarly significantly
          affecting you.
        </p>
      </Seccion>

      <Seccion titulo="Who we share it with">
        <p>
          Only with the providers needed to run the service, and only with what each one needs. They act
          as processors on our behalf, except Stripe, Google and Apple, which in their relationship with
          you are controllers of their own processing:
        </p>
        <ul>
          <li>
            <strong>Stripe</strong> processes payments on the web and keeps the billing records.
          </li>
          <li>
            <strong>RevenueCat</strong>, together with <strong>Apple</strong> and{' '}
            <strong>Google</strong>, handles subscriptions taken inside the mobile app. In those
            purchases it is the store that charges you, not us.
          </li>
          <li>
            <strong>Google</strong> and <strong>Apple</strong>, if you choose to sign in with them.
          </li>
          <li>
            <strong>Render</strong> hosts the server and the database, and <strong>Vercel</strong> the
            web dashboard and the public site.
          </li>
          <li>The email provider we use to send you account messages.</li>
        </ul>
        <p>We may also disclose it if a competent authority legally requires us to.</p>
      </Seccion>

      <Seccion titulo="Where it is stored and international transfers">
        <p>
          The servers and the database are in the United States, and we, as controller, access them from
          Mexico. If you are in the European Economic Area or the United Kingdom, that means your data
          leaves your territory.
        </p>
        <p>
          To cover those transfers we rely on the standard contractual clauses approved by the European
          Commission — and on the UK addendum to them — entered into with each provider, and, where the
          provider is certified under the EU-US Data Privacy Framework, on that certification. You can
          ask us for a copy of the applicable safeguards by writing to {CONTACTO}.
        </p>
      </Seccion>

      <Seccion titulo="How long we keep it">
        <ul>
          <li>
            <strong>Your account and its content</strong>: for as long as the account exists. When you
            delete it they are removed immediately, with no recoverable backup beyond our providers'
            ordinary technical rotations.
          </li>
          <li>
            <strong>Billing records</strong>: for the period imposed by the applicable tax and
            accounting rules, which can run to ten years. They are kept even if you delete your account,
            because the obligation to keep them does not depend on you or on us.
          </li>
          <li>
            <strong>Menu statistics</strong>: may be kept even if you delete a particular menu, because
            they are not linked to any identifiable person.
          </li>
          <li>
            <strong>On the guest's device</strong> there is nothing to keep: the visit identifier lives
            in memory and disappears when the page is closed.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="How to delete your account">
        <p>
          You can delete it yourself at any time, without asking us: in the web dashboard from{' '}
          <strong>Settings → Security</strong>, and in the mobile app from <strong>Settings</strong>.
          Doing so deletes your account, your businesses, your menus, your dishes and the photographs
          you uploaded, and any menus you had published stop being available. If you have an active
          subscription, it is cancelled before anything is deleted. Deletion is permanent and cannot be
          undone.
        </p>
      </Seccion>

      <Seccion titulo="Your rights">
        <p>Over your personal data you may exercise the following rights:</p>
        <ul>
          <li>
            <strong>Access</strong>: to know what data of yours we process and to obtain a copy.
          </li>
          <li>
            <strong>Rectification</strong>: to correct it if it is inaccurate or incomplete.
          </li>
          <li>
            <strong>Erasure</strong>: to ask us to delete it, except what we are legally obliged to
            keep.
          </li>
          <li>
            <strong>Restriction</strong>: to ask us to stop using it while a dispute over its accuracy
            or lawfulness is resolved.
          </li>
          <li>
            <strong>Portability</strong>: to receive the data you gave us in a structured, commonly used
            format, and to ask for it to be transmitted to another controller where technically
            feasible.
          </li>
          <li>
            <strong>Objection</strong>: to object to the processing we carry out on the basis of
            legitimate interest, on grounds relating to your particular situation.
          </li>
          <li>
            <strong>Withdrawal of consent</strong> where processing is based on it, without affecting
            the lawfulness of what was done before you withdrew it.
          </li>
        </ul>
        <p>
          You can exercise most of them directly in the app: your profile and business details are
          editable, and deleting your account is in your hands without going through anyone. For any
          other request, write to us at <strong>{CONTACTO}</strong>. We respond within one month of
          receipt; if the request is complex we may extend that by two further months, telling you
          within that first month and explaining why. We do not charge for handling them.
        </p>
        <p>
          If you live in Mexico, these rights correspond to what are known there as ARCO rights, and the
          statutory response period is twenty business days: in that case we apply whichever is more
          favourable to you.
        </p>
      </Seccion>

      <Seccion titulo="Complaining to an authority">
        <p>
          If you believe we have not handled your request properly, or that we process your data
          improperly, you can complain to the data protection supervisory authority in your country,
          whether or not you write to us first. In Spain that is the Agencia Española de Protección de
          Datos; in the United Kingdom, the Information Commissioner's Office; in Mexico, the competent
          data protection authority. Elsewhere in the European Economic Area, the authority of the State
          where you live, where you work, or where the matter arose.
        </p>
      </Seccion>

      <Seccion titulo="Security">
        <p>
          Passwords are stored hashed with bcrypt, never in the clear. Traffic always travels over HTTPS
          and access to the database is restricted. No system is infallible, but we work to keep your
          data protected with reasonable measures, and if a security breach occurred that posed a risk
          to your rights we would tell you and notify the relevant authority within the statutory
          deadlines.
        </p>
      </Seccion>

      <Seccion titulo="Minors">
        <p>
          Eniu is aimed at people who run a business and is not intended for minors. We do not knowingly
          collect data from minors.
        </p>
      </Seccion>

      <Seccion titulo="Changes to this notice">
        <p>
          If we change this notice we will publish the updated version at this same address and change
          the date in the header. If the change is significant, we will let you know by email.
        </p>
      </Seccion>

      <p className="legal-foot">
        Questions about this notice? Write to us at <strong>{CONTACTO}</strong>.
      </p>
    </LegalDoc>
  )
}
