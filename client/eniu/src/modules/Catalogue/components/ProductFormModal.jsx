import { useEffect, useRef, useState } from "react";
import { ImagePlus, PackagePlus, Star, Trash2, X } from "lucide-react";
import { Link } from "react-router";

import { prepareImages } from "../../../services/imageFile";
import { getProductErrorMessage } from "../services/productService";
import AccessibleModal from "./AccessibleModal";
import ImageQualitySelector from "./ImageQualitySelector";
import { useTranslation } from "react-i18next";

const PRICE_PATTERN = /^\d+(?:\.\d{1,2})?$/;

function resolveImageUrl(url) {
  if (!url || url.startsWith("http") || url.startsWith("blob:")) return url;
  try {
    return `${new URL(import.meta.env.VITE_API_URL).origin}${url}`;
  } catch {
    return url;
  }
}

export default function ProductFormModal({
  product,
  categories,
  categoriesPath,
  onClose,
  onSave,
  onSaved,
}) {
  const { t } = useTranslation();

  const isEditing = Boolean(product);
  const [form, setForm] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price ?? "",
    categoryId: product?.category_id || "",
    isAvailable: product?.is_available ?? true,
  });
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const originalPictures = product?.pictures || [];
  const [existingPictures, setExistingPictures] = useState(originalPictures);
  const [newPictures, setNewPictures] = useState([]);
  const [quality, setQuality] = useState("alta");
  const [isPreparing, setIsPreparing] = useState(false);
  const [defaultKey, setDefaultKey] = useState(
    originalPictures.find((picture) => picture.is_default)?.id
      || originalPictures[0]?.id
      || null
  );
  const nameRef = useRef(null);
  const submittingRef = useRef(false);
  const createdUrlsRef = useRef([]);

  useEffect(() => {
    const createdUrls = createdUrlsRef.current;
    return () => createdUrls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setRequestError("");
  }

  function validate() {
    const next = {};
    const name = form.name.trim();
    const price = form.price.trim();
    if (!name) next.name = t("Escribe el nombre del producto.");
    else if (name.length > 64) next.name = t("El nombre no puede superar 64 caracteres.");
    if (price && (!PRICE_PATTERN.test(price) || Number(price) > 99999999.99)) {
      next.price = t("Usa un precio válido, no negativo y con máximo dos decimales.");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function selectImages(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;
    if (existingPictures.length + newPictures.length + selected.length > 5) {
      setErrors((current) => ({ ...current, images: t("Puedes agregar máximo 5 imágenes.") }));
      return;
    }
    setIsPreparing(true);
    try {
      // La vista previa se hace sobre la imagen ya procesada, no sobre el
      // archivo original: lo que el dueño ve aquí es lo que se va a subir.
      const prepared = await prepareImages(selected, quality);
      const additions = prepared.map((file) => {
        const preview = URL.createObjectURL(file);
        createdUrlsRef.current.push(preview);
        return { key: crypto.randomUUID(), file, preview };
      });
      setNewPictures((current) => [...current, ...additions]);
      if (!defaultKey && additions.length) setDefaultKey(additions[0].key);
      setErrors((current) => ({ ...current, images: "" }));
    } catch (error) {
      setErrors((current) => ({ ...current, images: error.message }));
    } finally {
      setIsPreparing(false);
    }
  }

  function removeExisting(pictureId) {
    const remaining = existingPictures.filter((picture) => picture.id !== pictureId);
    setExistingPictures(remaining);
    if (defaultKey === pictureId) setDefaultKey(remaining[0]?.id || newPictures[0]?.key || null);
  }

  function removeNew(pictureKey) {
    const removed = newPictures.find((picture) => picture.key === pictureKey);
    if (removed) URL.revokeObjectURL(removed.preview);
    const remaining = newPictures.filter((picture) => picture.key !== pictureKey);
    setNewPictures(remaining);
    if (defaultKey === pictureKey) setDefaultKey(existingPictures[0]?.id || remaining[0]?.key || null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current || !validate()) return;

    const normalized = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: form.price.trim() || null,
      category_id: form.categoryId || null,
    };
    let payload = isEditing ? {} : normalized;
    if (isEditing) {
      if (normalized.name !== product.name) payload.name = normalized.name;
      if (normalized.description !== (product.description || "")) payload.description = normalized.description;
      if (normalized.price !== product.price) payload.price = normalized.price;
      if (normalized.category_id !== product.category_id) payload.category_id = normalized.category_id;
      if (form.isAvailable !== product.is_available) payload.is_available = form.isAvailable;
      if (Object.keys(payload).length === 0) {
        const originalIds = originalPictures.map((picture) => picture.id).join(",");
        const currentIds = existingPictures.map((picture) => picture.id).join(",");
        const originalDefault = originalPictures.find((picture) => picture.is_default)?.id || originalPictures[0]?.id || null;
        if (!newPictures.length && originalIds === currentIds && originalDefault === defaultKey) {
          onClose();
          return;
        }
      }
    }

    const imagesChanged = newPictures.length > 0
      || existingPictures.length !== originalPictures.length
      || (isEditing && defaultKey !== (originalPictures.find((picture) => picture.is_default)?.id || originalPictures[0]?.id || null));
    if (newPictures.length || imagesChanged) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => formData.append(key, value ?? ""));
      newPictures.forEach((picture) => formData.append("images", picture.file));
      const newDefaultIndex = newPictures.findIndex((picture) => picture.key === defaultKey);
      if (isEditing) {
        formData.append("keep_image_ids", JSON.stringify(existingPictures.map((picture) => picture.id)));
        if (defaultKey) formData.append("default_image_key", newDefaultIndex >= 0 ? `new:${newDefaultIndex}` : defaultKey);
      } else if (newDefaultIndex >= 0) {
        formData.append("default_image_index", String(newDefaultIndex));
      }
      payload = formData;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    const response = await onSave(payload);
    submittingRef.current = false;
    setIsSubmitting(false);
    if (!response.ok) {
      setRequestError(getProductErrorMessage(response, t("No pudimos guardar el producto.")));
      return;
    }
    onSaved(response.data.product);
  }

  return (
    <AccessibleModal labelledBy="product-form-title" isBusy={isSubmitting} onClose={onClose} initialFocusRef={nameRef}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFE05A]"><PackagePlus size={21} /></span>
          <div>
            <h2 id="product-form-title" className="text-xl font-bold text-[#111111]">{isEditing ? t("Editar producto") : t("Crear producto")}</h2>
            <p className="mt-1 text-sm text-[#666666]">{t("La categoría y el precio son opcionales.")}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} disabled={isSubmitting} aria-label={t("Cerrar modal")} className="cursor-pointer rounded-lg p-2 text-[#666666] hover:bg-black/5 disabled:cursor-not-allowed"><X size={20} /></button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        <Field label={t("Nombre")} id="product-name" error={errors.name}>
          <input ref={nameRef} id="product-name" value={form.name} maxLength={64} disabled={isSubmitting} onChange={(event) => change("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "product-name-error" : undefined} className="form-control" placeholder={t("Ej. Hamburguesa clásica")} />
        </Field>
        <Field label={t("Descripción (opcional)")} id="product-description">
          <textarea id="product-description" value={form.description} rows={3} disabled={isSubmitting} onChange={(event) => change("description", event.target.value)} className="form-control resize-y" placeholder={t("Carne, queso y vegetales")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("Precio (opcional)")} id="product-price" error={errors.price}>
            <input id="product-price" value={form.price} inputMode="decimal" disabled={isSubmitting} onChange={(event) => change("price", event.target.value)} aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? "product-price-error" : undefined} className="form-control" placeholder="129.00" />
          </Field>
          <Field label={t("Categoría")} id="product-category">
            <select id="product-category" value={form.categoryId} disabled={isSubmitting} onChange={(event) => change("categoryId", event.target.value)} className="form-control cursor-pointer">
              <option value="">{t("Sin categoría")}</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[#2A2A2A]">{t("Imágenes")} <span className="font-normal text-[#777777]">{t("(hasta 5)")}</span></span>
            <span className="text-xs text-[#777777]">{existingPictures.length + newPictures.length}/5</span>
          </div>
          {(existingPictures.length > 0 || newPictures.length > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {existingPictures.map((picture) => (
                <PicturePreview key={picture.id} src={resolveImageUrl(picture.url)} name={form.name} isDefault={defaultKey === picture.id} onDefault={() => setDefaultKey(picture.id)} onRemove={() => removeExisting(picture.id)} />
              ))}
              {newPictures.map((picture) => (
                <PicturePreview key={picture.key} src={picture.preview} name={form.name} isDefault={defaultKey === picture.key} onDefault={() => setDefaultKey(picture.key)} onRemove={() => removeNew(picture.key)} />
              ))}
            </div>
          )}
          {existingPictures.length + newPictures.length < 5 && (
            <>
              <ImageQualitySelector value={quality} onChange={setQuality} disabled={isSubmitting || isPreparing} />
              <label className={`mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#CDBD87] bg-white px-4 py-4 text-sm font-semibold text-[#5E501A] ${isPreparing ? "cursor-wait opacity-70" : "cursor-pointer hover:bg-[#FFF8DE]"}`}>
                <ImagePlus size={18} /> {isPreparing ? "Optimizando..." : t("Agregar imágenes")}
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={selectImages} disabled={isSubmitting || isPreparing} className="sr-only" />
              </label>
            </>
          )}
          <p className="mt-2 text-xs text-[#777777]">{t("JPG, PNG o WebP. Las fotos se optimizan al subirlas. Selecciona la estrella para elegir la principal.")}</p>
          {errors.images && <p role="alert" className="mt-2 text-sm text-red-700">{errors.images}</p>}
        </div>
        {categories.length === 0 && (
          <p className="rounded-xl bg-[#F8E8AE]/60 px-4 py-3 text-sm text-[#5E501A]">
           {t("Este menú todavía no tiene categorías. Puedes crear el producto sin categoría y organizarlo después.")}{" "}
            <Link to={categoriesPath} className="font-bold underline">{t("Ir a Categorías")}</Link>
          </p>
        )}
        {isEditing && (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#D9D9D9] bg-white px-4 py-3">
            <input type="checkbox" checked={form.isAvailable} disabled={isSubmitting} onChange={(event) => change("isAvailable", event.target.checked)} className="h-4 w-4 accent-[#E8C93D]" />
            <span className="text-sm font-semibold text-[#2A2A2A]">{t("Producto disponible")}</span>
          </label>
        )}
        {requestError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="cursor-pointer rounded-xl px-4 py-2.5 font-semibold hover:bg-black/5 disabled:cursor-not-allowed">{t("Cancelar")}</button>
          <button type="submit" disabled={isSubmitting || !form.name.trim()} className="cursor-pointer rounded-xl bg-[#FFE05A] px-5 py-2.5 font-semibold hover:bg-[#E8C93D] disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Guardando..." : isEditing ? t("Guardar cambios") : t("Crear producto")}</button>
        </div>
      </form>
    </AccessibleModal>
  );
}

function PicturePreview({ src, name, isDefault, onDefault, onRemove }) {
  const { t } = useTranslation();

  return (
    <div className={`relative overflow-hidden rounded-xl border-2 bg-[#F8E8AE] ${isDefault ? "border-[#E8C93D]" : "border-transparent"}`}>
      <img src={src} alt={t("Vista previa de {{name}}", { name: name || "producto" })} className="aspect-square w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/65 p-1.5">
        <button type="button" onClick={onDefault} aria-label={isDefault ? t("Imagen principal") : t("Usar como imagen principal")} className={`cursor-pointer rounded-lg p-1.5 ${isDefault ? "bg-[#FFE05A] text-[#111111]" : "text-white hover:bg-white/20"}`}><Star size={15} fill={isDefault ? "currentColor" : "none"} /></button>
        <button type="button" onClick={onRemove} aria-label={t("Quitar imagen")} className="cursor-pointer rounded-lg p-1.5 text-white hover:bg-red-600"><Trash2 size={15} /></button>
      </div>
      {isDefault && <span className="absolute left-2 top-2 rounded-full bg-[#FFE05A] px-2 py-1 text-[10px] font-bold text-[#111111]">{t("Principal")}</span>}
    </div>
  );
}

function Field({ label, id, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-[#2A2A2A]">{label}</label>
      <div className="mt-2">{children}</div>
      {error && <p id={`${id}-error`} className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
