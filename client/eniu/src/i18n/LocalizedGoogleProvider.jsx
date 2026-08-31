import { GoogleOAuthProvider } from "@react-oauth/google";
import { useTranslation } from "react-i18next";

/**
 * Carga el SDK de Google en el idioma en curso.
 *
 * El botón de acceso lo dibuja Google, no nosotros, y su idioma sale del `hl`
 * con el que se carga su script: por eso va aquí y no en cada botón. El `key`
 * lo rehace al cambiar de idioma, porque el script sólo se pide una vez y sin
 * remontarlo quedaría el único botón en el idioma anterior.
 */
export function LocalizedGoogleProvider({ children }) {
  const { i18n } = useTranslation();

  return (
    <GoogleOAuthProvider
      key={i18n.language}
      locale={i18n.language}
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
    >
      {children}
    </GoogleOAuthProvider>
  );
}
