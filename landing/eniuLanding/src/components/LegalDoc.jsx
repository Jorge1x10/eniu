/**
 * Envoltura de los dos documentos legales.
 *
 * Viven en el sitio público y no en el panel: `eniu.app` es la dirección
 * abierta y estable que pide App Store Connect, y la que la app móvil lleva
 * compilada. El panel exige sesión, así que no sirve para eso.
 */
export function LegalDoc({ title, updated, children }) {
  return (
    <main className="legal-page">
      <h1>{title}</h1>
      <p className="legal-updated">Última actualización: {updated}</p>
      {children}
    </main>
  )
}

export function Seccion({ titulo, children }) {
  return (
    <section className="legal-section">
      <h2>{titulo}</h2>
      {children}
    </section>
  )
}
