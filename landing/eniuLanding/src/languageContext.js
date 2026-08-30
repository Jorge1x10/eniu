import { createContext, useContext } from 'react'

// Vive aparte de los componentes por la misma razón que `routerContext.js`:
// un archivo que exporta sólo contexto no rompe Fast Refresh en desarrollo.
export const LanguageContext = createContext(null)

/** Idioma en curso y su árbol de contenido. */
export function useLanguage() {
  return useContext(LanguageContext)
}

/** Atajo para el caso habitual: sólo el contenido. */
export function useContent() {
  return useContext(LanguageContext).content
}
