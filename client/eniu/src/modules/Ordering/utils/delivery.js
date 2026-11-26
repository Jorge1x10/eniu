import i18n from "../../../i18n";
import { formatCurrency } from "../../../i18n/formats";

/**
 * Cómo dice el cliente que va a pagar un pedido a domicilio: "Paga con
 * tarjeta (llevar terminal)" o "Paga en efectivo con $500 · cambio $355".
 * El cambio sólo se calcula con el total ya conocido.
 */
export function formatPayWith(delivery, currency, total = null) {
  if (!delivery) return "";
  if (delivery.pay_with === "card") return i18n.t("Paga con tarjeta: llevar terminal");
  if (!delivery.cash_tendered) return i18n.t("Paga en efectivo");
  const tendered = formatCurrency(Number(delivery.cash_tendered), currency);
  if (total === null || total === undefined || Number(total) <= 0) {
    return i18n.t("Paga en efectivo con {{amount}}", { amount: tendered });
  }
  return i18n.t("Paga en efectivo con {{amount}} · cambio {{change}}", {
    amount: tendered,
    change: formatCurrency(Number(delivery.cash_tendered) - Number(total), currency),
  });
}
