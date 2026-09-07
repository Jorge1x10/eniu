import { useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * Encuadre de la portada: arrastrar sobre la propia foto para elegir qué
 * parte queda visible dentro del recuadro fijo, sin recortar el archivo
 * (el mismo patrón que Facebook/Instagram usan para su foto de portada).
 */
export default function CoverFocalPicker({ imageUrl, focalX, focalY, onChange, disabled = false }) {
  const { t } = useTranslation();
  const containerRef = useRef(null);

  function positionFromEvent(event) {
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    onChange(Number(x.toFixed(3)), Number(y.toFixed(3)));
  }

  function handlePointerDown(event) {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    positionFromEvent(event);
  }

  function handlePointerMove(event) {
    if (disabled || event.buttons !== 1) return;
    positionFromEvent(event);
  }

  if (!imageUrl) return null;

  return (
    <div className="mt-3">
      <p className="text-sm font-semibold text-[#2A2A2A]">{t("Encuadre de la portada")}</p>
      <p className="mt-1 text-xs text-[#777777]">{t("Arrastra sobre la foto para elegir qué parte se ve.")}</p>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className={`relative mt-2 h-32 w-full touch-none overflow-hidden rounded-xl border border-[#D9D9D9] ${disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair"}`}
      >
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
          style={{ objectPosition: `${focalX * 100}% ${focalY * 100}%` }}
        />
        <div
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/40 shadow-md"
          style={{ left: `${focalX * 100}%`, top: `${focalY * 100}%` }}
        />
      </div>
    </div>
  );
}
