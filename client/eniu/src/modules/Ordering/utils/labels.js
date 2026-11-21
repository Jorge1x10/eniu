import i18n from "../../../i18n";

/** "Mesa 4" o "Mesa 4 · Terraza". */
export function tableLabel(table) {
  if (!table) return "";
  return table.name
    ? i18n.t("Mesa {{number}} · {{name}}", { number: table.number, name: table.name })
    : i18n.t("Mesa {{number}}", { number: table.number });
}

/** La etiqueta con la que el negocio reconoce un pedido: "David | Mesa 4". */
export function orderLabel(order, table) {
  return `${order.diner_name} | ${i18n.t("Mesa {{number}}", { number: table.number })}`;
}
