import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({ label, error, help, ...props }) {
  const [visible, setVisible] = useState(false);
  const helpId = `${props.id}-help`; const errorId = `${props.id}-error`;
  return <div><label htmlFor={props.id} className="mb-2 block text-sm font-semibold text-[#2A2A2A]">{label}</label><span className="relative block"><input {...props} type={visible ? "text" : "password"} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : help ? helpId : undefined} className="min-h-11 w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 pr-12 outline-none transition focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/50" /><button type="button" onClick={() => setVisible((current) => !current)} className="absolute right-1 top-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#666666] hover:bg-[#F8E8AE] focus:outline-none focus:ring-2 focus:ring-[#E8C93D]" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>{help && !error && <span id={helpId} className="mt-1 block text-xs text-[#777777]">{help}</span>}{error && <span id={errorId} role="alert" className="mt-1 block text-sm text-red-700">{error}</span>}</div>;
}
