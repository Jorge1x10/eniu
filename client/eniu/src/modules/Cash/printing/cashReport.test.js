import { describe, expect, it } from "vitest";

import { buildCashReportHtml } from "./cashReport";

const REPORT = {
  opened_at: "2026-11-26T15:00:00Z", closed_at: "2026-11-26T23:00:00Z", opening_float: "500.00",
  by_method: [
    { method: "cash", amount: "100.00", tips: "10.00", payments: 1 },
    { method: "card", amount: "50.00", tips: "7.50", payments: 1 },
    { method: "transfer", amount: "0.00", tips: "0.00", payments: 0 },
    { method: "other", amount: "0.00", tips: "0.00", payments: 0 },
  ],
  sales_total: "150.00", tips_total: "17.50", accounts_paid: 1, average_ticket: "150.00",
  accounts_cancelled: 1, accounts_unpaid: [{ id: "a", table: { number: 2 }, total: "40.00" }],
  cash_in: "0.00", cash_out: "20.00",
  movements: [{ id: "m", kind: "out", amount: "20.00", reason: "<b>Gas</b>" }],
  expected_cash: "590.00", counted_cash: "580.00", difference: "-10.00", notes: "Faltó <script>",
};

describe("corte impreso", () => {
  it("lleva ventas por método, propinas, efectivo y diferencia", () => {
    const html = buildCashReportHtml({ report: REPORT, businessName: "Café Luna", currency: "MXN" });
    expect(html).toContain("CORTE DE CAJA");
    expect(html).toContain("Tarjeta");
    expect(html).not.toContain("Transferencia");
    expect(html).toContain("Esperado en caja");
    expect(html).toContain("Faltante");
    expect(html).toContain("Cerradas sin cobrar");
    expect(html).toContain('data-paper-mm="80"');
  });

  it("escapa los textos escritos a mano", () => {
    const html = buildCashReportHtml({ report: REPORT, businessName: "<i>Luna</i>", currency: "MXN", paper: "58" });
    expect(html).not.toContain("<b>Gas</b>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;b&gt;Gas&lt;/b&gt;");
    expect(html).toContain('data-paper-mm="58"');
  });
});
