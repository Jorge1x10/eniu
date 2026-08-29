import { useState } from "react";
import { useForm } from "react-hook-form";
import { GoogleLogin } from "@react-oauth/google";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

const TOTAL_STEPS = 3;
const FIELD_CLASS =
  "w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 outline-none transition focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]";

function Label({ htmlFor, children }) {
  return <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-[#111111]">{children}</label>;
}

function FieldError({ children }) {
  if (!children) return null;
  return <p role="alert" className="mt-1 text-sm text-red-700">{children}</p>;
}

function StepHeader({ step, title, description }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A7420]">Paso {step} de {TOTAL_STEPS}</p>
      <h1 className="mt-2 text-3xl font-bold text-[#111111]">{title}</h1>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }, (_, index) => (
          <span key={index} className={`h-1.5 flex-1 rounded-full ${index < step ? "bg-[#FFE05A]" : "bg-[#E9DDB7]"}`} />
        ))}
      </div>
    </div>
  );
}

export default function RegisterForm() {
  const navigate = useNavigate();
  const { registerAccount, loginWithGoogle } = useAuth();

  const [step, setStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { email: "", phone: "", password: "", confirmPassword: "" },
    mode: "onTouched",
  });
  const password = watch("password");

  const getErrorMessage = (response) => {
    const error = response?.message ?? response?.error;
    if (typeof error === "string") return error;
    if (error && typeof error === "object") return error.message ?? "No se pudo completar la solicitud.";
    return "No se pudo completar la solicitud.";
  };

  // Cada paso valida sólo lo suyo antes de dejar avanzar, para que nadie
  // llegue al resumen con un correo inválido escrito tres pantallas atrás.
  async function goNext(fields) {
    setServerError("");
    const valid = await trigger(fields);
    if (valid) setStep((current) => current + 1);
  }

  function goBack() {
    setServerError("");
    setStep((current) => Math.max(1, current - 1));
  }

  const onSubmit = async (formData) => {
    setServerError("");
    const response = await registerAccount({
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      password: formData.password,
    });
    if (!response.success) {
      setServerError(getErrorMessage(response));
      return;
    }
    localStorage.setItem("access_token", response.data.access_token);
    navigate("/dashboard");
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setServerError("");
    if (!credentialResponse.credential) {
      setServerError("Google no devolvió una credencial válida.");
      return;
    }
    setIsGoogleLoading(true);
    const response = await loginWithGoogle(credentialResponse.credential);
    setIsGoogleLoading(false);
    if (!response.success) {
      setServerError(response.message);
      return;
    }
    localStorage.setItem("access_token", response.data.access_token);
    navigate("/dashboard");
  };

  const handleGoogleError = () => setServerError("No fue posible continuar con Google.");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md space-y-5">
      {step === 1 && <StepHeader step={1} title="Crea tu cuenta" description="Comienza a crear y administrar tus menús." />}
      {step === 2 && <StepHeader step={2} title="Tu teléfono" description="Lo usamos para identificar tu cuenta y contactarte si hace falta." />}
      {step === 3 && <StepHeader step={3} title="Confirma tus datos" description="Revisa que todo esté bien antes de crear la cuenta." />}

      {serverError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
      )}

      {step === 1 && (
        <>
          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <input id="email" type="email" placeholder="correo@ejemplo.com" autoComplete="email" className={FIELD_CLASS}
              {...register("email", {
                required: "El correo es obligatorio",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Escribe un correo válido" },
              })} />
            <FieldError>{errors.email?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="password">Contraseña</Label>
            <input id="password" type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" className={FIELD_CLASS}
              {...register("password", {
                required: "La contraseña es obligatoria",
                minLength: { value: 8, message: "Debe tener al menos 8 caracteres" },
              })} />
            <FieldError>{errors.password?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <input id="confirmPassword" type="password" placeholder="Repite tu contraseña" autoComplete="new-password" className={FIELD_CLASS}
              {...register("confirmPassword", {
                required: "Confirma tu contraseña",
                validate: (value) => value === password || "Las contraseñas no coinciden",
              })} />
            <FieldError>{errors.confirmPassword?.message}</FieldError>
          </div>

          {/* La casilla va aquí y no al final: desde esta misma pantalla se
              puede crear la cuenta con Google, así que debe cubrir los dos caminos. */}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#E9DDB7] bg-white p-3">
            <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#E8C93D]" />
            <span className="text-sm leading-6 text-[#444444]">
              Acepto los <Link to="/terminos" target="_blank" className="font-semibold text-[#111111] underline underline-offset-2">términos y condiciones</Link>
              {" "}y el <Link to="/privacidad" target="_blank" className="font-semibold text-[#111111] underline underline-offset-2">aviso de privacidad</Link>.
            </span>
          </label>

          <button type="button" disabled={!acceptedTerms} onClick={() => goNext(["email", "password", "confirmPassword"])}
            className="w-full rounded-lg bg-[#FFE05A] px-4 py-3 font-semibold text-[#111111] transition hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-60">
            Continuar
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#D9D9D9]" />
            <span className="text-sm text-gray-500">o continúa con</span>
            <div className="h-px flex-1 bg-[#D9D9D9]" />
          </div>

          <div className="flex justify-center">
            {isGoogleLoading ? (
              <p className="text-sm text-gray-600">Validando cuenta de Google...</p>
            ) : acceptedTerms ? (
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} text="signup_with" shape="rectangular" width="400" />
            ) : (
              <p className="text-center text-sm text-gray-600">Acepta los términos para continuar con Google.</p>
            )}
          </div>

          <p className="text-center text-sm text-gray-600">
            ¿Ya tienes una cuenta?{" "}
            <button type="button" onClick={() => navigate("/login")} className="font-semibold text-[#111111] underline">Inicia sesión</button>
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <input id="phone" type="tel" inputMode="numeric" placeholder="3312345678" autoComplete="tel" className={FIELD_CLASS}
              {...register("phone", {
                required: "El teléfono es obligatorio",
                pattern: { value: /^\d{10}$/, message: "Escribe los 10 dígitos, sin espacios" },
              })} />
            <FieldError>{errors.phone?.message}</FieldError>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={goBack} className="min-h-11 flex-1 rounded-lg border border-[#111111] px-4 py-3 font-semibold text-[#111111] transition hover:bg-[#F8E8AE]">Atrás</button>
            <button type="button" onClick={() => goNext(["phone"])} className="min-h-11 flex-1 rounded-lg bg-[#FFE05A] px-4 py-3 font-semibold text-[#111111] transition hover:bg-[#E8C93D]">Continuar</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <dl className="divide-y divide-[#E9DDB7] rounded-lg border border-[#E9DDB7] bg-white">
            <div className="flex items-center justify-between gap-4 p-4">
              <dt className="text-sm text-gray-600">Correo</dt>
              <dd className="text-sm font-semibold text-[#111111]">{getValues("email").trim().toLowerCase()}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 p-4">
              <dt className="text-sm text-gray-600">Teléfono</dt>
              <dd className="text-sm font-semibold text-[#111111]">{getValues("phone").trim()}</dd>
            </div>
          </dl>

          <div className="flex gap-3">
            <button type="button" onClick={goBack} className="min-h-11 flex-1 rounded-lg border border-[#111111] px-4 py-3 font-semibold text-[#111111] transition hover:bg-[#F8E8AE]">Atrás</button>
            <button type="submit" disabled={isSubmitting} className="min-h-11 flex-1 rounded-lg bg-[#FFE05A] px-4 py-3 font-semibold text-[#111111] transition hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
