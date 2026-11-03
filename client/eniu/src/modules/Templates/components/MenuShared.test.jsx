import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import i18n from "../../../i18n";
import { MenuFooter } from "./MenuShared";

describe("MenuFooter", () => {
  afterEach(() => i18n.changeLanguage("es"));

  it("en el plan gratuito la marca enlaza a eniu.app con parámetros de campaña", () => {
    render(<MenuFooter show />);
    const link = screen.getByRole("link", { name: "Menú creado con ENIU" });
    const url = new URL(link.getAttribute("href"));
    expect(url.origin).toBe("https://eniu.app");
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("utm_source")).toBe("eniu_menu");
    expect(url.searchParams.get("utm_medium")).toBe("badge");
    expect(url.searchParams.get("utm_campaign")).toBe("free_plan");
    // Abre en otra pestaña sin darle a eniu.app acceso a la ventana del menú.
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("quien lee el menú en inglés llega a la versión en inglés del sitio", async () => {
    await i18n.changeLanguage("en");
    render(<MenuFooter show />);
    expect(new URL(screen.getByRole("link", { name: "Menu built with ENIU" }).getAttribute("href")).pathname).toBe("/en");
  });

  it("sin la bandera no hay marca ni enlace", () => {
    render(<MenuFooter />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
