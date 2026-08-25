import { Link } from "react-router";

import darkLogo from "../../../assets/Images/eniu-DarkBannerNoBack.svg";

export default function AuthShell({ title, description, children }) {
  return <main className="min-h-screen bg-[#111111] p-4 sm:p-6 lg:grid lg:grid-cols-[0.85fr_1.15fr] lg:gap-6">
    <section className="hidden min-h-[calc(100vh-3rem)] flex-col justify-between p-8 text-[#FFFDF5] lg:flex">
      <Link to="/login" aria-label="Ir al inicio de sesión" className="w-fit"><img src={darkLogo} alt="ENIU" className="h-24" /></Link>
      <div><p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-[#FFE05A]">Seguridad ENIU</p><h2 className="max-w-md text-4xl font-bold leading-tight">Tu cuenta, siempre bajo tu control.</h2><p className="mt-4 max-w-md text-[#D9D9D9]">Los enlaces de recuperación son temporales y solo pueden utilizarse una vez.</p></div>
      <p className="text-sm text-[#D9D9D9]">ENIU</p>
    </section>
    <section className="flex min-h-[calc(100vh-2rem)] items-center justify-center rounded-3xl bg-[#FFFDF5] px-5 py-12 sm:min-h-[calc(100vh-3rem)] sm:px-10"><div className="w-full max-w-md"><Link to="/login" className="mb-8 inline-flex min-h-11 items-center font-semibold text-[#2A2A2A] underline underline-offset-4 lg:hidden">Volver a iniciar sesión</Link><h1 className="text-3xl font-bold text-[#111111]">{title}</h1><p className="mt-3 text-sm leading-6 text-[#666666]">{description}</p><div className="mt-8">{children}</div></div></section>
  </main>;
}
