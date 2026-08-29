import { createContext, useContext } from 'react'

// El contexto vive aparte de `router.jsx` para que ese archivo sólo exporte
// componentes y Fast Refresh siga funcionando en desarrollo.
export const RouterContext = createContext(null)

export function useRouter() {
  return useContext(RouterContext)
}
