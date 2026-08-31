import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router";
import {
  Building2,
  CircleDollarSign,
  Globe2,
  MapPin,
  Pencil,
  Save,
  X,
} from "lucide-react";

import { prepareImage } from "../../../services/imageFile";
import { useApi } from "../../auth/services/useApi";
import { useBusiness } from "../services/useBusiness";
import { useTranslation } from "react-i18next";

const EMPTY_FORM = {
  name: "",
  description: "",
  address: "",
  website: "",
  currency: "MXN",
  is_active: true,
};

function resolvePhotoUrl(photoUrl) {
  if (!photoUrl || photoUrl.startsWith("http")) return photoUrl;

  try {
    return `${new URL(import.meta.env.VITE_API_URL).origin}${photoUrl}`;
  } catch {
    return photoUrl;
  }
}

export default function BusinessPage() {
  const { t } = useTranslation();

  const { businessId } = useParams();
  const {
    businesses,
    selectedBusiness,
    selectBusiness,
    updateBusiness,
    isLoadingBusinesses,
  } = useBusiness();
  const { patchForm } = useApi(`businesses/${businessId}`);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const business = businesses.find(
    (currentBusiness) => currentBusiness.id === businessId
  );

  useEffect(() => {
    if (business && selectedBusiness?.id !== business.id) {
      selectBusiness(business.id);
    }
  }, [business, selectedBusiness?.id, selectBusiness]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function startEditing() {
    setForm({
      name: business.name || "",
      description: business.description || "",
      address: business.address || "",
      website: business.website || "",
      currency: business.currency || "MXN",
      is_active: business.is_active ?? true,
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(false);
    setError("");
    setSuccessMessage("");
    setIsEditing(true);
  }

  function cancelEditing() {
    if (isSaving) return;
    setIsEditing(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(false);
    setError("");
  }

  function updateField(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    // Igual que en la app, la foto del negocio se sube siempre en la calidad
    // más alta: es una sola imagen y no se repite en cada escaneo del menú.
    try {
      const prepared = await prepareImage(file);
      setPhotoFile(prepared);
      setPhotoPreview(URL.createObjectURL(prepared));
      setRemovePhoto(false);
      setError("");
    } catch (photoError) {
      setError(photoError.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError(t("El nombre del negocio es obligatorio"));
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name.trim());
    formData.append("description", form.description.trim());
    formData.append("address", form.address.trim());
    formData.append("website", form.website.trim());
    formData.append("currency", form.currency.trim().toUpperCase());
    formData.append("is_active", String(form.is_active));
    formData.append("remove_photo", String(removePhoto));
    if (photoFile) formData.append("photo", photoFile);

    setIsSaving(true);
    setError("");
    const response = await patchForm(formData);
    setIsSaving(false);

    if (!response.ok) {
      setError(response.data?.message || t("No fue posible guardar los cambios"));
      return;
    }

    updateBusiness(response.data.business);
    setIsEditing(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(false);
    setSuccessMessage(t("Los datos del negocio se actualizaron correctamente"));
  }

  if (isLoadingBusinesses) {
    return (
      <div className="rounded-2xl bg-white p-6 text-[#666666] shadow-sm">
       {t("Cargando negocio...")}
      </div>
    );
  }

  if (!business) {
    return <Navigate to="/dashboard" replace />;
  }

  const savedPhotoUrl = resolvePhotoUrl(business.photo_url);
  const visiblePhoto = photoPreview || (!removePhoto && savedPhotoUrl);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-[#E9DDB7] bg-white shadow-sm">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                onClick={startEditing}
                className="group relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-[#FFE05A] text-[#111111]"
                aria-label={t("Editar foto del negocio")}
              >
                {savedPhotoUrl ? (
                  <img
                    src={savedPhotoUrl}
                    alt={`Foto de ${business.name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 size={26} />
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
                  <Pencil size={16} />
                </span>
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#777777]">{t("Negocio seleccionado")}</p>
                <h1 className="truncate text-3xl font-bold text-[#111111]">
                  {business.name}
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={startEditing}
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-4 py-2.5 font-semibold text-[#111111] transition hover:bg-[#E8C93D]"
            >
              <Pencil size={17} /> {t("Editar")}
            </button>
          </div>

          {successMessage && (
            <p className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </p>
          )}

          <button type="button" onClick={startEditing} className="mt-5 block w-full cursor-pointer text-left text-[#666666]">
            {business.description || t("Selecciona para agregar una descripción")}
          </button>

          <div className="mt-6 grid gap-3 border-t border-[#F0E8D2] pt-6 sm:grid-cols-2 lg:grid-cols-3">
            <InfoButton icon={MapPin} label={t("Dirección")} value={business.address} onClick={startEditing} />
            <InfoButton icon={Globe2} label={t("Sitio web")} value={business.website} onClick={startEditing} />
            <InfoButton icon={CircleDollarSign} label={t("Moneda")} value={business.currency} onClick={startEditing} />
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#FFFDF5] p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#111111]">{t("Editar negocio")}</h2>
                <p className="mt-1 text-sm text-[#666666]">{t("Completa únicamente la información que quieras mostrar.")}</p>
              </div>
              <button type="button" onClick={cancelEditing} disabled={isSaving} className="cursor-pointer rounded-lg p-2 hover:bg-black/5 disabled:cursor-not-allowed">
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("Nombre")} name="name" value={form.name} onChange={updateField} maxLength={64} required />
              <Field label={t("Moneda")} name="currency" value={form.currency} onChange={updateField} maxLength={3} placeholder="MXN" required />
              <Field label={t("Dirección")} name="address" value={form.address} onChange={updateField} className="sm:col-span-2" />
              <Field label={t("Sitio web")} name="website" type="url" value={form.website} onChange={updateField} placeholder="https://..." className="sm:col-span-2" />

              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-[#2A2A2A]">{t("Descripción")}</span>
                <textarea name="description" value={form.description} onChange={updateField} rows={4} className="w-full resize-y rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/40" />
              </label>

              <div className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-[#2A2A2A]">{t("Foto del lugar (opcional)")}</span>
                <div className="overflow-hidden rounded-xl border border-dashed border-[#CDBD87] bg-white">
                  {visiblePhoto && <img src={visiblePhoto} alt={t("Vista previa")} className="h-52 w-full object-cover" />}
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    <label className="cursor-pointer rounded-lg bg-[#2A2A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3A3A3A]">
                      {visiblePhoto ? t("Cambiar foto") : t("Seleccionar foto")}
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="sr-only" />
                    </label>
                    {visiblePhoto && (
                      <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); setRemovePhoto(true); }} className="cursor-pointer text-sm font-semibold text-red-600">
                       {t("Quitar foto")}
                      </button>
                    )}
                    <span className="text-xs text-[#777777]">{t("JPG, PNG o WebP. Máximo 5 MB.")}</span>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 sm:col-span-2">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={updateField} className="h-5 w-5 accent-[#E8C93D]" />
                <span className="text-sm font-semibold text-[#2A2A2A]">{t("Negocio activo")}</span>
              </label>
            </div>

            {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={cancelEditing} disabled={isSaving} className="cursor-pointer rounded-xl px-4 py-2.5 font-semibold text-[#2A2A2A] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50">
               {t("Cancelar")}
              </button>
              <button type="submit" disabled={isSaving} className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold text-[#111111] hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50">
                <Save size={17} /> {isSaving ? "Guardando..." : t("Guardar cambios")}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function InfoButton({ icon: Icon, label, value, onClick }) {
  const { t } = useTranslation();

  return (
    <button type="button" onClick={onClick} className="flex cursor-pointer items-start gap-3 rounded-xl p-3 text-left transition hover:bg-[#FFF8DE]">
      <Icon className="mt-0.5 shrink-0 text-[#8A7420]" size={18} />
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-[#888888]">{label}</span>
        <span className="mt-1 block break-word text-sm text-[#333333]">{value || t("Selecciona para configurar")}</span>
      </span>
    </button>
  );
}

function Field({ label, className = "", ...inputProps }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-semibold text-[#2A2A2A]">{label}</span>
      <input {...inputProps} className="w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-3 outline-none focus:border-[#E8C93D] focus:ring-2 focus:ring-[#FFE05A]/40" />
    </label>
  );
}
