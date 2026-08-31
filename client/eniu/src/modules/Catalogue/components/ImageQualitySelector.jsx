import { IMAGE_QUALITIES } from "../../../services/imageFile";
import { useTranslation } from "react-i18next";

/**
 * Deja que el dueño decida cuánta calidad conserva al subir una foto, igual
 * que `ImageQualitySelector` en la app móvil.
 *
 * La decisión es suya y no de la app porque el equilibrio depende del negocio:
 * una pastelería vive de que se vea el detalle, una fonda de que el menú abra
 * rápido en un celular con mala señal.
 */
export default function ImageQualitySelector({ value, onChange, disabled = false }) {
  const { t } = useTranslation();

  return (
    <fieldset className="mt-3" disabled={disabled}>
      <legend className="text-sm font-semibold text-[#2A2A2A]">{t("Calidad de las fotos")}</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {IMAGE_QUALITIES.map((option) => {
          const selected = option.key === value;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.key)}
              className={`min-h-11 rounded-xl border px-2 py-2 text-center disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? "border-[#E8C93D] bg-[#FFE05A]"
                  : "cursor-pointer border-[#D9D9D9] bg-white hover:bg-[#FFF8DE]"
              }`}
            >
              <span className="block text-sm font-bold text-[#2A2A2A]">{t(option.label)}</span>
              <span className={`block text-xs ${selected ? "text-[#5E501A]" : "text-[#777777]"}`}>
                {t(option.hint)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
