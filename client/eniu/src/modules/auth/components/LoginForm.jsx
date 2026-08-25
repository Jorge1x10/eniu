import { useState } from "react";
import { useForm } from "react-hook-form";
import { GoogleLogin } from "@react-oauth/google";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useApi } from "../services/useApi";

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState("");
  const {startSession} = useAuth();
  const { post: login, loading: isLoginLoading } = useApi("auth/login");

  const { post: loginWithGoogle, loading: isGoogleLoading } =
    useApi("auth/google");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  async function onSubmit(formData) {
    setServerError("");

    const response = await login({
      identifier: formData.identifier.trim(),
      password: formData.password,
    });

    if (!response.ok) {
      setServerError(
        response.data?.message || "No fue posible iniciar sesión.",
      );
      return;
    }

    startSession(response.data);
    navigate("/dashboard", { replace: true });
  }

  async function handleGoogleSuccess(credentialResponse) {
    setServerError("");

    const credential = credentialResponse.credential;

    if (!credential) {
      setServerError("Google no devolvió una credencial válida.");
      return;
    }

    const response = await loginWithGoogle({
      credential,
    });

    if (!response.ok) {
      setServerError(
        response.data?.message || "No fue posible iniciar sesión con Google.",
      );
      return;
    }

    if (response.data.requires_profile_completion) {
      sessionStorage.setItem("profile_token", response.data.profile_token);

      navigate("/complete-profile", {
        replace: true,
      });
      return;
    }

    startSession(response.data);
    navigate("/dashboard", { replace: true });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md space-y-5"
    >
      <div>
        <h1 className="text-3xl font-bold text-[#111111]">Inicia sesión</h1>

        <p className="mt-2 text-sm text-gray-600">
          Accede para administrar tus menús.
        </p>
      </div>

      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {location.state?.passwordReset && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Tu contraseña fue actualizada. Ya puedes iniciar sesión.
        </div>
      )}

      <div>
        <label
          htmlFor="identifier"
          className="mb-1 block text-sm font-medium text-[#111111]"
        >
          Correo o nombre de usuario
        </label>

        <input
          id="identifier"
          type="text"
          placeholder="correo@ejemplo.com"
          autoComplete="username"
          className="
            w-full rounded-lg border border-[#D9D9D9]
            bg-white px-4 py-3 outline-none transition
            focus:border-[#E8C93D]
            focus:ring-2 focus:ring-[#FFE05A]
          "
          {...register("identifier", {
            required: "Ingresa tu correo o nombre de usuario",
          })}
        />

        {errors.identifier && (
          <p className="mt-1 text-sm text-red-600">
            {errors.identifier.message}
          </p>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-sm font-medium text-[#111111]"
          >
            Contraseña
          </label>

          <Link
            to="/forgot-password"
            className="text-sm font-medium text-[#111111] underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <input
          id="password"
          type="password"
          placeholder="Ingresa tu contraseña"
          autoComplete="current-password"
          className="
            w-full rounded-lg border border-[#D9D9D9]
            bg-white px-4 py-3 outline-none transition
            focus:border-[#E8C93D]
            focus:ring-2 focus:ring-[#FFE05A]
            "
          {...register("password", {
            required: "La contraseña es obligatoria",
          })}
        />

        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoginLoading || isGoogleLoading}
        className="
          w-full rounded-lg bg-[#FFE05A]
          px-4 py-3 font-semibold text-[#111111]
          transition hover:bg-[#E8C93D]
          disabled:cursor-not-allowed
          disabled:opacity-60 cursor-pointer
        "
      >
        {isLoginLoading ? "Iniciando sesión..." : "Iniciar sesión"}
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#D9D9D9]" />

        <span className="text-sm text-gray-500">o continúa con</span>

        <div className="h-px flex-1 bg-[#D9D9D9]" />
      </div>

      <div className="flex justify-center">
        {isGoogleLoading ? (
          <p className="text-sm text-gray-600">Validando cuenta de Google...</p>
        ) : (
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() =>
              setServerError("No fue posible continuar con Google.")
            }
            text="signin_with"
            shape="rectangular"
            width="400"
          />
        )}
      </div>

      <p className="text-center text-sm text-gray-600">
        ¿Todavía no tienes una cuenta?{" "}
        <Link to="/register" className="font-semibold text-[#111111] underline">
          Regístrate
        </Link>
      </p>
    </form>
  );
}
