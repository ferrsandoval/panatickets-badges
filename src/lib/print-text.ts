/**
 * Utilidades para texto en impresión: UTF-8 y caracteres no imprimibles.
 */

/** Decodifica un valor de query param de forma segura (UTF-8). Si falla, devuelve el string original. */
export function safeDecodeUriComponent(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Caracteres de control que pueden no imprimirse bien en etiquetas. */
const UNPRINTABLE_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

/** Indica si el texto tiene caracteres no imprimibles o problemáticos (control chars, %). */
export function hasUnprintableOrRisky(text: string | null | undefined): boolean {
  if (text == null || text === "") return false;
  if (UNPRINTABLE_REGEX.test(text)) return true;
  if (text.includes("%")) return true;
  return false;
}

/**
 * Sanitiza texto para impresión: quita caracteres de control (sustituye por espacio).
 * Mantiene acentos y UTF-8. El % se deja (la mayoría de impresoras lo imprimen).
 */
export function sanitizeForPrint(text: string | null | undefined): string {
  if (text == null || text === "") return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
    .trim();
}
