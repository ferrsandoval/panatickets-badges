/**
 * Parsea CSV para qr_country_lookup.
 * Dos formatos:
 * - Expos normales: qr_content,pais (2 columnas).
 * - Expos EXPOSITORES: QR Content,Empresa,País (3 columnas).
 */

export type CsvQrPaisRow = { qrContent: string; pais: string; empresa?: string | null };

/**
 * Parsea una línea CSV.
 * hasEmpresa: si true, se esperan 3 columnas (qr_content, empresa, pais); si false, 2 (qr_content, pais).
 */
export function parseCsvLine(
  line: string,
  hasEmpresa: boolean
): { qrContent: string; pais: string; empresa?: string | null } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(",");
  if (hasEmpresa) {
    if (parts.length < 3) return null;
    const pais = parts.pop()?.trim().replace(/^["']|["']$/g, "") ?? "";
    const empresa = parts.pop()?.trim().replace(/^["']|["']$/g, "") ?? "";
    const qrContent = parts.join(",").trim().replace(/^["']|["']$/g, "");
    if (!qrContent || !pais) return null;
    return { qrContent, empresa: empresa || null, pais };
  }
  if (parts.length < 2) return null;
  const pais = parts.pop()?.trim().replace(/^["']|["']$/g, "") ?? "";
  const qrContent = parts.join(",").trim().replace(/^["']|["']$/g, "");
  if (!qrContent || !pais) return null;
  return { qrContent, pais };
}

/**
 * Detecta si la cabecera indica formato 3 columnas (QR Content, Empresa, País).
 */
function detectEmpresaHeader(header: string): boolean {
  const h = header.toLowerCase();
  return (h.includes("qr_content") || h.includes("qr content")) && h.includes("empresa") && h.includes("pais");
}

/**
 * Parsea texto CSV completo.
 * Acepta cabecera qr_content,pais o qr_content,empresa,pais (o "QR Content,Empresa,País").
 */
export function parseCsvText(text: string): CsvQrPaisRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0]?.toLowerCase() ?? "";
  const hasHeader =
    (header.includes("qr_content") || header.includes("qr content")) && header.includes("pais");
  const hasEmpresa = detectEmpresaHeader(header);
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows: CsvQrPaisRow[] = [];
  for (const line of dataLines) {
    const row = parseCsvLine(line, hasEmpresa);
    if (row) rows.push(row);
  }
  return rows;
}
