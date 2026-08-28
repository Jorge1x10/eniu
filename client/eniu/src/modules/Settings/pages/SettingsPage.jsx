import { useEffect, useState } from "react";
import { Building2, CreditCard, LogOut, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router";

import { useBusiness } from "../../Business/services/useBusiness";
import { useAuth } from "../../auth/hooks/useAuth";
import { useApi } from "../../auth/services/useApi";
import PasswordField from "../components/PasswordField";
import { getStoredTheme, saveTheme } from "../utils/theme";

const TABS = [
  { id: "profile", label: "Perfil", icon: UserRound },
  { id: "business", label: "Negocio", icon: Building2 },
  { id: "billing", label: "Plan y facturación", icon: CreditCard },
  { id: "security", label: "Seguridad", icon: ShieldCheck },
];

export default function SettingsPage() {
  // Permite enlazar directo a una pestaña, por ejemplo desde el candado de una
  // función que el plan no incluye.
  const [activeTab, setActiveTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    return TABS.some((tab) => tab.id === requested) ? requested : "profile";
  });
  const { user, setUser, logout } = useAuth();
  const { selectedBusiness, updateBusiness, isLoadingBusinesses } = useBusiness();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  if (!user) return <div className="rounded-2xl bg-white p-6 text-[#666666]">Cargando configuración...</div>;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8A7420]">Tu cuenta</p>
        <h1 className="mt-2 text-3xl font-bold text-[#111111] sm:text-4xl">Configuración</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#666666]">Administra tus datos, el negocio seleccionado y la seguridad de tu cuenta.</p>
      </header>

      <ThemeToggle />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="h-fit rounded-2xl border border-[#E9DDB7] bg-white p-2 shadow-sm" role="tablist" aria-label="Secciones de configuración">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#E8C93D] ${activeTab === id ? "bg-[#FFE05A] text-[#111111]" : "text-[#555555] hover:bg-[#FFF8DE]"}`}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {activeTab === "profile" && <ProfileForm user={user} setUser={setUser} />}
          {activeTab === "business" && <BusinessSettings key={selectedBusiness?.id || "no-business"} business={selectedBusiness} isLoading={isLoadingBusinesses} updateBusiness={updateBusiness} />}
          {activeTab === "billing" && <BillingSettings user={user} setUser={setUser} />}
          {activeTab === "security" && <SecuritySettings user={user} onLogout={handleLogout} />}
        </div>
      </div>

      <p className="text-center text-xs text-[#777777]">
        <Link to="/privacidad" className="font-semibold underline underline-offset-4 hover:text-[#111111]">Aviso de privacidad</Link>
      </p>
    </section>
  );
}

function BillingSettings({ user, setUser }) {
  const { get: getSubscription, loading: subscriptionLoading } = useApi("billing/subscription");
  const checkoutApi = useApi("billing/checkout");
  const portalApi = useApi("billing/portal");
  const [plan, setPlan] = useState(user.plan || null);
  const [error, setError] = useState("");
  const checkoutResult = new URLSearchParams(window.location.search).get("billing");

  useEffect(() => {
    let active = true;
    getSubscription().then((response) => {
      if (!active) return;
      if (response.ok) {
        setPlan(response.data.plan);
        setUser((current) => current ? { ...current, plan: response.data.plan } : current);
      } else {
        setError(response.data?.message || "No fue posible consultar tu suscripción.");
      }
    });
    return () => { active = false; };
  }, [getSubscription, setUser]);

  async function redirectTo(endpoint) {
    setError("");
    const response = await endpoint.post({});
    if (!response.ok || !response.data?.url) {
      setError(response.data?.message || "No fue posible abrir Stripe.");
      return;
    }
    window.location.assign(response.data.url);
  }

  const active = Boolean(plan?.has_access);
  const statusLabels = {
    active: "Activa",
    trialing: "En prueba",
    past_due: "Pago pendiente",
    unpaid: "Sin pagar",
    canceled: "Cancelada",
    incomplete: "Pago incompleto",
    inactive: "Sin suscripción",
  };
  const renewal = plan?.current_period_end
    ? new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(new Date(plan.current_period_end))
    : null;

  return <Card title="Plan y facturación" description="Contrata y administra tu suscripción recurrente de ENIU mediante Stripe.">
    <div className="space-y-5">
      {checkoutResult === "success" && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">Pago recibido. Estamos confirmando el estado de tu suscripción.</p>}
      {checkoutResult === "cancelled" && <p role="status" className="rounded-xl border border-[#E9DDB7] bg-[#FFF8DE] p-3 text-sm text-[#66540E]">La contratación se canceló y no se realizó ningún cargo.</p>}
      <div className="rounded-2xl border border-[#E9DDB7] bg-[#FFF8DE] p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8A7420]">ENIU Esencial</p>
            <p className="mt-2 text-3xl font-black text-[#111111]">$129 <span className="text-base font-semibold text-[#666666]">MXN / mes</span></p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#555555]">Menús digitales, URL pública estable, código QR y administración de productos y categorías.</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-green-100 text-green-800" : "bg-white text-[#555555]"}`}>{subscriptionLoading ? "Consultando..." : statusLabels[plan?.status] || plan?.status || "Sin suscripción"}</span>
        </div>
        {renewal && <p className="mt-4 text-sm text-[#555555]">{plan.cancel_at_period_end ? "Acceso disponible hasta" : "Próxima renovación"}: <strong>{renewal}</strong></p>}
      </div>
      <Feedback error={error} />
      <div className="flex flex-col gap-3 sm:flex-row">
        {active ? <button type="button" disabled={portalApi.loading} onClick={() => redirectTo(portalApi)} className="min-h-11 cursor-pointer rounded-xl bg-[#FFE05A] px-5 py-3 font-bold text-[#111111] hover:bg-[#E8C93D] disabled:opacity-60">{portalApi.loading ? "Abriendo..." : "Administrar suscripción"}</button> : <button type="button" disabled={checkoutApi.loading || subscriptionLoading} onClick={() => redirectTo(checkoutApi)} className="min-h-11 cursor-pointer rounded-xl bg-[#FFE05A] px-5 py-3 font-bold text-[#111111] hover:bg-[#E8C93D] disabled:opacity-60">{checkoutApi.loading ? "Preparando..." : "Contratar Plan Esencial"}</button>}
      </div>
      <p className="text-xs leading-5 text-[#777777]">El cobro es recurrente mensual. Stripe procesa el pago y permite actualizar el método de pago o cancelar desde su portal seguro.</p>
    </div>
  </Card>;
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => getStoredTheme() === "dark");

  function toggleTheme() {
    const nextIsDark = !isDark;
    saveTheme(nextIsDark ? "dark" : "light");
    setIsDark(nextIsDark);
  }

  return (
    <div className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-[#E9DDB7] bg-white px-4 py-3 shadow-sm sm:max-w-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8E8AE] text-[#111111]">
          {isDark ? <Moon size={19} /> : <Sun size={19} />}
        </span>
        <span>
          <span className="block text-sm font-bold text-[#111111]">Modo oscuro</span>
          <span className="block text-xs text-[#777777]">Apariencia del panel</span>
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Modo oscuro"
        onClick={toggleTheme}
        className={`relative h-7 w-13 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#E8C93D] focus:ring-offset-2 ${isDark ? "bg-[#FFE05A]" : "bg-[#B8B8B8]"}`}
      >
        <span className={`theme-toggle-thumb absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isDark ? "translate-x-7" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function Card({ title, description, children }) {
  return <div className="rounded-2xl border border-[#E9DDB7] bg-white p-5 shadow-sm sm:p-7"><h2 className="text-2xl font-bold text-[#111111]">{title}</h2>{description && <p className="mt-2 text-sm leading-6 text-[#666666]">{description}</p>}<div className="mt-6">{children}</div></div>;
}

function Field({ label, error, help, readOnly = false, ...props }) {
  const descriptionId = `${props.id}-description`;
  return <div><label htmlFor={props.id} className="mb-2 block text-sm font-semibold text-[#2A2A2A]">{label}</label><input {...props} readOnly={readOnly} aria-invalid={Boolean(error)} aria-describedby={(error || help) ? descriptionId : undefined} className={`min-h-11 w-full rounded-xl border border-[#D9D9D9] px-4 py-3 outline-none transition focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/50 ${readOnly ? "cursor-not-allowed bg-[#F3F3F3] text-[#777777]" : "bg-white"}`} />{(error || help) && <span id={descriptionId} role={error ? "alert" : undefined} className={`mt-1 block text-xs ${error ? "text-red-700" : "text-[#777777]"}`}>{error || help}</span>}</div>;
}

function Feedback({ error, success }) {
  if (error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (success) return <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>;
  return null;
}

function PrimaryButton({ loading, children }) {
  return <button type="submit" disabled={loading} className="min-h-11 cursor-pointer rounded-xl bg-[#FFE05A] px-5 py-3 font-bold text-[#111111] transition hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Guardando..." : children}</button>;
}

function DeleteAccountCard({ user, onLogout }) {
  const { request, loading } = useApi("users/me");
  const hasPassword = Boolean((user.auth_methods || {}).password);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  // Con contraseña se pide la contraseña; quien entró con Google o Apple no
  // tiene ninguna, y exigírsela lo dejaría sin poder borrar su cuenta.
  const ready = hasPassword ? value.length > 0 : value.trim().toUpperCase() === "ELIMINAR";

  async function submit(event) {
    event.preventDefault();
    if (loading || !ready) return;
    setError("");
    const response = await request({
      method: "DELETE",
      data: hasPassword ? { password: value } : { confirmation: value },
    });
    if (!response.ok) {
      setError(response.data?.message || "No fue posible eliminar la cuenta.");
      return;
    }
    onLogout();
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-2xl font-bold text-red-800">Eliminar cuenta</h2>
      <p className="mt-2 text-sm leading-6 text-[#666666]">
        Se eliminan tus negocios, menús, productos y fotos, y tus menús publicados dejan de estar disponibles.
        Si tienes una suscripción activa se cancela antes de borrar nada. <strong>No se puede deshacer.</strong>
      </p>
      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        {hasPassword
          ? <PasswordField id="delete-account-password" label="Confirma con tu contraseña" autoComplete="current-password" value={value} onChange={(event) => { setValue(event.target.value); setError(""); }} />
          : <Field id="delete-account-confirmation" label="Escribe ELIMINAR para confirmar" value={value} autoComplete="off" onChange={(event) => { setValue(event.target.value); setError(""); }} help="Tu cuenta usa Google o Apple, así que no tiene contraseña." />}
        <Feedback error={error} />
        <button type="submit" disabled={loading || !ready} className="min-h-11 cursor-pointer rounded-xl border border-red-700 bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? "Eliminando..." : "Eliminar mi cuenta"}
        </button>
      </form>
    </div>
  );
}

function ProfileForm({ user, setUser }) {
  const { patch, loading } = useApi("users/me");
  const [form, setForm] = useState({ name: user.name || "", username: user.username || "", phone_number: user.phone_number || "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); setError(""); setSuccess(""); }
  async function submit(event) {
    event.preventDefault(); if (loading) return;
    const username = form.username.trim();
    if (username && (username.length < 4 || username.length > 50)) { setError("El nombre de usuario debe tener entre 4 y 50 caracteres"); return; }
    const response = await patch({ name: form.name.trim(), username, phone_number: form.phone_number.trim() });
    if (!response.ok) { setError(response.status === 409 ? "Ese nombre de usuario o teléfono ya está en uso." : response.data?.message || "No fue posible guardar el perfil."); return; }
    setUser(response.data.user);
    setForm({ name: response.data.user.name || "", username: response.data.user.username || "", phone_number: response.data.user.phone_number || "" });
    setError("");
    setSuccess("Tu perfil se actualizó correctamente.");
  }

  const displayName = user.name || user.username || user.email;
  return <Card title="Mi perfil" description="El correo no puede modificarse hasta contar con un proceso de verificación seguro.">
    <div className="mb-6 flex items-center gap-4 rounded-2xl bg-[#FFF8DE] p-4">{user.profile_picture ? <img src={user.profile_picture} alt={`Foto de ${displayName}`} referrerPolicy="no-referrer" className="h-14 w-14 rounded-full object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE05A] text-xl font-bold">{displayName.charAt(0).toUpperCase()}</div>}<div><p className="font-bold text-[#111111]">{displayName}</p><p className="mt-1 text-xs text-[#777777]">La foto se administra mediante tu proveedor de acceso.</p></div></div>
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2" noValidate>
      <Field id="profile-name" name="name" label="Nombre visible" autoComplete="name" maxLength={50} value={form.name} onChange={update} />
      <Field id="profile-username" name="username" label="Nombre de usuario" autoComplete="username" maxLength={50} value={form.username} onChange={update} help="Letras, números, puntos y guion bajo." />
      <Field id="profile-phone" name="phone_number" label="Teléfono" type="tel" autoComplete="tel" maxLength={20} value={form.phone_number} onChange={update} />
      <Field id="profile-email" label="Correo electrónico" type="email" autoComplete="email" value={user.email} readOnly help="Solo lectura por seguridad." />
      <div className="space-y-4 sm:col-span-2"><Feedback error={error} success={success} /><PrimaryButton loading={loading}>Guardar perfil</PrimaryButton></div>
    </form>
  </Card>;
}

function BusinessSettings({ business, isLoading, updateBusiness }) {
  const { patch, loading } = useApi(business ? `businesses/${business.id}` : "");
  const [form, setForm] = useState(() => business ? { name: business.name || "", description: business.description || "", phone: business.phone || "", whatsapp: business.whatsapp || "", address: business.address || "", currency: business.currency || "MXN", timezone: business.timezone || "America/Mexico_City" } : null);
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");

  if (isLoading) return <Card title="Mi negocio"><p className="text-[#666666]">Cargando negocio seleccionado...</p></Card>;
  if (!business || !form) return <Card title="Mi negocio" description="Selecciona o crea un negocio desde el selector del dashboard para configurar sus datos."><Link to="/dashboard" className="inline-flex min-h-11 items-center rounded-xl bg-[#FFE05A] px-5 font-bold text-[#111111]">Ir al inicio</Link></Card>;

  function update(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); setError(""); setSuccess(""); }
  async function submit(event) {
    event.preventDefault(); if (loading) return;
    if (!form.name.trim()) { setError("El nombre del negocio es obligatorio."); return; }
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])); payload.currency = payload.currency.toUpperCase();
    const response = await patch(payload);
    if (!response.ok) { setError(response.data?.message || "No fue posible guardar el negocio."); return; }
    updateBusiness(response.data.business); setError(""); setSuccess("Los datos del negocio se actualizaron correctamente.");
  }

  return <Card title="Mi negocio" description={`Editando la información esencial de ${business.name}.`}><form onSubmit={submit} className="grid gap-5 sm:grid-cols-2" noValidate>
    <Field id="business-name" name="name" label="Nombre del negocio" maxLength={64} required value={form.name} onChange={update} />
    <Field id="business-currency" name="currency" label="Moneda" maxLength={3} required value={form.currency} onChange={update} help="Código de tres letras, por ejemplo MXN." />
    <Field id="business-phone" name="phone" label="Teléfono" type="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={update} />
    <Field id="business-whatsapp" name="whatsapp" label="WhatsApp" type="tel" autoComplete="tel" maxLength={20} value={form.whatsapp} onChange={update} />
    <Field id="business-address" name="address" label="Dirección" maxLength={500} value={form.address} onChange={update} />
    <Field id="business-timezone" name="timezone" label="Zona horaria" maxLength={64} required value={form.timezone} onChange={update} help="Ejemplo: America/Mexico_City" />
    <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-[#2A2A2A]">Descripción</span><textarea id="business-description" name="description" rows={4} maxLength={2000} value={form.description} onChange={update} className="w-full resize-y rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/50" /></label>
    <div className="space-y-4 sm:col-span-2"><Feedback error={error} success={success} /><PrimaryButton loading={loading}>Guardar negocio</PrimaryButton></div>
  </form></Card>;
}

function SecuritySettings({ user, onLogout }) {
  const passwordApi = useApi("auth/password"); const sessionsApi = useApi("auth/sessions/revoke");
  const [form, setForm] = useState({ current: "", next: "", confirmation: "" });
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");
  const methods = user.auth_methods || { password: true, google: Boolean(user.profile_picture) };
  function keepCurrentSession(data) { localStorage.setItem("access_token", data.access_token); localStorage.setItem("refresh_token", data.refresh_token); }
  async function submit(event) {
    event.preventDefault(); if (passwordApi.loading) return;
    if (form.next.length < 8 || form.next.length > 128 || !form.next.trim()) { setError("La nueva contraseña debe tener entre 8 y 128 caracteres."); return; }
    if (form.next !== form.confirmation) { setError("Las contraseñas no coinciden."); return; }
    const response = await passwordApi.patch({ current_password: form.current, new_password: form.next });
    if (!response.ok) { setError(response.data?.message || "No fue posible cambiar la contraseña."); return; }
    keepCurrentSession(response.data); setForm({ current: "", next: "", confirmation: "" }); setError(""); setSuccess("Contraseña actualizada. Las sesiones anteriores fueron cerradas.");
  }
  async function revoke() {
    if (sessionsApi.loading) return; setError(""); setSuccess("");
    const response = await sessionsApi.post({});
    if (!response.ok) { setError(response.data?.message || "No fue posible cerrar las sesiones."); return; }
    keepCurrentSession(response.data); setSuccess("Las demás sesiones fueron cerradas.");
  }
  return <div className="space-y-6">
    <Card title="Contraseña y acceso" description={`Métodos activos: ${[methods.password && "contraseña", methods.google && "Google"].filter(Boolean).join(" y ") || "sin identificar"}.`}>
      {methods.password ? <form onSubmit={submit} className="space-y-5" noValidate>
        <PasswordField id="current-password" label="Contraseña actual" autoComplete="current-password" value={form.current} onChange={(event) => { setForm({ ...form, current: event.target.value }); setError(""); setSuccess(""); }} />
        <div className="grid gap-5 sm:grid-cols-2"><PasswordField id="settings-new-password" label="Nueva contraseña" autoComplete="new-password" value={form.next} onChange={(event) => { setForm({ ...form, next: event.target.value }); setError(""); setSuccess(""); }} help="Entre 8 y 128 caracteres." /><PasswordField id="settings-confirm-password" label="Confirmar contraseña" autoComplete="new-password" value={form.confirmation} onChange={(event) => { setForm({ ...form, confirmation: event.target.value }); setError(""); setSuccess(""); }} /></div>
        <Feedback error={error} success={success} /><PrimaryButton loading={passwordApi.loading}>Cambiar contraseña</PrimaryButton>
      </form> : <div className="rounded-xl bg-[#FFF8DE] p-4 text-sm leading-6 text-[#2A2A2A]">Tu cuenta usa Google. Para establecer una contraseña local, verifica tu correo mediante <Link to="/forgot-password" className="font-bold underline underline-offset-4">recuperación de contraseña</Link>.</div>}
    </Card>
    <Card title="Sesiones" description="Puedes cerrar el acceso en otros dispositivos sin salir de este.">
      {!methods.password && <Feedback error={error} success={success} />}
      <div className="flex flex-col gap-3 sm:flex-row"><button type="button" onClick={revoke} disabled={sessionsApi.loading} className="min-h-11 cursor-pointer rounded-xl border border-[#111111] px-5 py-3 font-bold text-[#111111] hover:bg-[#F8E8AE] disabled:cursor-not-allowed disabled:opacity-60">{sessionsApi.loading ? "Cerrando..." : "Cerrar las demás sesiones"}</button><button type="button" onClick={onLogout} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-700 bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700"><LogOut size={18} /> Cerrar sesión</button></div>
    </Card>
    <DeleteAccountCard user={user} onLogout={onLogout} />
  </div>;
}
