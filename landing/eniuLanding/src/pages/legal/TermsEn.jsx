import { Link } from '../../router.jsx'
import { LegalDoc, Seccion } from '../../components/LegalDoc.jsx'
import { ACTUALIZADA_EN, CONTACTO, DOMICILIO, RESPONSABLE } from '../../data/legal.js'

// Traducción de `TermsEs.jsx`. La versión en español es la vinculante y así lo
// dice el aviso que pinta `LegalDoc`; si cambias un párrafo allá, cámbialo aquí
// en el mismo commit para que no acaben diciendo cosas distintas.

export default function TermsEn() {
  return (
    <LegalDoc title="Terms and conditions" updated={ACTUALIZADA_EN}>
      <Seccion titulo="What Eniu is and who offers it">
        <p>
          Eniu is a service from {RESPONSABLE}, with address at {DOMICILIO}, Mexico, that lets you
          create digital menus for your business, publish them at their own web address, share them
          with a QR code and see statistics on how many people view them. By creating an account you
          accept these terms.
        </p>
      </Seccion>

      <Seccion titulo="Who it is for">
        <p>
          Eniu is a professional tool: it is offered to people who run a business and take it for that
          activity. If you contract in the course of your business or professional activity, consumer
          protection rules do not apply to you, and that is the usual situation.
        </p>
        <p>
          If you nonetheless contract as a consumer — a natural person acting for purposes outside their
          trade — you keep in full the rights the law gives you, and this document does not limit them.
          The sections marked <strong>"If you contract as a consumer"</strong> set out what applies to
          you in addition.
        </p>
      </Seccion>

      <Seccion titulo="Your account">
        <p>
          You need an account to use Eniu and you are responsible for keeping your password safe and for
          what happens from your account. You must provide accurate details and keep them up to date.
          You can delete your account whenever you like from Settings in the web dashboard or from
          Settings in the app; doing so deletes your businesses, menus, dishes and photographs, and
          cannot be undone.
        </p>
      </Seccion>

      <Seccion titulo="The content you publish">
        <p>
          The menus, text, prices and photographs you upload remain yours. You grant us only the
          permission needed to store them and show them to whoever opens your published menus, which is
          the service you signed up for.
        </p>
        <p>
          You are responsible for having the right to publish what you upload and for the information
          being accurate. That prominently includes allergen information and any other detail your
          country's food rules require you to provide: in the European Union and the United Kingdom
          allergen information for non-prepacked food is mandatory and must be available before the
          customer decides what to order. Eniu is the tool that publishes your menu and provides the
          notice that this information can be requested from staff; it does not verify it, does not
          replace it and is not answerable for its content.
        </p>
        <p>
          We may remove content that is illegal, fraudulent or infringes third-party rights, and suspend
          accounts that repeatedly publish it.
        </p>
      </Seccion>

      <Seccion titulo="Plans and payments">
        <p>
          Eniu offers a free plan with limits and paid plans with more features. Paid plans are charged
          in advance and renew every month until you cancel. Payment on the web is processed by Stripe;
          Eniu does not receive or store your card details. If you subscribe from the mobile app, the
          charge is made by the corresponding app store under its own terms, and cancellation and
          refunds are handled there.
        </p>
        <p>
          Prices are shown with whatever taxes apply in the country you contract from, determined by the
          billing address you provide. If you are a business with a VAT identification number in the
          European Union, you can enter it at checkout so that the appropriate tax treatment is applied.
        </p>
        <p>
          You can cancel whenever you like from the billing portal and you keep access until the end of
          the period already paid for. If you move to a lower plan or cancel, the features no longer
          included are switched off: your menus are unpublished and customisation returns to the basic
          set. Nothing is deleted, and you get everything back when you subscribe again.
        </p>
        <p>
          We may change prices by giving you at least thirty days' notice by email. A change never
          affects a period already paid for, and if it does not suit you, you can cancel before it takes
          effect at no cost.
        </p>
      </Seccion>

      <Seccion titulo="If you contract as a consumer: right of withdrawal">
        <p>
          You have <strong>fourteen calendar days</strong> from contracting to withdraw from the
          contract without giving any reason and without penalty. To exercise it, simply tell us of your
          decision unambiguously by writing to <strong>{CONTACTO}</strong>. No particular form is
          required, although you may use the official model form if you prefer. We will refund what you
          paid without undue delay and at the latest within fourteen calendar days of receiving your
          communication, using the same means of payment you used.
        </p>
        <p>
          Eniu is a digital service that starts being supplied immediately. If you expressly ask for it
          to begin before those fourteen days are up — which is recorded by ticking the corresponding
          box at checkout — you acknowledge that{' '}
          <strong>you will lose the right of withdrawal once the service has been fully
          performed</strong>. If you withdraw while it is being supplied, we will charge you only the
          amount proportionate to what has been supplied up to that point.
        </p>
        <p>
          Outside that case, amounts already charged are non-refundable unless the law requires
          otherwise.
        </p>
      </Seccion>

      <Seccion titulo="Availability and conformity of the service">
        <p>
          We work to keep Eniu available, but we cannot guarantee it will run without interruption.
          There may be maintenance, failures or outages at our providers. If a prolonged interruption
          stops you using a paid plan, write to us and we will look for a reasonable solution.
        </p>
        <p>
          <strong>If you contract as a consumer</strong>, we are additionally bound by the statutory
          guarantee of conformity for digital content and services: if Eniu does not match what was
          contracted, you are entitled to have it brought into conformity and, if we fail to do so
          within a reasonable time or it is not possible, to a price reduction or to terminate the
          contract. These rights are free of charge and this document neither excludes nor limits them.
        </p>
      </Seccion>

      <Seccion titulo="Acceptable use">
        <p>
          You may not use Eniu to publish illegal, misleading or offensive content, to impersonate
          another business, to attempt to breach the security of the service, or to automate access in a
          way that degrades it for others.
        </p>
      </Seccion>

      <Seccion titulo="Limitation of liability">
        <p>
          To the extent the law allows, we are not liable for indirect losses — lost sales, lost profits
          or damage arising from incorrect information in your menu — and our liability is limited to
          what you have paid for the service in the three months before the event giving rise to it.
        </p>
        <p>
          None of the above excludes or limits our liability for wilful misconduct, gross negligence,
          death or personal injury, or any other liability the applicable law does not permit to be
          excluded. If you contract as a consumer, the cap above does not apply to you in anything the
          mandatory rules of your country do not allow to be limited.
        </p>
      </Seccion>

      <Seccion titulo="Privacy">
        <p>
          How personal data is handled is described in the <Link href="privacy">privacy notice</Link>,
          which forms part of these terms.
        </p>
      </Seccion>

      <Seccion titulo="Changes and termination">
        <p>
          We may update these terms; we will publish the new version at this address and change the date
          in the header. If the change is significant we will tell you by email with reasonable notice,
          and you can stop using the service before it takes effect if you do not accept it.
        </p>
        <p>
          You can stop using the service whenever you like by deleting your account. We may suspend or
          close an account that breaches these terms, with notice unless the seriousness of the breach
          or the law requires immediate action.
        </p>
      </Seccion>

      <Seccion titulo="Governing law and courts">
        <p>
          These terms are governed by Mexican law and disputes will be submitted to the competent courts
          of the United Mexican States.
        </p>
        <p>
          <strong>If you contract as a consumer</strong>, the above does not deprive you of the
          protection afforded by the mandatory provisions of the country where you have your habitual
          residence, which continue to apply. And you may in any event bring proceedings against us in
          the courts of that country, and only there may we bring proceedings against you.
        </p>
        <p>
          Before it comes to that, write to us at <strong>{CONTACTO}</strong>: most disagreements are
          settled by email. If you live in the European Union and we do not reach an agreement, you can
          turn to the alternative consumer dispute resolution bodies available in your country.
        </p>
      </Seccion>

      <p className="legal-foot">
        Questions about these terms? Write to us at <strong>{CONTACTO}</strong>.
      </p>
    </LegalDoc>
  )
}
