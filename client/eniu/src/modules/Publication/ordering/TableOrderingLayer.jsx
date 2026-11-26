import { useEffect, useId, useRef, useState } from "react";
import { Bike, Check, ChevronRight, Minus, Plus, ReceiptText, ShoppingBag, Store, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatDate } from "../../../i18n/formats";
import { useMenuCurrency } from "../../Templates/templates/menuData";
import { MAX_NAME, MAX_NOTES, MAX_PHONE, MAX_QUANTITY, isValidPhone } from "./useTableOrdering";

const STEPS = ["pending", "received", "preparing", "ready"];
const DELIVERY_STEPS = ["pending", "received", "preparing", "ready", "on_the_way"];
const STEP_LABELS = { pending: "Enviado", received: "Recibido", preparing: "Preparando", ready: "Listo", on_the_way: "En camino" };
const AMOUNT = /^\d{1,6}([.,]\d{1,2})?$/;
const WELCOME_KEY = (placeKey) => `eniu.diner.welcomed.${placeKey}`;

function wasWelcomed(placeKey) {
  try { return sessionStorage.getItem(WELCOME_KEY(placeKey)) === "1"; } catch { return false; }
}

function markWelcomed(placeKey) {
  try { sessionStorage.setItem(WELCOME_KEY(placeKey), "1"); } catch { /* sólo no se recuerda */ }
}

function tableTitle(t, table) {
  if (table.takeaway) return t("Para llevar");
  return table.name
    ? t("Mesa {{number}} · {{name}}", { number: table.number, name: table.name })
    : t("Mesa {{number}}", { number: table.number });
}

/**
 * Hoja que sube desde abajo, con los colores de la plantilla. Cierra con
 * Escape o tocando fuera, lleva el foco adentro al abrir y lo devuelve al
 * cerrar.
 */
function Sheet({ title, onClose, palette, children, footer }) {
  const { t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  // Sólo al abrir y al cerrar: si dependiera de `onClose` (una función nueva
  // en cada render), cada tecla devolvería el foco al panel y el campo de
  // texto perdería lo que se escribe después de la primera letra.
  useEffect(() => {
    const previous = document.activeElement;
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
    function onKey(event) {
      if (event.key === "Escape") closeRef.current();
    }
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div aria-hidden="true" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl shadow-2xl outline-none"
        style={{ backgroundColor: palette.background, color: palette.text, fontFamily: palette.font }}
      >
        <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 id={titleId} className="text-xl font-black">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t("Cerrar")} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full hover:bg-black/5">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3" style={{ borderColor: palette.rule }}>{footer}</div>}
      </section>
    </div>
  );
}

function PrimaryButton({ palette, children, className = "", ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`flex min-h-[54px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 text-base font-extrabold disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{ backgroundColor: palette.button, color: palette.buttonText }}
    >
      {children}
    </button>
  );
}

function NameField({ value, onChange, table, autoFocus = false }) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold">{table.takeaway ? t("Tu nombre") : t("Tu nombre o el de tu mesa")}</label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, MAX_NAME))}
        maxLength={MAX_NAME}
        autoComplete="given-name"
        autoFocus={autoFocus}
        className="mt-1.5 min-h-12 w-full rounded-xl border border-current/25 bg-transparent px-4 text-base outline-none focus:border-current"
      />
      <p className="mt-1.5 text-xs opacity-70">
        {table.takeaway
          ? t("Con este nombre te entregamos tu pedido.")
          : t("El mesero verá tu pedido como «{{label}}».", { label: `${value.trim() || t("Ana")} | ${t("Mesa {{number}}", { number: table.number })}` })}
      </p>
    </div>
  );
}

/** Sólo para llevar: a dónde avisar si hay algún cambio con el pedido. */
function PhoneField({ value, onChange }) {
  const { t } = useTranslation();
  const id = useId();
  const invalid = value.trim() !== "" && !isValidPhone(value);
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold">{t("Tu teléfono")}</label>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, MAX_PHONE))}
        maxLength={MAX_PHONE}
        autoComplete="tel"
        aria-invalid={invalid}
        aria-describedby={`${id}-hint`}
        className="mt-1.5 min-h-12 w-full rounded-xl border border-current/25 bg-transparent px-4 text-base outline-none focus:border-current aria-[invalid=true]:border-red-500"
      />
      <p id={`${id}-hint`} className={`mt-1.5 text-xs ${invalid ? "font-bold" : "opacity-70"}`}>
        {invalid ? t("Escribe un teléfono de 8 a 15 dígitos.") : t("Solo para avisarte si hay algún cambio con tu pedido.")}
      </p>
    </div>
  );
}

/** Para recoger o a domicilio, cuando el restaurante ofrece las dos. */
function ChannelPicker({ ordering }) {
  const { t } = useTranslation();
  const { table } = ordering;
  if (!table.orderingEnabled || !table.delivery?.enabled) return null;
  const options = [
    { key: "takeaway", label: t("Paso a recoger"), icon: Store },
    { key: "delivery", label: t("A domicilio"), icon: Bike },
  ];
  return (
    <div role="radiogroup" aria-label={t("Cómo quieres tu pedido")} className="grid grid-cols-2 gap-2">
      {options.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={ordering.channel === key}
          onClick={() => ordering.setChannel(key)}
          className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 font-bold ${ordering.channel === key ? "border-current" : "border-current/20 opacity-75"}`}
        >
          <Icon size={18} aria-hidden="true" /> {label}
        </button>
      ))}
    </div>
  );
}

const inputClass = "mt-1.5 min-h-12 w-full rounded-xl border border-current/25 bg-transparent px-4 text-base outline-none focus:border-current";

/** A domicilio: colonia (de las que atiende el restaurante), dirección y referencias. */
function DeliveryFields({ ordering }) {
  const { t } = useTranslation();
  const id = useId();
  const { delivery, saveDelivery, table } = ordering;
  const zones = table.delivery?.zones || [];
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${id}-zone`} className="text-sm font-bold">{t("Colonia")}</label>
        <select id={`${id}-zone`} value={zones.includes(delivery.zone) ? delivery.zone : ""} onChange={(event) => saveDelivery({ zone: event.target.value })} className={`${inputClass} cursor-pointer`}>
          <option value="">{t("Elige tu colonia")}</option>
          {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
        </select>
        <p className="mt-1.5 text-xs opacity-70">{t("Solo entregamos en estas colonias.")}</p>
      </div>
      <div>
        <label htmlFor={`${id}-address`} className="text-sm font-bold">{t("Calle y número")}</label>
        <input id={`${id}-address`} value={delivery.address} maxLength={200} autoComplete="street-address" onChange={(event) => saveDelivery({ address: event.target.value })} className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${id}-references`} className="text-sm font-bold">{t("Referencias")} <span className="font-normal opacity-70">({t("opcional")})</span></label>
        <input id={`${id}-references`} value={delivery.references} maxLength={200} placeholder={t("Ej. portón negro, depto 3")} onChange={(event) => saveDelivery({ references: event.target.value })} className={inputClass} />
      </div>
    </div>
  );
}

/** Cómo va a pagar al recibir: efectivo (con cuánto, para llevar cambio) o tarjeta. */
function PaymentFields({ ordering, total }) {
  const { t } = useTranslation();
  const currency = useMenuCurrency();
  const id = useId();
  const { delivery, saveDelivery } = ordering;
  const tendered = delivery.cashTendered.trim();
  const tenderedValue = AMOUNT.test(tendered) ? Number(tendered.replace(",", ".")) : null;
  const short = tenderedValue !== null && tenderedValue < total;
  return (
    <fieldset>
      <legend className="text-sm font-bold">{t("Pagas al recibir")}</legend>
      <div role="radiogroup" aria-label={t("Cómo vas a pagar")} className="mt-1.5 grid grid-cols-2 gap-2">
        {[{ key: "cash", label: t("Efectivo") }, { key: "card", label: t("Tarjeta") }].map((option) => (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={delivery.payWith === option.key}
            onClick={() => saveDelivery({ payWith: option.key })}
            className={`min-h-12 cursor-pointer rounded-xl border-2 px-3 font-bold ${delivery.payWith === option.key ? "border-current" : "border-current/20 opacity-75"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {delivery.payWith === "cash" ? (
        <div className="mt-3">
          <label htmlFor={`${id}-tendered`} className="text-sm font-bold">{t("¿Con cuánto pagas?")} <span className="font-normal opacity-70">({t("opcional")})</span></label>
          <input id={`${id}-tendered`} inputMode="decimal" value={delivery.cashTendered} maxLength={12} placeholder={t("Para llevarte cambio")} aria-invalid={short} aria-describedby={`${id}-change`} onChange={(event) => saveDelivery({ cashTendered: event.target.value })} className={inputClass} />
          <p id={`${id}-change`} aria-live="polite" className={`mt-1.5 text-xs ${short ? "font-bold" : "opacity-70"}`}>
            {short ? t("No alcanza para el total.") : tenderedValue !== null ? t("Te llevamos {{change}} de cambio.", { change: currency.format(tenderedValue - total) }) : ""}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs opacity-70">{t("El repartidor lleva terminal.")}</p>
      )}
    </fieldset>
  );
}

/** Al abrir el QR: en qué mesa está y a nombre de quién pide. */
function WelcomeSheet({ ordering, palette, onDone }) {
  const { t } = useTranslation();
  const [name, setName] = useState(ordering.dinerName);
  const [phone, setPhone] = useState(ordering.dinerPhone);
  const takeaway = ordering.table.takeaway;
  const ready = Boolean(name.trim()) && (!takeaway || isValidPhone(phone));
  function start() {
    ordering.saveName(name);
    if (takeaway) ordering.savePhone(phone);
    markWelcomed(ordering.placeKey);
    onDone();
  }
  function skip() {
    markWelcomed(ordering.placeKey);
    onDone();
  }
  return (
    <Sheet
      title={takeaway
        ? (ordering.table.orderingEnabled && ordering.table.delivery?.enabled ? t("¿Cómo quieres tu pedido?") : ordering.isDelivery ? t("Pide a domicilio") : t("Pide para llevar"))
        : t("Estás en la {{table}}", { table: tableTitle(t, ordering.table) })}
      onClose={skip}
      palette={palette}
      footer={(
        <div className="space-y-2">
          <PrimaryButton palette={palette} onClick={start} disabled={!ready}>{t("Empezar a pedir")}</PrimaryButton>
          <button type="button" onClick={skip} className="min-h-11 w-full cursor-pointer rounded-xl text-sm font-bold underline-offset-2 hover:underline">{t("Solo ver el menú")}</button>
        </div>
      )}
    >
      <p className="mb-4 text-sm opacity-80">
        {ordering.isDelivery
          ? t("Elige lo que quieras y mándalo. Aquí ves cuándo va en camino; pagas al recibirlo, en efectivo o con tarjeta.")
          : takeaway
          ? t("Elige lo que quieras y mándalo. Aquí ves cuándo está listo para recoger; pagas al recogerlo, en efectivo o con tarjeta.")
          : t("Elige lo que quieras, revisa tu pedido y mándalo. Te avisamos aquí cuando el restaurante lo reciba.")}
      </p>
      <div className="space-y-4">
        {takeaway && <ChannelPicker ordering={ordering} />}
        <NameField value={name} onChange={setName} table={ordering.table} autoFocus />
        {takeaway && <PhoneField value={phone} onChange={setPhone} />}
      </div>
    </Sheet>
  );
}

function StatusSteps({ status, takeaway = false, delivery = false }) {
  const { t } = useTranslation();
  const steps = delivery ? DELIVERY_STEPS : STEPS;
  const current = steps.indexOf(status);
  return (
    <ol aria-label={t("Estado del pedido")} className={`mt-3 grid gap-1.5 ${delivery ? "grid-cols-5" : "grid-cols-4"}`}>
      {steps.map((step, index) => {
        const done = index <= current;
        return (
          <li key={step} aria-current={index === current ? "step" : undefined} className="min-w-0">
            <span aria-hidden="true" className={`block h-1.5 rounded-full ${done ? "bg-current" : "bg-current/20"}`} />
            <span className={`mt-1 block truncate text-[11px] font-bold ${done ? "" : "opacity-55"}`}>{takeaway && !delivery && step === "ready" ? t("Para recoger") : t(STEP_LABELS[step])}</span>
          </li>
        );
      })}
    </ol>
  );
}

function SentOrder({ order, takeaway = false }) {
  const { t } = useTranslation();
  const currency = useMenuCurrency();
  const time = order.created_at ? formatDate(new Date(order.created_at), { hour: "2-digit", minute: "2-digit" }) : "";
  const cancelled = order.status === "cancelled";
  // Para llevar, la cuenta es del pedido: cerrada quiere decir entregada.
  const delivered = takeaway && !cancelled && order.account?.status === "closed";
  const isDelivery = order.channel === "delivery";
  return (
    <li className="rounded-2xl border border-current/15 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-extrabold">{t("Pedido de las {{time}}", { time })}</p>
        <p className="text-sm font-black tabular-nums">{currency.format(Number(order.total))}</p>
      </div>
      {cancelled
        ? <p className="mt-2 text-sm font-bold">{t("El restaurante canceló este pedido.")}</p>
        : delivered
          ? <p className="mt-2 flex items-center gap-1.5 text-sm font-bold"><Check size={16} aria-hidden="true" /> {t("Entregado")}</p>
          : <StatusSteps status={order.status} takeaway={takeaway} delivery={isDelivery} />}
      {order.status === "pending" && (
        <p className="mt-2 text-xs opacity-75">
          {takeaway
            ? t("Esperando a que el restaurante lo reciba. Para cambiar algo, llama al restaurante.")
            : t("Esperando a que el restaurante lo reciba. Para cambiar algo, díselo al mesero.")}
        </p>
      )}
      {isDelivery && !delivered && order.status === "on_the_way" && (
        <p className="mt-2 text-sm font-bold">{t("¡Va en camino! Pagas {{total}} al recibirlo.", { total: currency.format(Number(order.account?.total ?? order.total)) })}</p>
      )}
      {isDelivery && !delivered && order.account?.delivery && (
        <p className="mt-2 text-xs opacity-75">{order.account.delivery.address} · {order.account.delivery.zone}</p>
      )}
      {takeaway && !isDelivery && order.status === "ready" && !delivered && (
        <p className="mt-2 text-sm font-bold">{t("¡Listo! Pasa a recogerlo. Pagas {{total}} al recoger, en efectivo o con tarjeta.", { total: currency.format(Number(order.account?.total ?? order.total)) })}</p>
      )}
      <ul className="mt-3 space-y-1 text-sm">
        {order.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className={item.is_cancelled ? "line-through opacity-55" : ""}>
            <span className="font-bold">{item.quantity}×</span> {item.name}
            {item.notes && !item.is_cancelled && <span className="block pl-6 text-xs opacity-75">↳ {item.notes}</span>}
            {item.is_cancelled && <span className="sr-only"> ({t("cancelado por el restaurante")})</span>}
          </li>
        ))}
      </ul>
    </li>
  );
}

function CartLine({ line, ordering }) {
  const { t } = useTranslation();
  const currency = useMenuCurrency();
  const [editingNotes, setEditingNotes] = useState(Boolean(line.notes));
  const notesId = useId();
  return (
    <li className="border-b border-current/15 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold">{line.name}</p>
          <p className="text-sm tabular-nums opacity-75">{currency.format(Number(line.price) * line.quantity)}</p>
        </div>
        <div role="group" aria-label={t("Cantidad de {{name}}", { name: line.name })} className="flex shrink-0 items-center gap-1 rounded-full border border-current/25 p-0.5">
          {line.quantity === 1 ? (
            <button type="button" onClick={() => ordering.remove(line.key)} aria-label={t("Quitar {{name}} del pedido", { name: line.name })} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full">
              <Trash2 size={16} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" onClick={() => ordering.decrement(line.key)} aria-label={t("Quitar uno de {{name}}", { name: line.name })} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full">
              <Minus size={16} aria-hidden="true" />
            </button>
          )}
          <span className="min-w-6 text-center font-black tabular-nums">{line.quantity}</span>
          <button type="button" onClick={() => ordering.addByKey(line.key)} disabled={line.quantity >= MAX_QUANTITY} aria-label={t("Agregar otro {{name}}", { name: line.name })} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full disabled:opacity-40">
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      {editingNotes ? (
        <div className="mt-2">
          <label htmlFor={notesId} className="text-xs font-bold">{t("Nota para la cocina")}</label>
          <textarea
            id={notesId}
            value={line.notes || ""}
            onChange={(event) => ordering.setNotes(line.key, event.target.value)}
            maxLength={MAX_NOTES}
            rows={2}
            placeholder={t("Ej. sin cebolla")}
            className="mt-1 w-full resize-none rounded-xl border border-current/25 bg-transparent px-3 py-2 text-sm outline-none focus:border-current"
          />
        </div>
      ) : (
        <button type="button" onClick={() => setEditingNotes(true)} className="mt-1 min-h-11 cursor-pointer text-sm font-bold underline underline-offset-2">
          {t("Agregar nota")}
        </button>
      )}
    </li>
  );
}

/** El carrito: lo que está por mandar y, abajo, lo que ya mandó con su estado. */
function CartSheet({ ordering, palette, onClose, onOpenAccount }) {
  const { t } = useTranslation();
  const currency = useMenuCurrency();
  const takeaway = ordering.table.takeaway;
  const [editingName, setEditingName] = useState(!ordering.dinerName || (takeaway && !isValidPhone(ordering.dinerPhone)));
  const [name, setName] = useState(ordering.dinerName);
  const [phone, setPhone] = useState(ordering.dinerPhone);
  const hasDraft = ordering.lines.length > 0;
  const hasSent = ordering.orders.length > 0;
  const isDelivery = ordering.isDelivery;
  const fee = ordering.deliveryFee;
  const minOrder = isDelivery ? ordering.table.delivery?.minOrder : null;
  const belowMinimum = Boolean(minOrder) && ordering.total < minOrder;
  const grandTotal = ordering.total + fee;
  const tendered = ordering.delivery.cashTendered.trim();
  const tenderedShort = isDelivery && ordering.delivery.payWith === "cash" && AMOUNT.test(tendered) && Number(tendered.replace(",", ".")) < grandTotal;
  const addressReady = !isDelivery || (ordering.table.delivery?.zones || []).includes(ordering.delivery.zone) && Boolean(ordering.delivery.address.trim());
  const nameReady = Boolean((editingName ? name : ordering.dinerName).trim())
    && (!takeaway || isValidPhone(editingName ? phone : ordering.dinerPhone));
  const sendReady = nameReady && addressReady && !belowMinimum && !tenderedShort;

  async function send() {
    if (editingName) {
      if (!nameReady) return;
      ordering.saveName(name);
      if (takeaway) ordering.savePhone(phone);
    }
    const result = await ordering.send(editingName ? name.trim() : undefined, editingName && takeaway ? phone.trim() : undefined);
    if (result.ok) setEditingName(false);
  }

  return (
    <Sheet
      title={isDelivery ? t("Tu pedido a domicilio") : takeaway ? t("Tu pedido para llevar") : t("Tu pedido · {{table}}", { table: t("Mesa {{number}}", { number: ordering.table.number }) })}
      onClose={onClose}
      palette={palette}
      footer={(
        <div className="space-y-2">
          {hasDraft && ordering.canOrder && (
            <PrimaryButton palette={palette} onClick={send} disabled={ordering.sending || !sendReady}>
              {ordering.sending ? t("Mandando…") : t("Mandar pedido · {{total}}", { total: currency.format(grandTotal) })}
            </PrimaryButton>
          )}
          {hasSent && !takeaway && (
            <button type="button" onClick={onOpenAccount} className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-current/25 px-4 font-bold">
              <ReceiptText size={18} aria-hidden="true" /> {t("Ver cuenta de la mesa")}
            </button>
          )}
        </div>
      )}
    >
      {ordering.notice && (
        <p role={ordering.notice.tone === "error" ? "alert" : "status"} className="mb-3 flex items-start gap-2 rounded-xl border border-current/25 px-3 py-2.5 text-sm font-semibold">
          {ordering.notice.tone === "success" && <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0" />}
          {ordering.notice.text}
        </p>
      )}

      {hasDraft ? (
        <>
          <ul>{ordering.lines.map((line) => <CartLine key={line.key} line={line} ordering={ordering} />)}</ul>
          {isDelivery && (
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>{t("Productos")}</span><span className="tabular-nums">{currency.format(ordering.total)}</span></div>
              <div className="flex justify-between"><span>{t("Envío")}</span><span className="tabular-nums">{fee ? currency.format(fee) : t("Gratis")}</span></div>
            </div>
          )}
          <div className="mt-3 flex items-baseline justify-between">
            <p className="font-bold">{t("Total de este pedido")}</p>
            <p className="text-lg font-black tabular-nums">{currency.format(grandTotal)}</p>
          </div>
          {belowMinimum && <p role="status" className="mt-2 text-sm font-bold">{t("El pedido mínimo a domicilio es de {{amount}}, sin contar el envío.", { amount: currency.format(minOrder) })}</p>}
          {takeaway && ordering.table.orderingEnabled && ordering.table.delivery?.enabled && <div className="mt-4"><ChannelPicker ordering={ordering} /></div>}
          {isDelivery && <div className="mt-4"><DeliveryFields ordering={ordering} /></div>}
          <div className="mt-4">
            {editingName ? (
              <div className="space-y-4">
                <NameField value={name} onChange={setName} table={ordering.table} />
                {takeaway && <PhoneField value={phone} onChange={setPhone} />}
              </div>
            ) : (
              <p className="flex flex-wrap items-center gap-x-2 text-sm">
                <span>{t("Pides como")} <strong>{ordering.dinerName}</strong>{takeaway && ordering.dinerPhone ? ` · ${ordering.dinerPhone}` : ""}</span>
                <button type="button" onClick={() => { setName(ordering.dinerName); setPhone(ordering.dinerPhone); setEditingName(true); }} className="min-h-11 cursor-pointer font-bold underline underline-offset-2">{t("Cambiar")}</button>
              </p>
            )}
          </div>
          {isDelivery && ordering.canOrder && <div className="mt-4"><PaymentFields ordering={ordering} total={grandTotal} /></div>}
          {takeaway && !isDelivery && ordering.canOrder && <p className="mt-3 text-sm opacity-80">{t("Pagas al recoger, en efectivo o con tarjeta.")}</p>}
          {!ordering.canOrder && (
            <p className="mt-3 text-sm font-semibold">
              {isDelivery
                ? t("El restaurante no está entregando a domicilio en este momento.")
                : takeaway ? t("El restaurante no está recibiendo pedidos para llevar en este momento.") : t("El restaurante pausó los pedidos. Puedes pedirle al mesero.")}
            </p>
          )}
        </>
      ) : !hasSent ? (
        <div className="py-8 text-center">
          <ShoppingBag size={28} aria-hidden="true" className="mx-auto opacity-60" />
          <p className="mt-3 font-bold">{t("Tu pedido está vacío")}</p>
          <p className="mt-1 text-sm opacity-75">{t("Toca «Agregar» en los productos del menú para armarlo.")}</p>
        </div>
      ) : null}

      {hasSent && (
        <section aria-labelledby="sent-orders-title" className={hasDraft ? "mt-6" : ""}>
          <h3 id="sent-orders-title" className="mb-3 text-xs font-extrabold uppercase tracking-[1.2px] opacity-75">{t("Lo que ya pediste")}</h3>
          <ul className="space-y-3">{[...ordering.orders].reverse().map((order) => <SentOrder key={order.idempotency_key || order.created_at} order={order} takeaway={takeaway} />)}</ul>
        </section>
      )}
    </Sheet>
  );
}

/** La cuenta de toda la mesa: sólo lo que el restaurante ya recibió. */
function AccountSheet({ ordering, palette, onClose }) {
  const { t } = useTranslation();
  const currency = useMenuCurrency();
  const [state, setState] = useState({ status: "loading" });
  const { loadAccount } = ordering;

  useEffect(() => {
    let alive = true;
    loadAccount().then((result) => {
      if (!alive) return;
      setState(result.ok ? { status: "ready", account: result.account } : { status: "error" });
    });
    return () => { alive = false; };
  }, [loadAccount]);

  const byDiner = new Map();
  for (const line of state.account?.lines || []) {
    if (!byDiner.has(line.diner_name)) byDiner.set(line.diner_name, []);
    byDiner.get(line.diner_name).push(line);
  }

  return (
    <Sheet title={t("Cuenta de la {{table}}", { table: tableTitle(t, ordering.table) })} onClose={onClose} palette={palette}>
      {state.status === "loading" ? (
        <p aria-live="polite" className="py-8 text-center text-sm opacity-75">{t("Cargando la cuenta…")}</p>
      ) : state.status === "error" ? (
        <p role="alert" className="py-8 text-center text-sm font-semibold">{t("No pudimos cargar la cuenta. Intenta de nuevo en un momento.")}</p>
      ) : !state.account && ordering.accountClosed ? (
        <p className="py-8 text-center text-sm opacity-80">{t("El restaurante ya cerró la cuenta de esta mesa. Si piden algo más, se abre una cuenta nueva.")}</p>
      ) : !state.account || !state.account.lines.length ? (
        <p className="py-8 text-center text-sm opacity-80">{t("Todavía no hay nada en la cuenta. Aquí aparece lo que el restaurante ya recibió.")}</p>
      ) : (
        <>
          {[...byDiner.entries()].map(([diner, lines]) => (
            <section key={diner} className="border-b border-current/15 py-3">
              <h3 className="text-xs font-extrabold uppercase tracking-[1.2px] opacity-75">{diner}</h3>
              <ul className="mt-2 space-y-1.5">
                {lines.map((line, index) => (
                  <li key={`${line.name}-${index}`} className="flex items-baseline justify-between gap-3 text-sm">
                    <span><span className="font-bold">{line.quantity}×</span> {line.name}</span>
                    <span className="shrink-0 tabular-nums">{currency.format(Number(line.line_total))}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div className="flex items-baseline justify-between pt-4">
            <p className="font-extrabold">{t("Total de la mesa")}</p>
            <p className="text-2xl font-black tabular-nums">{currency.format(Number(state.account.total))}</p>
          </div>
          <p className="mt-3 text-sm opacity-80">{t("Solo el restaurante cierra la cuenta. Cuando terminen, pídela al mesero.")}</p>
        </>
      )}
    </Sheet>
  );
}

/**
 * Todo lo que se agrega al menú cuando se abre con el QR de una mesa. La
 * plantilla queda como está; esto va encima, con sus mismos colores.
 */
export default function TableOrderingLayer({ ordering, palette }) {
  const { t } = useTranslation();
  const currency = useMenuCurrency();
  const [sheet, setSheet] = useState(null);
  const [welcomed, setWelcomed] = useState(() => wasWelcomed(ordering.placeKey));
  const { table } = ordering;

  if (table.status === "missing" || table.status === "error") {
    return (
      <p role="status" className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-lg rounded-2xl px-4 py-3 text-center text-sm font-semibold shadow-lg" style={{ backgroundColor: palette.background, color: palette.text, fontFamily: palette.font }}>
        {table.takeaway
          ? t("No pudimos conectar con el restaurante para pedir para llevar. Puedes ver el menú.")
          : table.status === "missing"
            ? t("Este QR de mesa ya no está activo. Puedes ver el menú y pedirle al mesero.")
            : t("No pudimos conectar con tu mesa. Puedes ver el menú y pedirle al mesero.")}
      </p>
    );
  }
  if (table.status !== "ready") return null;

  const showWelcome = ordering.canBrowseOrder && !welcomed
    && (!ordering.dinerName || (table.takeaway && !isValidPhone(ordering.dinerPhone)));
  const pendingCount = ordering.orders.filter((order) => ["pending", "received", "preparing"].includes(order.status)
    || (order.channel === "delivery" && ["ready", "on_the_way"].includes(order.status) && order.account?.status !== "closed")).length;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg items-center gap-2 rounded-3xl p-2 shadow-[0_8px_30px_rgba(0,0,0,0.25)]" style={{ backgroundColor: palette.background, color: palette.text, fontFamily: palette.font }}>
          {table.takeaway ? (
            <span className="flex shrink-0 flex-col items-center rounded-2xl border border-current/20 px-3 py-2 text-center leading-tight">
              {ordering.isDelivery ? <Bike size={18} aria-hidden="true" /> : <ShoppingBag size={18} aria-hidden="true" />}
              <span className="mt-0.5 block text-[10px] font-extrabold uppercase tracking-[0.5px]">{ordering.isDelivery ? t("A domicilio") : t("Para llevar")}</span>
            </span>
          ) : (
            <span className="shrink-0 rounded-2xl border border-current/20 px-3 py-2 text-center leading-tight">
              <span className="block text-[10px] font-extrabold uppercase tracking-[1px] opacity-70">{t("Mesa")}</span>
              <span className="block text-lg font-black tabular-nums">{table.number}</span>
            </span>
          )}
          {ordering.count > 0 ? (
            <button type="button" onClick={() => setSheet("cart")} className="flex min-h-[54px] flex-1 cursor-pointer items-center justify-between gap-2 rounded-2xl px-4 font-extrabold" style={{ backgroundColor: palette.button, color: palette.buttonText }}>
              <span className="flex items-center gap-2"><ShoppingBag size={18} aria-hidden="true" />{t("Ver pedido ({{count}})", { count: ordering.count })}</span>
              <span className="tabular-nums">{currency.format(ordering.total)}</span>
            </button>
          ) : ordering.orders.length > 0 ? (
            <button type="button" onClick={() => setSheet("cart")} className="flex min-h-[54px] flex-1 cursor-pointer items-center justify-between gap-2 rounded-2xl border-2 border-current/20 px-4 font-extrabold">
              <span>{pendingCount ? t("Mis pedidos · {{count}} en camino", { count: pendingCount }) : t("Mis pedidos")}</span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          ) : (
            <p className="min-w-0 flex-1 px-2 text-sm font-semibold opacity-85">
              {ordering.canBrowseOrder
                ? t("Toca «Agregar» en lo que quieras pedir.")
                : table.takeaway ? t("Por ahora no hay pedidos para llevar.") : t("Los pedidos están en pausa. Pídele al mesero.")}
            </p>
          )}
        </div>
      </div>

      {showWelcome && <WelcomeSheet ordering={ordering} palette={palette} onDone={() => setWelcomed(true)} />}
      {sheet === "cart" && <CartSheet ordering={ordering} palette={palette} onClose={() => setSheet(null)} onOpenAccount={() => setSheet("account")} />}
      {sheet === "account" && <AccountSheet ordering={ordering} palette={palette} onClose={() => setSheet("cart")} />}
    </>
  );
}
