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

  return null;
}

/**
 * Hash del contenido para deduplicación cuando no hay scan_id.
 */
export function contentHash(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex");
}
