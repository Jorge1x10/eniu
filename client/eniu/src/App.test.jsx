import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

/**
 * Lo que fija esta prueba: el menú público (lo que abre cada QR) no monta el
 * panel. Ni sesión, ni el SDK de Google, ni las pantallas de administración.
 */
const mocks = vi.hoisted(() => ({ panelRendered: vi.fn() }));

vi.mock("./modules/Publication/pages/PublicMenuPage", () => ({
  default: () => <p>menú público</p>,
}));
vi.mock("./PanelApp", () => ({
  default: function PanelApp() {
    mocks.panelRendered();
    return <p>panel</p>;
  },
}));

function renderAt(path) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

describe("App", () => {
  it("sirve el menú público sin montar el panel", async () => {
    mocks.panelRendered.mockClear();
    renderAt("/m/cafe-luna");

    expect(await screen.findByText("menú público")).toBeInTheDocument();
    expect(mocks.panelRendered).not.toHaveBeenCalled();
  });

  it("cualquier otra ruta va al panel", async () => {
    renderAt("/login");

    expect(await screen.findByText("panel")).toBeInTheDocument();
  });
});
