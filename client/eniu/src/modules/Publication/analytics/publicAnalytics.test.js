import { beforeEach, describe, expect, it, vi } from "vitest";

import { classifyDevice, classifySource, getAnalyticsSession, getAnonymousVisitor, observeProductCards } from "./publicAnalytics";

describe("publicAnalytics", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it("rota visitantes a 30 días y sesiones tras 30 minutos", () => {
    const visitor = getAnonymousVisitor(1000);
    expect(getAnonymousVisitor(2000)).toBe(visitor);
    expect(getAnonymousVisitor(1000 + 31 * 24 * 60 * 60 * 1000)).not.toBe(visitor);
    const session = getAnalyticsSession(1000);
    expect(getAnalyticsSession(1000 + 29 * 60 * 1000).id).toBe(session.id);
    expect(getAnalyticsSession(1000 + 61 * 60 * 1000).id).not.toBe(session.id);
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
