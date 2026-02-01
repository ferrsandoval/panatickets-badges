import { createHash } from "crypto";

/**
 * Extrae el valor de "Name:" del texto multilínea del QR.
 */
export function parseNameFromQrText(qrText: string): string | null {
  if (!qrText || typeof qrText !== "string") return null;
  const match = qrText.match(/^\s*Name:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Hash del contenido para deduplicación cuando no hay scan_id.
 */
export function contentHash(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex");
}
