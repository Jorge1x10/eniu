/**
 * Avisos del sistema operativo (Notification API) para el panel.
 *
 * Sólo funcionan con una pestaña del panel abierta, aunque esté detrás de
 * otras: sin service worker ni push del servidor, el navegador no puede
 * avisar con el panel cerrado. Las abiertas se recuerdan por `tag` para
 * cerrarlas cuando ya no aplican (el pedido se aceptó o se rechazó).
 */
const PROMPT_DISMISSED_KEY = "eniu.notify.prompt.dismissed";
const open = new Map();

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission() {
  return notificationsSupported() ? window.Notification.permission : "unsupported";
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported";
  try {
    return await window.Notification.requestPermission();
  } catch {
    return window.Notification.permission;
  }
}

export function promptDismissed() {
  try { return localStorage.getItem(PROMPT_DISMISSED_KEY) === "1"; } catch { return false; }
}

export function dismissPrompt() {
  try { localStorage.setItem(PROMPT_DISMISSED_KEY, "1"); } catch { /* sólo no se recuerda */ }
}

/** Muestra un aviso si hay permiso. `persistent`: no se cierra solo. */
export function showNotification({ tag, title, body, persistent = false, onClick }) {
  if (notificationPermission() !== "granted") return null;
  try {
    closeNotification(tag);
    const notification = new window.Notification(title, {
      body,
      tag,
      icon: "/favicon-64.png",
      requireInteraction: persistent,
    });
    notification.onclick = () => {
      window.focus();
      onClick?.();
      notification.close();
    };
    notification.onclose = () => { if (open.get(tag) === notification) open.delete(tag); };
    open.set(tag, notification);
    return notification;
  } catch {
    // Algunos navegadores móviles sólo permiten avisos desde un service worker.
    return null;
  }
}

export function closeNotification(tag) {
  const notification = open.get(tag);
  if (!notification) return;
  open.delete(tag);
  try { notification.close(); } catch { /* ya estaba cerrada */ }
}

export function closeAllNotifications() {
  for (const tag of [...open.keys()]) closeNotification(tag);
}
