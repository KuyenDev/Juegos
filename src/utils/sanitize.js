/**
 * Utilidades de saneamiento de cadenas y validación segura para DOM e importación de datos.
 */
export function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizePositiveInt(val, fallback = 0, max = 1e9) {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.min(max, Math.round(num));
}
