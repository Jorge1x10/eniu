const STORAGE_KEY = "eniu_last_catalogue_by_business";

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
}

export function rememberCatalogue(businessId, catalogueId) {
  if (!businessId || !catalogueId) return;
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
  if (catalogueId && selections[businessId] !== catalogueId) return;
  delete selections[businessId];
  writeSelections(selections);
}
