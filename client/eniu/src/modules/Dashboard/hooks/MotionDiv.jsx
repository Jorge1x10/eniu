import { Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useOutlet } from "react-router";
import { useTranslation } from "react-i18next";

export default function MotionDiv() {
  const location = useLocation();
  const outlet = useOutlet();
  const { t } = useTranslation();
  return (
    // Las secciones se descargan al abrirlas (`AppRoutes`). El `Suspense` va
    // por fuera de la animación a propósito: dentro, una sección que redirige
    // mientras aún se descarga (Menús -> la lista del negocio) dejaba a
    // `AnimatePresence` esperando una salida que nunca terminaba, con el
    // contenido en blanco. Aquí, como React Router navega dentro de una
    // transición, se sigue viendo la sección anterior hasta que la nueva está
    // lista; el texto de carga sólo aparece en la primera visita.
    <Suspense fallback={<p className="p-6 text-[#666666]">{t("Cargando…")}</p>}>
      <AnimatePresence mode="wait" >
        <motion.div
          key={location.pathname}
          className="min-h-0"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.15, ease: '' }}
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
}
