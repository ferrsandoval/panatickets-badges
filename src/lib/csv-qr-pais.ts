/**
 * Parsea CSV para qr_country_lookup.
 * Dos formatos:
 * - Expos normales (invitados): qr_content,pais (2 columnas). Se mantiene igual.
 * - Expos EXPOSITORES: QR Content,País,Empresa (3 columnas: col1=QR Content, col2=País, col3=Empresa).
 */

export type CsvQrPaisRow = { qrContent: string; pais: string; empresa?: string | null };

/**
 * Parsea una línea CSV.
 * hasEmpresa: si true, formato EXPOSITORES con 3 columnas (QR Content, País, Empresa); si false, 2 columnas (qr_content, pais).
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
    // Orden CSV expositores: col1=QR Content, col2=País, col3=Empresa
    const empresa = parts.pop()?.trim().replace(/^["']|["']$/g, "") ?? "";
    const pais = parts.pop()?.trim().replace(/^["']|["']$/g, "") ?? "";
    const qrContent = parts.join(",").trim().replace(/^["']|["']$/g, "");
    if (!qrContent) return null;
    return { qrContent, pais, empresa: empresa || null };
  }
  // Formato invitados: qr_content,pais (2 columnas)
  if (parts.length < 2) return null;
  const pais = parts.pop()?.trim().replace(/^["']|["']$/g, "") ?? "";
  const qrContent = parts.join(",").trim().replace(/^["']|["']$/g, "");
  if (!qrContent || !pais) return null;
  return { qrContent, pais };
}

/**
 * Detecta si la cabecera indica formato 3 columnas EXPOSITORES (QR Content, País, Empresa).
 */
function detectEmpresaHeader(header: string): boolean {
  const h = header.toLowerCase();
  return (h.includes("qr_content") || h.includes("qr content")) && h.includes("empresa") && h.includes("pais");
}

/**
 * Parsea texto CSV completo.
 * Invitados: cabecera qr_content,pais (2 columnas).
 * Expositores: cabecera QR Content,País,Empresa (3 columnas, en ese orden).
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
