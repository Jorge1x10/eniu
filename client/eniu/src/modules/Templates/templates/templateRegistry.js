import { createElement } from "react";

import MenuTemplateRenderer from "./MenuTemplateRenderer";

export const TEMPLATE_OPTIONS = Object.freeze([
  { key: "modern", name: "Moderna", description: "Tarjetas visuales, portada amplia y navegación redondeada." },
  { key: "minimal", name: "Minimalista", description: "Lectura rápida, filas limpias y pocas sombras." },
  { key: "elegant", name: "Elegante", description: "Composición editorial, marcos sutiles y mayor espacio." },
  { key: "bistro", name: "Bistró", description: "Carta cálida con acentos laterales y lectura relajada." },
  { key: "bold", name: "Impactante", description: "Bloques fuertes, bordes marcados y mucha personalidad." },
  { key: "natural", name: "Natural", description: "Formas orgánicas, aire fresco y tarjetas suaves." },
  { key: "retro", name: "Retro", description: "Composición nostálgica con marcos punteados." },
  { key: "luxury", name: "Lujo", description: "Presentación sobria con jerarquía editorial premium." },
]);

const VALID_KEYS = new Set(TEMPLATE_OPTIONS.map((option) => option.key));

// Un componente por clave, creado una sola vez y reusado: `resolveTemplate`
// se llama de nuevo en cada render de la página que lo usa
// (`createElement(resolveTemplate(key), props)`), y si esa llamada devolviera
// un componente nuevo cada vez, React lo trataría como un tipo distinto y
// remontaría el árbol entero — perdiendo, por ejemplo, la categoría activa
// del filtro. Este mapa hace que la misma clave siga devolviendo siempre la
// misma identidad de componente.
const boundTemplates = new Map();

export function resolveTemplate(key) {
  const layoutKey = VALID_KEYS.has(key) ? key : "modern";
  if (!boundTemplates.has(layoutKey)) {
    boundTemplates.set(layoutKey, function BoundMenuTemplate(props) {
      return createElement(MenuTemplateRenderer, { layoutKey, ...props });
    });
  }
  return boundTemplates.get(layoutKey);
}
