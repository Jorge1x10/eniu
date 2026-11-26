import { describe, expect, it } from "vitest";

import { orderLabel, placeLabel, tableLabel, withPlace } from "./labels";

describe("etiquetas de mesa y para llevar", () => {
  it("una cuenta para llevar se dibuja como una mesa marcada", () => {
    const account = withPlace({ id: "a", channel: "takeaway", table: null, customer: { name: "David", phone: "5512345678" } });
    expect(account.table).toEqual({ id: null, number: null, takeaway: true, name: "David", phone: "5512345678" });
    expect(placeLabel(account.table)).toBe("Para llevar");
    expect(tableLabel(account.table)).toBe("Para llevar · David");
    expect(orderLabel({ diner_name: "David" }, account.table)).toBe("David | Para llevar");
  });

  it("las mesas no cambian", () => {
    const account = { table: { id: "t", number: 4, name: "Terraza" } };
    expect(withPlace(account)).toBe(account);
    expect(placeLabel(account.table)).toBe("Mesa 4");
    expect(tableLabel(account.table)).toBe("Mesa 4 · Terraza");
    expect(orderLabel({ diner_name: "Ana" }, account.table)).toBe("Ana | Mesa 4");
  });
});
