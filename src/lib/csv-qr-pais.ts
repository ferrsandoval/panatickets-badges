/**
 * Parsea CSV para qr_country_lookup.
 * Dos formatos:
 * - Expos normales (invitados): qr_content,pais (2 columnas). Se mantiene igual.
 * - Expos EXPOSITORES: QR Content,País,Empresa (3 columnas: col1=QR Content, col2=País, col3=Empresa).
 */

export type CsvQrPaisRow = { qrContent: string; pais: string; empresa?: string | null };

/**
 * Detecta el delimitador. Usar ; solo si la línea no tiene comas (formato europeo).
 * El QR content puede tener ; (Empresa='';Nombre='...'), por eso si hay comas usamos coma.
 */
function detectDelimiter(line: string, minParts: number): "," | ";" {
  if (!line.includes(",") && line.split(";").length >= minParts) return ";";
  return ",";
}

/**
 * Parsea una línea CSV.
 * hasEmpresa: si true, formato EXPOSITORES con 3 columnas.
 * expositoresOrder: "pais_empresa" = col2=País, col3=Empresa. "empresa_pais" = col2=Empresa, col3=País.
 */
export function parseCsvLine(
  line: string,
  hasEmpresa: boolean,
  expositoresOrder: "pais_empresa" | "empresa_pais" = "pais_empresa",
  delimiter: "," | ";" = ","
): { qrContent: string; pais: string; empresa?: string | null } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(delimiter);
  if (hasEmpresa) {
    if (parts.length < 3) return null;
    const col3 = parts.pop()?.trim().replace(/^["']|["']$/g, "") ?? "";
    const col2 = parts.pop()?.trim().replace(/^["']|["']$/g, "") ?? "";
    const qrContent = parts.join(delimiter).trim().replace(/^["']|["']$/g, "");
    if (!qrContent) return null;
    const [pais, empresa] =
      expositoresOrder === "empresa_pais" ? [col3, col2] : [col2, col3];
    return { qrContent, pais, empresa: empresa || null };
  }
  // Formato invitados: qr_content,pais (2 columnas)
  if (parts.length < 2) return null;
  const pais = parts.pop()?.trim().replace(/^["']|["']$/g, "") ?? "";
  const qrContent = parts.join(delimiter).trim().replace(/^["']|["']$/g, "");
  if (!qrContent || !pais) return null;
  return { qrContent, pais };
}

/** Normaliza para comparar cabecera (quita tildes para "pais"/"país"). */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0301/g, "")
    .replace(/í/g, "i");
}

/**
 * Detecta si la cabecera indica formato 3 columnas EXPOSITORES (QR Content, País, Empresa).
 */
function detectEmpresaHeader(header: string): boolean {
  const h = normalizeHeader(header);
  return (h.includes("qr_content") || h.includes("qr content")) && h.includes("empresa") && h.includes("pais");
}

export type ParseCsvOptions = {
  /** Si "expositores", fuerza formato 3 columnas. Si "invitados", fuerza 2 columnas. Por defecto "auto". */
  format?: "auto" | "expositores" | "invitados";
  /** Solo para expositores. "pais_empresa" = col2=País, col3=Empresa. "empresa_pais" = col2=Empresa, col3=País. */
  expositoresColumnOrder?: "pais_empresa" | "empresa_pais";
};

/**
 * Parsea texto CSV completo.
 * Invitados y Expositores: no se verifica cabecera. Todas las líneas se tratan como datos.
 * Invitados: 2 columnas (QR Content, País). Expositores: 3 columnas (QR Content, País, Empresa).
 */
export function parseCsvText(text: string, options?: ParseCsvOptions): CsvQrPaisRow[] {
  const format = options?.format ?? "auto";
  const expositoresOrder = options?.expositoresColumnOrder ?? "pais_empresa";
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const hasEmpresa =
    format === "expositores" ? true : format === "invitados" ? false : detectEmpresaHeader(lines[0] ?? "");
  const dataLines =
    format === "expositores" || format === "invitados"
      ? lines
      : (() => {
          const headerNorm = normalizeHeader(lines[0] ?? "");
          const hasHeader =
            (headerNorm.includes("qr_content") || headerNorm.includes("qr content")) && headerNorm.includes("pais");
          return hasHeader ? lines.slice(1) : lines;
        })();
  const minParts = hasEmpresa ? 3 : 2;
  const firstLine = dataLines[0] ?? "";
  const delimiter = detectDelimiter(firstLine, minParts);

  const tryParse = (order: "pais_empresa" | "empresa_pais") => {
    const result: CsvQrPaisRow[] = [];
    for (const line of dataLines) {
      const row = parseCsvLine(line, hasEmpresa, order, delimiter);
      if (row) result.push(row);
    }
    return result;
  };

  if (hasEmpresa && expositoresOrder === "empresa_pais") {
    const withEmpresaPais = tryParse("empresa_pais");
    const withPaisEmpresa = tryParse("pais_empresa");
    const countValid = (r: CsvQrPaisRow[]) =>
      r.filter((x) => (x.pais ?? "").trim() && (x.empresa ?? "").trim()).length;
    return countValid(withEmpresaPais) >= countValid(withPaisEmpresa)
      ? withEmpresaPais
      : withPaisEmpresa;
  }

  return tryParse(expositoresOrder);
}
