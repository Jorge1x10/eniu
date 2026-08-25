import { useState } from "react";
import { Link } from "react-router";
import { useApi } from "../../auth/services/useApi";
import AuthShell from "../components/AuthShell";

export default function ForgotPasswordPage() {
  const { post, loading } = useApi("auth/forgot-password"); const [email, setEmail] = useState(""); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  async function handleSubmit(event) {
    event.preventDefault(); if (loading) return;
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setError("Ingresa un correo electrónico válido"); return; }
    setError(""); const response = await post({ email: normalized });
    if (!response.ok) { setError("No pudimos procesar la solicitud. Intenta nuevamente."); return; }
    setMessage(response.data?.message || "Si existe una cuenta asociada, recibirás instrucciones para restablecer tu contraseña.");
  }
  return <AuthShell title="Recupera tu contraseña" description="Escribe el correo asociado a tu cuenta. Por seguridad, la respuesta será la misma exista o no una cuenta.">{message ? <div role="status" className="rounded-2xl border border-[#E9DDB7] bg-[#F8E8AE]/45 p-5 text-sm leading-6 text-[#2A2A2A]"><p>{message}</p><Link to="/login" className="mt-5 inline-flex min-h-11 items-center font-bold underline underline-offset-4">Volver a iniciar sesión</Link></div> : <form onSubmit={handleSubmit} className="space-y-5" noValidate><div><label htmlFor="recovery-email" className="mb-2 block text-sm font-semibold text-[#2A2A2A]">Correo electrónico</label><input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "recovery-email-error" : undefined} className="min-h-11 w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/50" />{error && <span id="recovery-email-error" role="alert" className="mt-2 block text-sm text-red-700">{error}</span>}</div><button type="submit" disabled={loading} className="min-h-11 w-full cursor-pointer rounded-xl bg-[#FFE05A] px-5 py-3 font-bold text-[#111111] hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Enviando..." : "Enviar instrucciones"}</button><Link to="/login" className="flex min-h-11 items-center justify-center text-sm font-semibold text-[#2A2A2A] underline underline-offset-4">Volver al inicio de sesión</Link></form>}</AuthShell>;
}
