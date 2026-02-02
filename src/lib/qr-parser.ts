import { createHash } from "crypto";

/**
 * Extrae el nombre del texto del QR.
 * Acepta: "Name: X", "Nombre: X", "Nombre='X'", "Nombre=\"X\"", formato con pipes.
 */
export function parseNameFromQrText(qrText: string): string | null {
  if (!qrText || typeof qrText !== "string") return null;
  const s = qrText.trim();

  // Nombre: ... o Name: ... (con o sin dos puntos)
  let match = s.match(/^\s*(?:Name|Nombre)\s*:\s*(.+)$/im);
  if (match) return match[1].trim();

  // Nombre='...' o Nombre="..." (formato con comillas, típico en display CodeREADr)
  match = s.match(/(?:Name|Nombre)\s*=\s*['"]([^'"]+)['"]/i);
  if (match) return match[1].trim();

  // Nombre=valor (hasta pipe | o fin de línea)
  match = s.match(/(?:Name|Nombre)\s*=\s*([^|'\n]+)/i);
  if (match) return match[1].trim();

  // Fallback: buscar por segmentos Nombre='...'|...
  const bySegment = findKeyValue(s, ["Nombre", "Name"]);
  if (bySegment) return bySegment;

  return null;
}

/**
 * Busca un par clave=valor en el texto; devuelve el valor si la clave coincide (case-insensitive).
 */
function findKeyValue(qrText: string, keys: string[]): string | null {
  if (!qrText || typeof qrText !== "string") return null;
  const s = qrText.trim();
  const parts = s.split("|");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!keys.some((k) => key.toLowerCase() === k.toLowerCase())) continue;
    const quoted = value.match(/^['"]([^'"]*)['"]$/);
    if (quoted) return quoted[1].trim();
    if (value) return value.trim();
  }
  return null;
}

/**
 * Extrae un campo del texto del QR por claves posibles.
 * Acepta: "Key: X", "Key='X'", "Key=\"X\"", Key=valor|...
 */
function parseFieldFromQrText(qrText: string, keys: string[]): string | null {
  if (!qrText || typeof qrText !== "string") return null;
  const s = qrText.trim();
  const keysEsc = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

  let match = s.match(new RegExp(`^\\s*(?:${keysEsc})\\s*:\\s*(.+)$`, "im"));
  if (match) return match[1].trim();

  match = s.match(new RegExp(`(?:${keysEsc})\\s*=\\s*['"]([^'"]*)['"]`, "i"));
  if (match) return match[1].trim();

  match = s.match(new RegExp(`(?:${keysEsc})\\s*=\\s*([^|'\\n]*)`, "i"));
  if (match) return match[1].trim();

  return findKeyValue(s, keys);
}

export function parseEmpresaFromQrText(qrText: string): string | null {
  return parseFieldFromQrText(qrText, ["Empresa", "Company"]);
}

export function parsePaisFromQrText(qrText: string): string | null {
  return parseFieldFromQrText(qrText, ["País", "Pais", "Country"]);
}

export function parseFeriaFromQrText(qrText: string): string | null {
  return parseFieldFromQrText(qrText, ["Feria", "Event"]);
}

export function parseTelefonoFromQrText(qrText: string): string | null {
  return parseFieldFromQrText(qrText, ["Teléfono", "Telefono", "Celular", "Phone", "Tel"]);
}

export function parseEmailFromQrText(qrText: string): string | null {
  return parseFieldFromQrText(qrText, ["Email", "Correo", "E-mail"]);
}

/**
 * Hash del contenido para deduplicación cuando no hay scan_id.
 */
export function contentHash(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex");
}
