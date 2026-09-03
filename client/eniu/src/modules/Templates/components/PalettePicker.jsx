import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const SWATCH_TOKENS = ["background", "primary", "accent", "text"];

export default function PalettePicker({ palettes, value, onChange }) {
  const { t } = useTranslation();

  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {palettes.map((palette) => {
        const selected = value === palette.key;
        return (
          <button
            key={palette.key}
            type="button"
            onClick={() => onChange(palette.key)}
            aria-pressed={selected}
            className={`flex min-h-24 flex-col items-start gap-2 rounded-xl border-2 p-3 text-left transition ${selected ? "cursor-pointer border-[#E8C93D] bg-[#FFF8DE]" : "cursor-pointer border-[#E9DDB7] bg-white hover:border-[#D7C36A]"}`}
          >
            <div className="flex w-full items-center justify-between">
              <span className="flex gap-1">
                {SWATCH_TOKENS.map((token) => <span key={token} className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: palette.tokens[token] }} />)}
              </span>
              {selected && <Check size={16} className="text-[#8A7420]" />}
            </div>
            <strong className="text-xs font-bold">{t(palette.name)}</strong>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center transition ${value === null ? "cursor-pointer border-[#E8C93D] bg-[#FFF8DE]" : "cursor-pointer border-[#E9DDB7] bg-white hover:border-[#D7C36A]"}`}
      >
        <strong className="text-xs font-bold">{t("Personalizado")}</strong>
        <span className="text-[11px] text-[#777777]">{t("Elige cada color a mano")}</span>
      </button>
    </div>
  );
}
