import { Check } from "lucide-react";

import { TEMPLATE_OPTIONS } from "../templates/templateRegistry";

export default function TemplateSelector({ value, onChange }) {
  return <fieldset><legend className="text-sm font-bold text-[#111111]">Plantilla</legend><div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">{TEMPLATE_OPTIONS.map((option) => <button key={option.key} type="button" onClick={() => onChange(option.key)} aria-pressed={value === option.key} className={`min-h-24 cursor-pointer rounded-xl border-2 p-3 text-left transition ${value === option.key ? "border-[#E8C93D] bg-[#FFF8DE]" : "border-[#E9DDB7] bg-white hover:border-[#D7C36A]"}`}><div className="mb-2 flex items-center justify-between"><TemplateThumbnail type={option.key} /><span className={`flex h-6 w-6 items-center justify-center rounded-full ${value === option.key ? "bg-[#FFE05A]" : "bg-[#EFEFEF]"}`}>{value === option.key && <Check size={14} />}</span></div><strong className="text-sm">{option.name}</strong><p className="mt-1 text-xs leading-4 text-[#666666]">{option.description}</p></button>)}</div></fieldset>;
}

function TemplateThumbnail({ type }) {
  if (type === "minimal") return <span className="grid h-8 w-14 gap-1 rounded bg-[#F5F2E9] p-1"><i className="block h-1 bg-[#2A2A2A]" /><i className="block h-px bg-[#999999]" /><i className="block h-px bg-[#999999]" /></span>;
  if (type === "elegant") return <span className="flex h-8 w-14 items-center justify-center border border-[#8A7420] bg-[#FFFDF5] font-serif text-xs italic">Aa</span>;
  return <span className="grid h-8 w-14 grid-cols-2 gap-1 rounded bg-[#FFE05A] p-1"><i className="rounded bg-white" /><i className="rounded bg-white" /></span>;
}
