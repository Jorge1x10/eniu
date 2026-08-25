import { useCallback, useEffect, useRef } from "react";

import { sendAnalyticsEvents } from "../services/publicMenuService";

const VISITOR_KEY = "eniu_analytics_visitor";
const SESSION_KEY = "eniu_analytics_session";
const VISITOR_TTL = 30 * 24 * 60 * 60 * 1000;
const SESSION_TTL = 30 * 60 * 1000;
const SOCIAL_HOSTS = ["facebook.com", "instagram.com", "tiktok.com", "x.com", "twitter.com", "linkedin.com"];

function randomId() {
  return crypto.randomUUID().replaceAll("-", "_");
}

function readStorage(storage, key) {
  try { return JSON.parse(storage.getItem(key)); } catch { return null; }
}

function writeStorage(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be disabled. */ }
}

export function getAnonymousVisitor(now = Date.now()) {
  const current = readStorage(localStorage, VISITOR_KEY);
  if (current?.id && current.expiresAt > now) return current.id;
  const visitor = { id: randomId(), expiresAt: now + VISITOR_TTL };
  writeStorage(localStorage, VISITOR_KEY, visitor);
  return visitor.id;
}

export function getAnalyticsSession(now = Date.now()) {
  let current = readStorage(sessionStorage, SESSION_KEY);
  if (!current?.id || now - current.lastActivity >= SESSION_TTL) {
    current = { id: randomId(), lastActivity: now, menuViews: {}, products: {} };
  }
  current.lastActivity = now;
  writeStorage(sessionStorage, SESSION_KEY, current);
  return current;
}

export function saveAnalyticsSession(session) {
  session.lastActivity = Date.now();
  writeStorage(sessionStorage, SESSION_KEY, session);
}

export function classifyDevice(width = window.innerWidth) {
  if (!Number.isFinite(width) || width <= 0) return "unknown";
  if (width <= 767) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

export function classifySource(search = window.location.search, referrer = document.referrer) {
  const src = new URLSearchParams(search).get("src");
  if (src === "dashboard") return "dashboard";
  if (src === "qr") return "qr";
  if (src === "copy") return "copied_link";
  if (src) return "unknown";
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return SOCIAL_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`)) ? "social" : "referral";
  } catch { return "unknown"; }
}

export function observeProductCards(root, onVisible) {
  if (!root || typeof IntersectionObserver === "undefined") return () => {};
  const timers = new Map();
  const observed = new WeakSet();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const key = entry.target.dataset.analyticsProductKey;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        if (!timers.has(entry.target)) timers.set(entry.target, window.setTimeout(() => {
          timers.delete(entry.target);
          observer.unobserve(entry.target);
          onVisible(key);
        }, 1000));
      } else if (timers.has(entry.target)) {
        window.clearTimeout(timers.get(entry.target));
        timers.delete(entry.target);
      }
    });
  }, { threshold: [0.5] });
  const attach = () => root.querySelectorAll("[data-analytics-product-key]").forEach((element) => {
    if (!observed.has(element)) { observed.add(element); observer.observe(element); }
  });
  attach();
  const mutation = new MutationObserver(attach);
  mutation.observe(root, { childList: true, subtree: true });
  return () => {
    mutation.disconnect(); observer.disconnect();
    timers.forEach((timer) => window.clearTimeout(timer));
  };
}

export function usePublicAnalytics(publicSlug, rootRef, enabled, sourceSearch = window.location.search) {
  const queueRef = useRef([]);
  const flushTimerRef = useRef(null);
  const contextRef = useRef(null);

  const flush = useCallback((keepalive = false) => {
    if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
    const events = queueRef.current.splice(0, 20);
    if (events.length) sendAnalyticsEvents(publicSlug, events, { keepalive });
  }, [publicSlug]);

  const enqueue = useCallback((type, targetType = null, targetKey = null) => {
    const context = contextRef.current;
    if (!context || context.source === "dashboard") return;
    queueRef.current.push({
      type,
      visitor_id: context.visitorId,
      session_id: context.session.id,
      occurred_at: new Date().toISOString(),
      source: context.source,
      device_type: context.device,
      target_type: targetType,
      target_key: targetKey,
    });
    if (!flushTimerRef.current) flushTimerRef.current = window.setTimeout(() => flush(false), 300);
  }, [flush]);

  useEffect(() => {
    if (!enabled) return undefined;
    const source = classifySource(sourceSearch);
    if (source === "dashboard") return undefined;
    const session = getAnalyticsSession();
    contextRef.current = { visitorId: getAnonymousVisitor(), session, source, device: classifyDevice() };
    if (!session.menuViews[publicSlug]) {
      session.menuViews[publicSlug] = true;
      saveAnalyticsSession(session);
      enqueue("menu_view");
    }
    const productCleanup = observeProductCards(rootRef.current, (key) => {
      if (!key) return;
      const viewed = session.products[publicSlug] || [];
      if (viewed.includes(key)) return;
      session.products[publicSlug] = [...viewed, key];
      saveAnalyticsSession(session);
      enqueue("product_view", "product", key);
    });
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(true); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      productCleanup();
      document.removeEventListener("visibilitychange", onVisibility);
      flush(true);
    };
  }, [enabled, enqueue, flush, publicSlug, rootRef, sourceSearch]);

  return useCallback((trackingKey) => {
    if (trackingKey) enqueue("category_select", "category", trackingKey);
  }, [enqueue]);
}
