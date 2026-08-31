import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import en from "./en.json";
import { normalizeLanguage, SUPPORTED_LANGUAGES } from "./index";

// El verificador recorre el código con el AST de Babel, así que vive en CJS y
// se carga por `require`.
const require_ = createRequire(import.meta.url);
const { findUntranslated } = require_("./untranslated.cjs");

/** Nombres de los marcadores `{{...}}` de una cadena. */
function placeholders(text) {
  return new Set([...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]));
}

describe("catálogo de traducción", () => {
  it("ninguna entrada se quedó vacía o sin traducir", () => {
    // Estas se escriben igual en los dos idiomas; que coincidan no es un
    // descuido, así que se declaran para que el resto sí se vigile.
    const identical = new Set(["Natural", "Retro", "Visible", "WhatsApp"]);
    const untouched = Object.entries(en)
      .filter(([source, translated]) =>
        !translated.trim() || (source === translated && !identical.has(source)))
      .map(([source]) => source);

    expect(untouched).toEqual([]);
  });

  it("cada traducción conserva los marcadores del español", () => {
    // Un marcador que falta deja un hueco sin rellenar en pantalla; uno que
    // sobra sale literal como "{{name}}".
    const mismatched = Object.entries(en)
      .filter(([source, translated]) => {
        const from = placeholders(source);
        const to = placeholders(translated);
        return from.size !== to.size || [...from].some((name) => !to.has(name));
      })
      .map(([source]) => source);

    expect(mismatched).toEqual([]);
  });
});

describe("cobertura de la interfaz", () => {
  it("no queda texto de cara al usuario sin traducción", () => {
    // Esta es la red que atrapa el descuido habitual: se añade una pantalla en
    // español y nadie nota que en inglés sale a medias.
    const findings = findUntranslated();
    const detail = findings
      .map((item) => `${item.file}:${item.line}  ${JSON.stringify(item.text)}`)
      .join("\n");

    expect(findings, `textos sin traducir:\n${detail}`).toHaveLength(0);
  });
});

describe("resolución de idioma", () => {
  it("acepta etiquetas regionales y rechaza lo que no hablamos", () => {
    expect(normalizeLanguage("en-US")).toBe("en");
    expect(normalizeLanguage("es_MX")).toBe("es");
    expect(normalizeLanguage("  EN  ")).toBe("en");
    expect(normalizeLanguage("fr")).toBeNull();
    expect(normalizeLanguage("")).toBeNull();
    expect(normalizeLanguage(null)).toBeNull();
  });

  it("declara los idiomas que el backend también acepta", () => {
    // Si divergen, alguien puede elegir en pantalla un idioma que la API
    // rechaza al guardarlo.
    expect(SUPPORTED_LANGUAGES).toEqual(["es", "en"]);
  });
});
