import ElegantMenuTemplate from "./ElegantMenuTemplate";
import MinimalMenuTemplate from "./MinimalMenuTemplate";
import ModernMenuTemplate from "./ModernMenuTemplate";
import { BistroMenuTemplate, BoldMenuTemplate, LuxuryMenuTemplate, NaturalMenuTemplate, RetroMenuTemplate } from "./AdditionalMenuTemplates";

export const TEMPLATE_REGISTRY = Object.freeze({
  modern: ModernMenuTemplate,
  minimal: MinimalMenuTemplate,
  elegant: ElegantMenuTemplate,
  bistro: BistroMenuTemplate,
  bold: BoldMenuTemplate,
  natural: NaturalMenuTemplate,
  retro: RetroMenuTemplate,
  luxury: LuxuryMenuTemplate,
});

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

export function resolveTemplate(key) {
  return TEMPLATE_REGISTRY[key] || TEMPLATE_REGISTRY.modern;
}
