import { useEffect, useId, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import AccessibleModal from "../../Catalogue/components/AccessibleModal";
import { useCatalogueService } from "../../Catalogue/services/catalogueService";
import { orderingErrorMessage, useOrderingService } from "../services/orderingService";
import DeliverySettings from "./DeliverySettings";
import TableQr from "./TableQr";

/** El enlace que el negocio comparte para pedir para llevar desde un menú. */
function takeawayUrl(publicSlug) {
  return `${window.location.origin}/m/${publicSlug}/para-llevar`;
}

/**
 * Pedidos para llevar: activarlos y compartir el enlace (o su QR) de cada
 * menú publicado. Se pagan al recoger, en efectivo o con terminal, con el
 * mismo "Cobrar" de las mesas.
 */
export default function TakeawayDialog({ businessId, ordering, onChange, onClose }) {
  const { t } = useTranslation();
  const id = useId();
  const { setTakeaway } = useOrderingService(businessId);
  const { list } = useCatalogueService(businessId);
  const [menus, setMenus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);
  const enabled = Boolean(ordering?.takeaway);

  useEffect(() => {
    const controller = new AbortController();
    list({ signal: controller.signal }).then((response) => {
      if (response.aborted) return;
      setMenus(response.ok ? (response.data?.catalogues || []).filter((menu) => menu.is_published && menu.public_slug) : []);
    });
    return () => controller.abort();
  }, [list]);

  async function toggle() {
    setBusy(true);
    setError("");
    const response = await setTakeaway(!enabled);
    setBusy(false);
    if (!response.ok) {
      setError(orderingErrorMessage(response, t("No pudimos cambiar los pedidos para llevar.")));
      return;
    }
    onChange();
  }

  async function copy(url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied((current) => (current === url ? null : current)), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <AccessibleModal labelledBy={`${id}-title`} describedBy={`${id}-description`} onClose={onClose} isBusy={busy} maxWidth="max-w-lg">
      <div className="text-eniu-text">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={`${id}-title`} className="text-xl font-black">{t("Para llevar y a domicilio")}</h2>
            <p id={`${id}-description`} className="mt-1 text-sm text-eniu-muted">
              {t("Tus clientes piden desde el enlace del menú, sin QR de mesa, y pagan al recoger o al recibir, en efectivo o con terminal.")}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t("Cerrar")} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl hover:bg-eniu-surface-alt">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={busy || ordering?.reason === "plan"}
          onClick={toggle}
          className="mt-5 flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-eniu-warm px-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>
            <span className="block font-bold">{t("Recibir pedidos para llevar")}</span>
            <span className="block text-xs text-eniu-muted">
              {ordering?.enabled ? t("Llegan a Pedidos junto con los de las mesas.") : t("Los pedidos están en pausa: tampoco llegarán los para llevar.")}
            </span>
          </span>
          <span aria-hidden="true" className={`relative h-7 w-[46px] shrink-0 rounded-full ${enabled ? "bg-eniu-success" : "bg-eniu-muted/40"}`}>
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] ${enabled ? "left-[20px]" : "left-0.5"}`} />
          </span>
        </button>
        {error && <p role="alert" className="mt-3 rounded-xl bg-eniu-danger-soft px-4 py-3 text-sm font-semibold text-eniu-danger">{error}</p>}

        <h3 className="mt-6 text-xs font-extrabold uppercase tracking-[1.2px] text-eniu-gold">{t("A domicilio")}</h3>
        <DeliverySettings businessId={businessId} onChange={onChange} />

        <h3 className="mt-6 text-xs font-extrabold uppercase tracking-[1.2px] text-eniu-gold">{t("Enlace para compartir")}</h3>
        {menus === null ? (
          <div aria-hidden="true" className="mt-2 h-24 animate-pulse rounded-2xl bg-eniu-surface-alt" />
        ) : menus.length === 0 ? (
          <p className="mt-2 text-sm text-eniu-muted">
            {t("Publica un menú para tener su enlace de pedidos para llevar.")}{" "}
            <Link to={`/dashboard/businesses/${businessId}/catalogues`} className="font-bold underline">{t("Ir a mis menús")}</Link>
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {menus.map((menu) => {
              const url = takeawayUrl(menu.public_slug);
              return (
                <li key={menu.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-eniu-warm p-3">
                  <TableQr url={url} size={96} label={t("QR para pedir para llevar del menú {{name}}", { name: menu.name })} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{menu.name}</p>
                    <p className="break-all text-xs text-eniu-muted">{url}</p>
                    <button type="button" onClick={() => copy(url)} className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-eniu-warm px-3 text-sm font-bold hover:bg-eniu-surface-alt">
                      {copied === url ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                      {copied === url ? t("Copiado") : t("Copiar enlace")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-xs text-eniu-muted">{t("Tu menú público también muestra un botón para pedir mientras alguno de los dos esté activo.")}</p>
      </div>
    </AccessibleModal>
  );
}
