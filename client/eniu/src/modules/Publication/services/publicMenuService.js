const API_BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");

export async function getPublicMenu(publicSlug, { signal } = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/public/menus/${encodeURIComponent(publicSlug)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    if (error.name === "AbortError") return { ok: false, aborted: true, status: 0, data: null };
    return { ok: false, status: 0, data: null };
  }
}

export async function sendAnalyticsEvents(publicSlug, events, { keepalive = false } = {}) {
  try {
    await fetch(`${API_BASE_URL}/public/menus/${encodeURIComponent(publicSlug)}/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: events.slice(0, 20) }),
      keepalive,
    });
  } catch {
    // Analytics must never interrupt the public menu experience.
  }
}
