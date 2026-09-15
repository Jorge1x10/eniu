import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { classifyDevice, classifySource, createAnalyticsSession, observeProductCards } from "./publicAnalytics";

describe("publicAnalytics", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it("el módulo no menciona ningún almacenamiento del dispositivo", () => {
    // Guardar o leer algo en el equipo de quien navega exige consentimiento
    // previo en la UE y el Reino Unido —artículo 5.3 de la directiva de
    // privacidad electrónica—, y da igual que lo guardado no identifique a
    // nadie. La única forma de pedirlo sería un banner delante de la carta del
    // restaurante, así que la medición no toca el dispositivo.
    //
    // Se revisa el texto del módulo y no su comportamiento a propósito: una
    // prueba de comportamiento sólo cubre los caminos que ejecuta, y lo que
    // hay que impedir es que alguien reintroduzca un identificador persistente
    // en cualquier rincón de este archivo.
    // Desde la raíz del paquete: en jsdom `import.meta.url` no es un `file:`.
    const fuente = readFileSync("src/modules/Publication/analytics/publicAnalytics.js", "utf8");
    // Se quitan los comentarios antes de buscar: el propio módulo explica por
    // qué no guarda nada, y esa explicación nombra lo que no usa. El recorte
    // es ingenuo y aquí basta, porque el archivo no tiene cadenas de texto con
    // barras dentro que puedan confundirse con el inicio de un comentario.
    const codigo = fuente.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
    const prohibido = codigo.match(/localStorage|sessionStorage|document\.cookie|indexedDB/g);
    expect(prohibido, "la medición del menú público no debe tocar el dispositivo").toBeNull();
  });

  it("cada visita estrena sesión: sin almacenamiento no se reconoce a quien vuelve", () => {
    expect(createAnalyticsSession().id).not.toBe(createAnalyticsSession().id);
    expect(createAnalyticsSession()).toEqual({ id: expect.any(String), menuViews: {}, products: {} });
    // Y crearlas no deja rastro en el navegador.
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  it("clasifica fuente y dispositivo usando solamente categorías permitidas", () => {
    expect(classifySource("?src=qr", "")).toBe("qr");
    expect(classifySource("?src=copy", "")).toBe("copied_link");
    expect(classifySource("?src=dashboard", "")).toBe("dashboard");
    expect(classifySource("?src=unexpected", "")).toBe("unknown");
    expect(classifySource("", "https://instagram.com/post")).toBe("social");
    expect(classifySource("", "https://example.com/article")).toBe("referral");
    expect(classifySource("", "")).toBe("direct");
    expect([classifyDevice(390), classifyDevice(900), classifyDevice(1440), classifyDevice(0)]).toEqual(["mobile", "tablet", "desktop", "unknown"]);
  });

  it("registra un producto solo después de 50% visible durante un segundo", () => {
    vi.useFakeTimers();
    let observer;
    class TestObserver {
      constructor(callback, options) { this.callback = callback; this.options = options; observer = this; }
      observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", TestObserver);
    const root = document.createElement("div");
    const card = document.createElement("article"); card.dataset.analyticsProductKey = "a".repeat(64); root.appendChild(card);
    const onVisible = vi.fn(); const cleanup = observeProductCards(root, onVisible);
    expect(observer.options.threshold).toEqual([0.5]);
    observer.callback([{ target: card, isIntersecting: true, intersectionRatio: 0.5 }]);
    vi.advanceTimersByTime(999); expect(onVisible).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(onVisible).toHaveBeenCalledWith("a".repeat(64));
    cleanup(); vi.unstubAllGlobals(); vi.useRealTimers();
  });
});
