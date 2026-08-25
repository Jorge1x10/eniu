import { useState } from "react";
import { useForm } from "react-hook-form";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
export default function RegisterForm() {
  const navigate = useNavigate();
  const {
    registerAccount,
    loginWithGoogle,
   } = useAuth();

  const [serverError, setServerError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { 
    register, 
    handleSubmit, 
    watch,
    formState : {
        errors,
        isSubmitting, 
    },
  } = useForm({
        defaultValues: {
            username: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
        },
    });
    const password = watch("password")

    const getErrorMessage = (response) => {
    const error = response?.message ?? response?.error;

    if (typeof error === "string") {
      return error;
    }

    if (error && typeof error === "object") {
      return error.message ?? "No se pudo completar la solicitud.";
    }

    return "No se pudo completar la solicitud.";
    };  

    const onSubmit = async (formData) => {
        setServerError("");
        const response = await registerAccount({
            username : formData.username.trim(),
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone.trim(),
            password: formData.password
        });
        if (!response.success) {
            setServerError(getErrorMessage(response));
            return
        }

        localStorage.setItem(
            "access_token",
            response.data.access_token
        )
        navigate("/dashboard");
    };

    const handleGoogleSuccess = async (credentialResponse) => {
    setServerError("");

    if (!credentialResponse.credential) {
      setServerError(
        "Google no devolvió una credencial válida."
      );
      return;
    }

    setIsGoogleLoading(true);

    const response = await loginWithGoogle(
      credentialResponse.credential
    );

    setIsGoogleLoading(false);

    if (!response.success) {
      setServerError(response.message);
      return;
    }

    localStorage.setItem(
      "access_token",
      response.data.access_token
    );

    navigate("/dashboard");
  };

  const handleGoogleError = () => {
    setServerError(
      "No fue posible continuar con Google."
    );
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md space-y-3"
    >
      <div>
        <h1 className="text-3xl font-bold text-[#111111]">
          Crea tu cuenta
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Comienza a crear y administrar tus menús.
        </p>
      </div>

      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div>
        <label
          htmlFor="username"
          className="mb-1 block text-sm font-medium text-[#111111]"
        >
          Nombre de usuario
        </label>

        <input
          id="username"
          type="text"
          placeholder="jorgealvarado"
          autoComplete="username"
          className="w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 outline-none transition focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]"
          {...register("username", {
            required: "El nombre de usuario es obligatorio",
            minLength: {
              value: 4,
              message: "Debe tener al menos 4 caracteres",
            },
            maxLength: {
              value: 30,
              message: "No puede superar los 30 caracteres",
            },
            pattern: {
              value: /^[a-zA-Z0-9._]+$/,
              message:
                "Solo puede contener letras, números, puntos y guiones bajos",
            },
          })}
        />

        {errors.username && (
          <p className="mt-1 text-sm text-red-600">
            {errors.username.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-[#111111]"
        >
          Correo electrónico
        </label>

        <input
          id="email"
          type="email"
          placeholder="correo@ejemplo.com"
          autoComplete="email"
          className="w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 outline-none transition focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]"
          {...register("email", {
            required: "El correo es obligatorio",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Ingresa un correo válido",
            },
          })}
        />

        {errors.email && (
          <p className="mt-1 text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="phone"
          className="mb-1 block text-sm font-medium text-[#111111]"
        >
          Número telefonico
        </label>

        <input
          id="phone"
          type="tel"
          placeholder="3312345678"
          autoComplete="tel"
          inputMode="numeric"
          className="w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 outline-none transition focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]"
          {...register("phone", {
            required: "El teléfono es obligatorio",
            pattern: {
              value: /^[0-9]{10}$/,
              message:
                "Ingresa un número de 10 dígitos",
            },
          })}
        />

        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">
            {errors.phone.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-[#111111]"
        >
          Contraseña
        </label>

        <input
          id="password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          className="w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 outline-none transition focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]"
          {...register("password", {
            required: "La contraseña es obligatoria",
            minLength: {
              value: 8,
              message:
                "Debe tener al menos 8 caracteres",
            },
          })}
        />

        {errors.password && (
          <p className="mt-1 text-sm text-red-600">
            {errors.password.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1 block text-sm font-medium text-[#111111]"
        >
          Confirmar contraseña
        </label>

        <input
          id="confirmPassword"
          type="password"
          placeholder="Repite tu contraseña"
          autoComplete="new-password"
          className="w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 outline-none transition focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]"
          {...register("confirmPassword", {
            required: "Confirma tu contraseña",
            validate: (value) =>
              value === password ||
              "Las contraseñas no coinciden",
          })}
        />

        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#FFE05A] px-4 py-3 font-semibold text-[#111111] transition hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? "Creando cuenta..."
          : "Crear cuenta"}
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#D9D9D9]" />

        <span className="text-sm text-gray-500">
          o continúa con
        </span>

        <div className="h-px flex-1 bg-[#D9D9D9]" />
      </div>

      <div className="flex justify-center">
        {isGoogleLoading ? (
          <p className="text-sm text-gray-600">
            Validando cuenta de Google...
          </p>
        ) : (
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signup_with"
            shape="rectangular"
            width="400"
          />
        )}
      </div>

      <p className="text-center text-sm text-gray-600">
        ¿Ya tienes una cuenta?{" "}
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="font-semibold text-[#111111] underline"
        >
          Inicia sesión
        </button>
      </p>
    </form>
  );

}
