import { createContext, useContext } from "react";

// El contexto vive aparte del proveedor para que ese archivo sólo exporte
// componentes y Fast Refresh siga funcionando en desarrollo, igual que hace
// `modules/auth/context/AuthContextValue.jsx`.
export const LanguageContext = createContext(null);

export function useLanguage() {
  return useContext(LanguageContext);
}
