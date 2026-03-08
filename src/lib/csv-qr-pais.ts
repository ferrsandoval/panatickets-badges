/**
 * Parsea una línea CSV con formato qr_content,pais (soporta comillas y comas dentro del QR).
 */
export function parseCsvLine(line: string): { qrContent: string; pais: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(",");
  if (parts.length < 2) return null;
  const pais = parts.pop()?.trim().replace(/^["']|["']$/g, "") ?? "";
  const qrContent = parts.join(",").trim().replace(/^["']|["']$/g, "");
  if (!qrContent || !pais) return null;
  return { qrContent, pais };
}

/**
 * Parsea texto CSV completo (cabecera qr_content,pais opcional) y devuelve filas.
 */
export function parseCsvText(text: string): { qrContent: string; pais: string }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0]?.toLowerCase();
  const dataLines =
    header?.includes("qr_content") && header?.includes("pais") ? lines.slice(1) : lines;
  const rows: { qrContent: string; pais: string }[] = [];
  for (const line of dataLines) {
    const row = parseCsvLine(line);
    if (row) rows.push(row);
  }
  return rows;
}
