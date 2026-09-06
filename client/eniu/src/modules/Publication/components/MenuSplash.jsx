import { useEffect, useState } from "react";

import { resolveAssetUrl } from "../../Templates/templates/menuData";

/**
 * Pantalla de bienvenida del menú público.
 *
 * Se muestra encima del menú durante los segundos que el dueño configuró y se
 * desvanece sola. Nunca bloquea: el menú ya está debajo, y un toque la cierra
 * antes de tiempo, porque el comensal está en la mesa con hambre y esperar no
 * debería ser obligatorio.
 */
export default function MenuSplash({ splash, theme, businessName }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const duration = Number(splash?.duration) || 2.5;

  useEffect(() => {
    const fade = window.setTimeout(() => setFading(true), duration * 1000);
    const hide = window.setTimeout(() => setVisible(false), duration * 1000 + 400);
    return () => { window.clearTimeout(fade); window.clearTimeout(hide); };
  }, [duration]);

  // Quien llega con «reducir movimiento» activado no necesita la animación.
  if (!visible) return null;

  return (
    <div
      role="presentation"
      onClick={() => setFading(true)}
      style={{
        backgroundColor: theme?.background_color || "#FFFDF5",
        opacity: fading ? 0 : 1,
        transform: fading ? "translateY(-100%)" : "translateY(0)",
      }}
      className="fixed inset-0 z-50 flex items-center justify-center transition-[opacity,transform] duration-[400ms] ease-in motion-reduce:transition-none"
    >
      {splash?.image_url ? (
        <img src={resolveAssetUrl(splash.image_url)} alt="" className="max-h-[45vh] max-w-[70vw] object-contain" />
      ) : (
        <p style={{ color: theme?.text_color || "#111111" }} className="px-8 text-center text-3xl font-black">
          {businessName}
        </p>
      )}
    </div>
  );
}
