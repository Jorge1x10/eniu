import { AuthProvider } from "./modules/auth/context/authContext.jsx";
import { LanguageProvider } from "./i18n/LanguageProvider.jsx";
import { LocalizedGoogleProvider } from "./i18n/LocalizedGoogleProvider.jsx";
import AppRoutes from "./routes/AppRoutes";

/** El panel de administración. El menú público no pasa por aquí (ver `App.jsx`). */
export default function PanelApp() {
  return (
    <AuthProvider>
      {/* El idioma de la cuenta sólo se conoce con el usuario ya cargado,
          así que el proveedor de idioma va dentro del de sesión, y el de
          Google dentro de ambos: su script se carga con ese idioma. */}
      <LanguageProvider>
        <LocalizedGoogleProvider>
          <AppRoutes />
        </LocalizedGoogleProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
