import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TemplateSelector from "../components/TemplateSelector";
import MenuBackground from "../components/MenuBackground";
import { normalizeConfiguration } from "../utils/themeDefaults";
import { TEMPLATE_OPTIONS } from "./templateRegistry";

describe("catálogo de plantillas", () => {
  it("ofrece las tres plantillas originales y las cinco nuevas", () => {
    render(<TemplateSelector value="modern" onChange={() => {}} />);

    expect(TEMPLATE_OPTIONS).toHaveLength(8);
    ["Bistró", "Impactante", "Natural", "Retro", "Lujo"].forEach((name) => {
      expect(screen.getByRole("button", { name: new RegExp(name, "i") })).toBeInTheDocument();
    });
  });

  it("conserva la plantilla y opacidad elegidas", () => {
    const configuration = normalizeConfiguration({
      template_key: "luxury",
      theme: { background_opacity: 0.45 },
    });

    expect(configuration.template_key).toBe("luxury");
    expect(configuration.theme.background_opacity).toBe(0.45);
  });

  it("renderiza el fondo con la opacidad seleccionada", () => {
    const { container } = render(<MenuBackground theme={{
      background_image_url: "/api/example/background",
      background_opacity: 0.35,
    }} />);

    expect(container.firstChild).toHaveStyle({ opacity: "0.35" });
    expect(container.firstChild.style.backgroundImage).toContain("/api/example/background");
  });
});
