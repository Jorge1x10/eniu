import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function BackgroundPresetPicker({ backgrounds, value, onChange, disabled = false }) {
  const { t } = useTranslation();

  return (
    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
      <button
        type="button"
        onClick={() => !disabled && onChange(null)}
        disabled={disabled}
        aria-pressed={value === null}
        className={`flex h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center text-[10px] font-semibold ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${value === null ? "border-[#E8C93D] bg-[#FFF8DE]" : "border-[#E9DDB7] bg-white hover:border-[#D7C36A]"}`}
      >
        {t("Ninguno")}
      </button>
      {backgrounds.map((background) => {
        const selected = value === background.key;
        return (
          <button
            key={background.key}
            type="button"
            onClick={() => !disabled && onChange(background.key)}
            disabled={disabled}
            aria-pressed={selected}
            title={t(background.name)}
            className={`relative flex h-16 items-center justify-center overflow-hidden rounded-xl border-2 bg-white ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${selected ? "border-[#E8C93D]" : "border-[#E9DDB7] hover:border-[#D7C36A]"}`}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 text-[#2A2A2A] opacity-50"
              style={{ backgroundImage: background.css, backgroundSize: background.size }}
            />
            {selected && <Check size={16} className="relative text-[#8A7420]" />}
          </button>
        );
      })}
    </div>
  );
}
