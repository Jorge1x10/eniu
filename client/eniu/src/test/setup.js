import "@testing-library/jest-dom/vitest";
// Antes que i18n, a propósito: deja escrita la preferencia de idioma que ese
// módulo lee al construirse.
import "./language-preference";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

import i18n from "../i18n";

// El español es el idioma de origen del código, así que comprobar contra él
// verifica la pantalla y no el catálogo. La cobertura de la traducción se
// comprueba aparte, en `src/i18n/i18n.test.js`.
beforeEach(() => {
  if (i18n.language !== "es") i18n.changeLanguage("es");
});

afterEach(() => cleanup());
