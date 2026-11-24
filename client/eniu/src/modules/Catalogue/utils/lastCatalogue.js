import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "eniu_last_catalogue_by_business";

// Quien dibuja enlaces a partir del menú recordado (la barra lateral) necesita
// enterarse cuando cambia: escribir en localStorage no vuelve a pintar nada.
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

function readSelections() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function writeSelections(value) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* Storage may be unavailable. */ }
  notify();
}

export function rememberCatalogue(businessId, catalogueId) {
  if (!businessId || !catalogueId) return;
  if (getLastCatalogue(businessId) === catalogueId) return;
  writeSelections({ ...readSelections(), [businessId]: catalogueId });
}

export function getLastCatalogue(businessId) {
  if (!businessId) return null;
  const value = readSelections()[businessId];
  return typeof value === "string" && value ? value : null;
}

export function forgetCatalogue(businessId, catalogueId) {
  if (!businessId) return;
  const selections = readSelections();
  if (!(businessId in selections)) return;
  if (catalogueId && selections[businessId] !== catalogueId) return;
  delete selections[businessId];
  writeSelections(selections);
}

/**
 * Avisa cada vez que cambia el menú recordado de cualquier negocio, también
 * cuando cambia desde otra pestaña. Devuelve la función para dejar de oír.
 */
export function subscribeLastCatalogue(listener) {
  listeners.add(listener);
  function onStorage(event) {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** El menú recordado de un negocio, y vuelve a pintar cuando cambia. */
export function useLastCatalogue(businessId) {
  const getSnapshot = useCallback(() => getLastCatalogue(businessId), [businessId]);
  return useSyncExternalStore(subscribeLastCatalogue, getSnapshot, getSnapshot);
}
