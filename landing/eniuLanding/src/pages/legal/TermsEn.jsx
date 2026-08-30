import { Link } from '../../router.jsx'
import { LegalDoc, Seccion } from '../../components/LegalDoc.jsx'
import { ACTUALIZADA_EN, CONTACTO, RESPONSABLE } from '../../data/legal.js'

// Traducción de `TermsEs.jsx`. La versión en español es la vinculante y así lo
// dice el aviso que pinta `LegalDoc`; si cambias una cláusula allá, cámbiala
// aquí en el mismo commit para que no acaben diciendo cosas distintas.

export default function TermsEn() {
  return (
    <LegalDoc title="Terms and conditions" updated={ACTUALIZADA_EN}>
      <Seccion titulo="What Eniu is">
        <p>Eniu is a service operated by {RESPONSABLE} that lets you create digital menus for your
        business, publish them at their own web address, share them through a QR code, and see
        statistics on how many people view them. By creating an account you accept these terms.</p>
      </Seccion>

      <Seccion titulo="Your account">
        <p>You need an account to use Eniu, and you are responsible for keeping your password safe and
        for whatever happens from your account. You must provide accurate information and keep it up to
        date. You can delete your account whenever you like, from Settings in the web dashboard or from
        Settings in the app; doing so deletes your businesses, menus, dishes and photos, and cannot be
        undone.</p>
      </Seccion>

      <Seccion titulo="The content you publish">
        <p>The menus, text, prices and photographs you upload remain yours. You grant us only the
        permission we need to store them and show them to whoever opens your published menus, which is
        the service you signed up for.</p>
        <p>You are responsible for having the right to publish what you upload and for the accuracy of
        the information — prices, ingredients, allergens and anything else the law requires you to
        display in your line of business. Eniu is the tool that publishes your menu; it does not verify
        or answer for its contents.</p>
        <p>We may take down content that is illegal or fraudulent or that infringes third-party rights,
        and suspend accounts that publish it repeatedly.</p>
      </Seccion>

      <Seccion titulo="Plans and payments">
        <p>Eniu offers a free plan with limits and paid plans with more features. Paid plans are billed
        in advance and renew every month until you cancel. Payments are processed by Stripe; Eniu never
        receives or stores your card details.</p>
        <p>You can cancel whenever you like from the billing portal and you keep access until the end of
        the period you already paid for. Amounts already charged are non-refundable except where the law
        requires otherwise. If you move to a smaller plan or cancel, the features that are no longer
        included switch off: your menus are unpublished and customization returns to the basic set.
        Nothing is deleted, and everything comes back when you subscribe again.</p>
        <p>We may change prices with reasonable advance notice. A change never affects a period you have
        already paid for.</p>
      </Seccion>

      <Seccion titulo="Service availability">
        <p>We work to keep Eniu available, but we cannot guarantee it runs without interruption. There
        may be maintenance, failures or outages at our providers. If a prolonged interruption stops you
        from using a paid plan, write to us and we will find a reasonable solution.</p>
      </Seccion>

      <Seccion titulo="Acceptable use">
        <p>You may not use Eniu to publish illegal, misleading or offensive content, to impersonate
        another business, to attempt to breach the security of the service, or to automate access in a
        way that degrades it for everyone else.</p>
      </Seccion>

      <Seccion titulo="Limitation of liability">
        <p>Eniu is provided as is. To the extent permitted by law, we are not liable for indirect losses
        — lost sales, lost profits, or damages arising from incorrect information in your menu. Our
        liability is limited to what you paid for the service in the three months before the event that
        gave rise to it.</p>
      </Seccion>

      <Seccion titulo="Privacy">
        <p>How personal data is handled is described in the <Link href="privacy">privacy
        notice</Link>, which forms part of these terms.</p>
      </Seccion>

      <Seccion titulo="Changes and termination">
        <p>We may update these terms; we will publish the new version at this address and change the
        date in the header. If the change is significant we will tell you by email. Continuing to use
        Eniu after a change means you accept it.</p>
        <p>You can stop using the service whenever you like by deleting your account. We may suspend or
        close an account that breaches these terms, with notice unless the seriousness of the breach or
        the law requires immediate action.</p>
      </Seccion>

      <Seccion titulo="Governing law">
        <p>These terms are governed by Mexican law. Any dispute will be submitted to the competent
        courts of the United Mexican States.</p>
      </Seccion>

      <p className="legal-foot">
        Questions about these terms? Write to us at <strong>{CONTACTO}</strong>.
      </p>
    </LegalDoc>
  )
}
