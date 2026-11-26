import i18n from "../../../i18n";

/**
 * Las cuentas para llevar y a domicilio no tienen mesa. Para que todo el
 * panel las dibuje igual que una mesa, `useLiveOrders` les pone un `table`
 * con `takeaway: true` ("sin mesa") y el nombre y teléfono de quien pide; a
 * domicilio, además, `delivery` con la dirección y el pago (ver `withPlace`).
 * Estas etiquetas leen ese mismo objeto.
 */
export function withPlace(account) {
  if (account.table) return account;
  return {
    ...account,
    table: {
      id: null,
      number: null,
      takeaway: true,
      name: account.customer?.name || null,
      phone: account.customer?.phone || null,
      delivery: account.delivery || null,
    },
  };
}

/** "Mesa 4", "Para llevar" o "A domicilio": lo corto, para títulos y avisos. */
export function placeLabel(table) {
  if (!table) return "";
  if (table.delivery) return i18n.t("A domicilio");
  return table.takeaway ? i18n.t("Para llevar") : i18n.t("Mesa {{number}}", { number: table.number });
}

/** "Mesa 4", "Mesa 4 · Terraza" o "Para llevar · David". */
export function tableLabel(table) {
  if (!table) return "";
  if (table.delivery) {
    return table.name ? i18n.t("A domicilio · {{name}}", { name: table.name }) : i18n.t("A domicilio");
  }
  if (table.takeaway) {
    return table.name ? i18n.t("Para llevar · {{name}}", { name: table.name }) : i18n.t("Para llevar");
  }
  return table.name
    ? i18n.t("Mesa {{number}} · {{name}}", { number: table.number, name: table.name })
    : i18n.t("Mesa {{number}}", { number: table.number });
}

/** La etiqueta con la que el negocio reconoce un pedido: "David | Mesa 4" o "David | Para llevar". */
export function orderLabel(order, table) {
  return `${order.diner_name} | ${placeLabel(table)}`;
}
