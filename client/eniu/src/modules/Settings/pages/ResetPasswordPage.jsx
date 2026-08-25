import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useApi } from "../../auth/services/useApi";
import { useAuth } from "../../auth/hooks/useAuth";
import AuthShell from "../components/AuthShell";
import PasswordField from "../components/PasswordField";

export default function ResetPasswordPage() {
  const navigate = useNavigate(); const { logout } = useAuth(); const { post, loading } = useApi("auth/reset-password");
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token"));
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [error, setError] = useState("");
  useEffect(() => { window.history.replaceState(window.history.state, "", "/reset-password"); }, []);
  async function handleSubmit(event) {
    event.preventDefault(); if (loading) return;
    if (!token) { setError("El enlace de recuperación no es válido"); return; }
    if (password.length < 8 || password.length > 128 || !password.trim()) { setError("La contraseña debe tener entre 8 y 128 caracteres"); return; }
    if (password !== confirmation) { setError("Las contraseñas no coinciden"); return; }
    setError(""); const response = await post({ token, new_password: password });
    if (!response.ok) { setError(response.data?.message || "El enlace venció o ya fue utilizado"); return; }
    logout(); navigate("/login", { replace: true, state: { passwordReset: true } });
  }
  return <AuthShell title="Crea una nueva contraseña" description="Usa al menos 8 caracteres. Al guardar, las sesiones anteriores quedarán cerradas.">{!token ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><p>El enlace de recuperación no es válido o ya no está disponible.</p><Link to="/forgot-password" className="mt-4 inline-flex min-h-11 items-center font-bold underline underline-offset-4">Solicitar otro enlace</Link></div> : <form onSubmit={handleSubmit} className="space-y-5" noValidate><PasswordField id="new-password" label="Nueva contraseña" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} help="Entre 8 y 128 caracteres." /><PasswordField id="confirm-password" label="Confirmar contraseña" autoComplete="new-password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(""); }} />{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button type="submit" disabled={loading} className="min-h-11 w-full cursor-pointer rounded-xl bg-[#FFE05A] px-5 py-3 font-bold text-[#111111] hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Actualizando..." : "Guardar nueva contraseña"}</button></form>}</AuthShell>;
}
