import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";

/**
 * Dos aplicaciones en un mismo despliegue, cargadas por separado.
 *
 * - `/m/:publicSlug` es el menú que abre el comensal al escanear un QR, y
 *   `/m/:publicSlug/mesa/:qrToken` el mismo menú abierto desde el QR de una
 *   mesa, desde donde se puede pedir. Sólo
 *   descarga el menú y sus plantillas: ni sesión, ni el SDK de Google, ni el
 *   panel. Antes iba todo en un único archivo de 836 KB, y cada escaneo
 *   pagaba por un panel que el comensal nunca va a ver.
 * - Todo lo demás es el panel (`PanelApp`), con sus proveedores de sesión,
 *   idioma de la cuenta y acceso con Google.
 */
const PublicMenuPage = lazy(() => import("./modules/Publication/pages/PublicMenuPage"));
const PanelApp = lazy(() => import("./PanelApp"));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/m/:publicSlug" element={<PublicMenuPage />} />
        {/* El QR de cada mesa: el mismo menú, con pedidos. */}
        <Route path="/m/:publicSlug/mesa/:qrToken" element={<PublicMenuPage />} />
        <Route path="*" element={<PanelApp />} />
      </Routes>
    </Suspense>
  );
}
