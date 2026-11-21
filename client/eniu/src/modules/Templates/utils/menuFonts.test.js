import { afterEach, describe, expect, it } from "vitest";

import { FONT_REGISTRY } from "./themeDefaults";
import { GOOGLE_FONT_SPECS, loadMenuFont } from "./menuFonts";

const fontLinks = () => [...document.querySelectorAll('link[id^="eniu-font-"]')];

afterEach(() => fontLinks().forEach((link) => link.remove()));

describe("menuFonts", () => {
  it("tiene la petición de Google Fonts de cada tipografía del catálogo", () => {
    expect(Object.keys(GOOGLE_FONT_SPECS).sort()).toEqual(Object.keys(FONT_REGISTRY).sort());
  });

  it("pide sólo la familia indicada, una sola vez", () => {
    loadMenuFont("playfair");
    loadMenuFont("playfair");

    const links = fontLinks();
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe(
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap"
    );
  });

  it("ignora claves que no están en el catálogo", () => {
    loadMenuFont("comic_sans");
    loadMenuFont(undefined);

    expect(fontLinks()).toHaveLength(0);
  });
});
