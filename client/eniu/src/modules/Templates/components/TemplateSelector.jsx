import { Check, Lock } from "lucide-react";

import PlanBadge from "../../auth/components/PlanBadge";
import { TEMPLATE_OPTIONS } from "../templates/templateRegistry";
import { useTranslation } from "react-i18next";

export default function TemplateSelector({ value, onChange, isAllowed = () => true }) {
  const { t } = useTranslation();

  const hasLockedTemplates = TEMPLATE_OPTIONS.some((option) => !isAllowed(option.key));

  return <fieldset><div className="flex flex-wrap items-center justify-between gap-2"><legend className="text-sm font-bold text-[#111111]">{t("Plantilla")}</legend>{hasLockedTemplates && <PlanBadge />}</div><div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">{TEMPLATE_OPTIONS.map((option) => {
    const locked = !isAllowed(option.key);
    const selected = value === option.key;
    return <button key={option.key} type="button" onClick={() => { if (!locked) onChange(option.key); }} disabled={locked} aria-pressed={selected} title={locked ? t("Tu plan actual no incluye esta plantilla.") : undefined} className={`min-h-24 rounded-xl border-2 p-3 text-left transition ${locked ? "cursor-not-allowed border-[#E9DDB7] bg-[#F7F3E4] opacity-60" : selected ? "cursor-pointer border-[#E8C93D] bg-[#FFF8DE]" : "cursor-pointer border-[#E9DDB7] bg-white hover:border-[#D7C36A]"}`}><div className="mb-2 flex items-center justify-between"><TemplateThumbnail type={option.key} /><span className={`flex h-6 w-6 items-center justify-center rounded-full ${selected ? "bg-[#FFE05A]" : "bg-[#EFEFEF]"}`}>{locked ? <Lock size={12} className="text-[#8A7420]" /> : selected && <Check size={14} />}</span></div><strong className="text-sm">{t(option.name)}</strong><p className="mt-1 text-xs leading-4 text-[#666666]">{t(option.description)}</p></button>;
  })}</div></fieldset>;
}

function TemplateThumbnail({ type }) {
  if (type === "minimal") return <span className="grid h-8 w-14 gap-1 rounded bg-[#F5F2E9] p-1"><i className="block h-1 bg-[#2A2A2A]" /><i className="block h-px bg-[#999999]" /><i className="block h-px bg-[#999999]" /></span>;
  if (type === "elegant") return <span className="flex h-8 w-14 items-center justify-center border border-[#8A7420] bg-[#FFFDF5] font-serif text-xs italic">Aa</span>;
  if (type === "chalkboard") return <span className="flex h-8 w-14 items-center justify-center rounded border-2 border-dashed border-[#FFE05A] bg-[#2A2A2A] font-serif text-xs italic text-[#FFFDF5]">Aa</span>;
  if (type === "magazine") return <span className="grid h-8 w-14 grid-cols-2 gap-1 rounded bg-[#F5F2E9] p-1"><i className="row-span-2 rounded bg-[#FFE05A]" /><i className="rounded bg-white" /><i className="rounded bg-white" /></span>;
  if (type === "sidebar") return <span className="flex h-8 w-14 gap-1 rounded bg-[#F5F2E9] p-1"><i className="h-full w-3 rounded bg-[#FFE05A]" /><i className="h-full flex-1 rounded bg-white" /></span>;
  if (type === "receipt") return <span className="grid h-8 w-14 gap-1 rounded bg-white p-1"><i className="block h-px border-b border-dotted border-[#999999]" /><i className="block h-px border-b border-dotted border-[#999999]" /><i className="block h-px border-b border-dotted border-[#999999]" /></span>;
  if (type === "story") return <span className="flex h-8 w-14 items-center gap-1 rounded bg-[#F5F2E9] p-1"><i className="h-full w-5 rounded-full bg-[#FFE05A]" /><i className="h-1 flex-1 rounded bg-[#999999]" /></span>;
  return <span className="grid h-8 w-14 grid-cols-2 gap-1 rounded bg-[#FFE05A] p-1"><i className="rounded bg-white" /><i className="rounded bg-white" /></span>;
}
