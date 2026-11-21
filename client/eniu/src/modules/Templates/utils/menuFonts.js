import { useEffect } from "react";

/**
 * Carga de Google Fonts sólo la tipografía que usa cada menú.
 *
 * Antes `index.html` pedía las 35 familias del catálogo en cada página,
 * incluido el menú público: una hoja de estilos que bloqueaba el primer pintado
 * y una conexión a Google en cada escaneo de QR, para dibujar una sola fuente.
 *
 * Los parámetros son los mismos que pedía aquel enlace, para que el texto se
 * vea igual que antes. Las claves son las de `FONT_REGISTRY`
 * (`themeDefaults.js`) y `FONTS` en el backend (`template/catalog.py`).
 */
export const GOOGLE_FONT_SPECS = Object.freeze({
  inter: "Inter:wght@400;600;700",
  poppins: "Poppins:wght@400;600;700",
  montserrat: "Montserrat:wght@400;600;700",
  playfair: "Playfair+Display:wght@400;700",
  lora: "Lora:wght@400;700",
  roboto: "Roboto:wght@400;700",
  open_sans: "Open+Sans:wght@400;700",
  nunito: "Nunito:wght@400;700",
  raleway: "Raleway:wght@400;700",
  work_sans: "Work+Sans:wght@400;700",
  rubik: "Rubik:wght@400;700",
  karla: "Karla:wght@400;700",
  manrope: "Manrope:wght@400;700",
  sora: "Sora:wght@400;700",
  space_grotesk: "Space+Grotesk:wght@400;700",
  barlow: "Barlow:wght@400;700",
  archivo: "Archivo:wght@400;700",
  merriweather: "Merriweather:wght@400;700",
  libre_baskerville: "Libre+Baskerville:wght@400;700",
  crimson_text: "Crimson+Text:wght@400;700",
  pt_serif: "PT+Serif:wght@400;700",
  cormorant: "Cormorant:wght@400;700",
  fraunces: "Fraunces:wght@400;700",
  dm_serif_display: "DM+Serif+Display",
  bitter: "Bitter:wght@400;700",
  bebas_neue: "Bebas+Neue",
  oswald: "Oswald:wght@400;700",
  anton: "Anton",
  abril_fatface: "Abril+Fatface",
  righteous: "Righteous",
  pacifico: "Pacifico",
  dancing_script: "Dancing+Script:wght@400;700",
  caveat: "Caveat:wght@400;700",
  jetbrains_mono: "JetBrains+Mono:wght@400;700",
  space_mono: "Space+Mono:wght@400;700",
});

const FONTS_URL = "https://fonts.googleapis.com/css2";

/** Inserta, una sola vez por familia, la hoja de estilos de Google Fonts. */
export function loadMenuFont(fontKey) {
  const spec = GOOGLE_FONT_SPECS[fontKey];
  if (!spec || typeof document === "undefined") return;
  const id = `eniu-font-${fontKey}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `${FONTS_URL}?family=${spec}&display=swap`;
  document.head.appendChild(link);
}

/** Carga las tipografías indicadas mientras el componente esté montado (y se quedan). */
export function useMenuFonts(...fontKeys) {
  const key = fontKeys.filter(Boolean).join(",");
  useEffect(() => {
    key.split(",").filter(Boolean).forEach(loadMenuFont);
  }, [key]);
}
