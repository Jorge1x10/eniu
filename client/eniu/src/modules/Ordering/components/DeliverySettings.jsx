import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { orderingErrorMessage, useOrderingService } from "../services/orderingService";

const AMOUNT = /^\d{1,6}([.,]\d{1,2})?$/;
const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-eniu-warm bg-eniu-surface px-3 text-base text-eniu-text outline-none focus-visible:ring-2 focus-visible:ring-eniu-text aria-[invalid=true]:border-eniu-danger";

function toAmount(text) {
  return text.trim().replace(",", ".");
}

/**
 * A domicilio, con los repartidores del restaurante: el mismo costo de envío
 * para todas las colonias que atiende, pedido mínimo opcional y la lista de
 * colonias (una por renglón). El cliente elige su colonia de esa lista.
 */
export default function DeliverySettings({ businessId, onChange }) {
  const { t } = useTranslation();
  const id = useId();
  const { getDelivery, setDelivery } = useOrderingService(businessId);
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getDelivery({ signal: controller.signal }).then((response) => {
      if (response.aborted) return;
      const data = response.ok ? response.data?.delivery : null;
      setForm({
        enabled: Boolean(data?.enabled),
        fee: data?.fee && data.fee !== "0.00" ? data.fee : "",
        minOrder: data?.min_order || "",
        zones: (data?.zones || []).join("\n"),
      });
    });
    return () => controller.abort();
  }, [getDelivery]);

  if (!form) return <div aria-hidden="true" className="mt-2 h-40 animate-pulse rounded-2xl bg-eniu-surface-alt" />;

  const zones = form.zones.split("\n").map((zone) => zone.trim()).filter(Boolean);
  const feeInvalid = form.fee.trim() !== "" && !AMOUNT.test(form.fee.trim());
  const minInvalid = form.minOrder.trim() !== "" && !AMOUNT.test(form.minOrder.trim());

  function update(change) {
    setForm((current) => ({ ...current, ...change }));
    setSaved(false);
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    if (feeInvalid || minInvalid) {
      setError(t("Revisa los importes: por ejemplo 35 o 35.50."));
      return;
    }
    if (form.enabled && !zones.length) {
      setError(t("Agrega al menos una colonia para entregar a domicilio."));
      return;
    }
    setBusy(true);
    const response = await setDelivery({
      enabled: form.enabled,
      fee: form.fee.trim() ? toAmount(form.fee) : "0",
      min_order: form.minOrder.trim() ? toAmount(form.minOrder) : null,
      zones,
    });
    setBusy(false);
    if (!response.ok) {
      setError(orderingErrorMessage(response, t("No pudimos guardar la entrega a domicilio.")));
      return;
    }
    setSaved(true);
    onChange?.();
  }

  return (
    <form onSubmit={save} className="mt-2 space-y-3" noValidate>
      <button
        type="button"
        role="switch"
        aria-checked={form.enabled}
        onClick={() => update({ enabled: !form.enabled })}
        className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-eniu-warm px-4 text-left"
      >
        <span>
          <span className="block font-bold">{t("Entregar a domicilio")}</span>
          <span className="block text-xs text-eniu-muted">{t("Con tus repartidores. El cliente paga al recibir, en efectivo o con terminal.")}</span>
        </span>
        <span aria-hidden="true" className={`relative h-7 w-[46px] shrink-0 rounded-full ${form.enabled ? "bg-eniu-success" : "bg-eniu-muted/40"}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] ${form.enabled ? "left-[20px]" : "left-0.5"}`} />
        </span>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-fee`} className="text-sm font-bold">{t("Costo de envío")}</label>
          <input id={`${id}-fee`} inputMode="decimal" autoComplete="off" placeholder="0.00" value={form.fee} aria-invalid={feeInvalid} onChange={(event) => update({ fee: event.target.value })} className={`${fieldClass} text-right tabular-nums`} />
        </div>
        <div>
          <label htmlFor={`${id}-min`} className="text-sm font-bold">{t("Pedido mínimo")} <span className="font-normal text-eniu-muted">({t("opcional")})</span></label>
          <input id={`${id}-min`} inputMode="decimal" autoComplete="off" placeholder={t("Sin mínimo")} value={form.minOrder} aria-invalid={minInvalid} onChange={(event) => update({ minOrder: event.target.value })} className={`${fieldClass} text-right tabular-nums`} />
        </div>
      </div>
      <p className="-mt-1 text-xs text-eniu-muted">{t("El mismo costo para todas las colonias. El mínimo no cuenta el envío.")}</p>

      <div>
        <label htmlFor={`${id}-zones`} className="text-sm font-bold">{t("Colonias a las que entregas")}</label>
        <textarea
          id={`${id}-zones`}
          rows={4}
          value={form.zones}
          onChange={(event) => update({ zones: event.target.value })}
          placeholder={t("Una por renglón, por ejemplo:\nRoma Norte\nCondesa")}
          aria-describedby={`${id}-zones-hint`}
          className="mt-1 w-full rounded-xl border border-eniu-warm bg-eniu-surface px-3 py-2 text-base text-eniu-text outline-none focus-visible:ring-2 focus-visible:ring-eniu-text"
        />
        <p id={`${id}-zones-hint`} className="text-xs text-eniu-muted">
          {zones.length === 1 ? t("1 colonia. El cliente elige la suya de esta lista.") : t("{{count}} colonias. El cliente elige la suya de esta lista.", { count: zones.length })}
        </p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-eniu-danger-soft px-4 py-3 text-sm font-semibold text-eniu-danger">{error}</p>}
      {saved && <p role="status" className="text-sm font-bold text-eniu-success">{t("Guardado.")}</p>}
      <button type="submit" disabled={busy} className="min-h-12 w-full cursor-pointer rounded-xl bg-eniu-hero font-extrabold text-eniu-cream hover:bg-eniu-hero-hover disabled:opacity-60">
        {busy ? t("Guardando...") : t("Guardar entrega a domicilio")}
      </button>
    </form>
  );
}
