import { describe, expect, it } from "vitest";

import { buildTicketHtml } from "./ticket";
import { claimAutoPrint, loadPrintSettings, savePrintSettings } from "./printSettings";

const order = {
  id: "o1", diner_name: "David <b>", created_at: "2026-11-24T20:05:00Z", received_at: "2026-11-24T20:06:00Z",
  items: [
    { name: "Latte", quantity: 2, notes: "Uno con avena", is_cancelled: false },
    { name: "Chilaquiles", quantity: 1, notes: null, is_cancelled: true },
    { name: "<img src=x onerror=alert(1)>", quantity: 1, notes: "<script>x</script>", is_cancelled: false },
  ],
};

function parse(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("la comanda", () => {
  it("lleva la mesa, el comensal, los productos y las notas, sin lo quitado ni precios", () => {
    const doc = parse(buildTicketHtml({ order, table: { number: 4, name: "Terraza" }, businessName: "Café Luna" }));
    const text = doc.body.textContent.replace(/\s+/g, " ");
    expect(doc.querySelector(".table").textContent).toBe("MESA 4");
    expect(text).toContain("Terraza");
    expect(text).toContain("David <b> ·");
    expect(text).toContain("2× Latte");
    expect(text).toContain("> Uno con avena");
    expect(text).not.toContain("Chilaquiles");
    expect(text).not.toContain("$");
    expect(text).toContain("3 productos");
  });

  it("para llevar lleva PARA LLEVAR y el teléfono en lugar de la mesa", () => {
    const html = buildTicketHtml({ order, table: { takeaway: true, number: null, name: "David", phone: "5512345678" }, businessName: "Café Luna" });
    expect(html).toContain("PARA LLEVAR");
    expect(html).toContain("Tel. 5512345678");
    expect(html).not.toContain("MESA");
  });

  it("no deja pasar HTML del comensal", () => {
    const doc = parse(buildTicketHtml({ order, table: { number: 4 }, businessName: "Café" }));
    expect(doc.querySelector("img")).toBeNull();
    expect(doc.querySelector("body script")).toBeNull();
    expect(doc.body.textContent).toContain("<img src=x onerror=alert(1)>");
  });

  it("se ajusta al papel de 58 mm y marca las reimpresiones", () => {
    const html = buildTicketHtml({ order, table: { number: 4 }, businessName: "Café", paper: "58", reprint: true });
    expect(parse(html).body.dataset.paperMm).toBe("58");
    expect(parse(html).body.textContent).toContain("REIMPRESIÓN");
  });
});

describe("ajustes de impresión", () => {
  it("son por dispositivo y empiezan sin imprimir solo, en 80 mm", () => {
    localStorage.clear();
    expect(loadPrintSettings()).toEqual({ autoPrint: false, paper: "80" });
    savePrintSettings({ autoPrint: true, paper: "58" });
    expect(loadPrintSettings()).toEqual({ autoPrint: true, paper: "58" });
    savePrintSettings({ paper: "33" });
    expect(loadPrintSettings().paper).toBe("80");
  });

  it("sólo una pestaña imprime cada pedido", () => {
    localStorage.clear();
    expect(claimAutoPrint("o1")).toBe(true);
    expect(claimAutoPrint("o1")).toBe(false);
    expect(claimAutoPrint("o2")).toBe(true);
  });
});
