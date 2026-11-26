import { describe, expect, it } from "vitest";

import { orderLabel, placeLabel, tableLabel, withPlace } from "./labels";

describe("etiquetas de mesa y para llevar", () => {
  it("una cuenta para llevar se dibuja como una mesa marcada", () => {
    const account = withPlace({ id: "a", channel: "takeaway", table: null, customer: { name: "David", phone: "5512345678" } });
    expect(account.table).toEqual({ id: null, number: null, takeaway: true, name: "David", phone: "5512345678", delivery: null });
    expect(placeLabel(account.table)).toBe("Para llevar");
    expect(tableLabel(account.table)).toBe("Para llevar · David");
    expect(orderLabel({ diner_name: "David" }, account.table)).toBe("David | Para llevar");
  });

  it("a domicilio lleva la dirección y su propia etiqueta", () => {
    const delivery = { address: "Colima 120", zone: "Roma Norte", fee: "35.00", pay_with: "cash", cash_tendered: "500.00" };
    const account = withPlace({ id: "a", channel: "delivery", table: null, customer: { name: "Ana", phone: "5512345678" }, delivery });
    expect(account.table.takeaway).toBe(true);
    expect(account.table.delivery).toBe(delivery);
    expect(placeLabel(account.table)).toBe("A domicilio");
    expect(tableLabel(account.table)).toBe("A domicilio · Ana");
    expect(orderLabel({ diner_name: "Ana" }, account.table)).toBe("Ana | A domicilio");
  });

  it("las mesas no cambian", () => {
    const account = { table: { id: "t", number: 4, name: "Terraza" } };
    expect(withPlace(account)).toBe(account);
    expect(placeLabel(account.table)).toBe("Mesa 4");
    expect(tableLabel(account.table)).toBe("Mesa 4 · Terraza");
    expect(orderLabel({ diner_name: "Ana" }, account.table)).toBe("Ana | Mesa 4");
  });
});
