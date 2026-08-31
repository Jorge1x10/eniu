import { Link } from '../router.jsx'
import { useLanguage } from '../languageContext.js'
import { contactEmail } from '../data/site.js'

export default function Support() {
  const { support } = useLanguage().content

  return (
    <main className="legal-page">
      <h1>{support.title}</h1>
      <p className="support-lead">{support.lead}</p>

      <div className="support-card">
        <div>
          <span>{support.writeUs}</span>
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        </div>
        <div>
          <span>{support.responseTime}</span>
          <p>{support.responseTimeValue}</p>
        </div>
        <div>
          <span>{support.languages}</span>
          <p>{support.languagesValue}</p>
        </div>
      </div>

      {support.answers.map(({ question, answer }) => (
        <section className="legal-section" key={question}>
          <h2>{question}</h2>
          <p>{answer}</p>
        </section>
      ))}

      <p className="legal-foot">
        {support.footPrefix}<Link href="onboarding">{support.footOnboarding}</Link>
        {support.footMiddle}<Link href="terms">{support.footTerms}</Link>
        {support.footAnd}<Link href="privacy">{support.footPrivacy}</Link>
        {support.footSuffix}
      </p>
    </main>
  )
}
