import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PalettePicker from "./PalettePicker";
import { CLASSIC_PALETTE_TOKENS } from "../utils/themeDefaults";

const palettes = [
  { key: "classic", name: "Clásico Eniu", tokens: CLASSIC_PALETTE_TOKENS },
  { key: "midnight", name: "Oscura/Nocturna", tokens: { ...CLASSIC_PALETTE_TOKENS, background: "#18140D" } },
];

describe("PalettePicker", () => {
  it("marca la paleta activa y ofrece la opción personalizada", () => {
    render(<PalettePicker palettes={palettes} value="classic" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Clásico Eniu/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Oscura\/Nocturna/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Personalizado/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("avisa con la clave de la paleta elegida, o null para personalizado", () => {
    const onChange = vi.fn();
    render(<PalettePicker palettes={palettes} value="classic" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Oscura\/Nocturna/i }));
    expect(onChange).toHaveBeenCalledWith("midnight");
    fireEvent.click(screen.getByRole("button", { name: /Personalizado/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
