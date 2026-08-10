import type { PrismaClient } from "@prisma/client";

export type TicketLookupRow = {
  qrContent: string;
  nombre: string;
  categoria?: string | null;
  tipoBoleto?: string | null;
  telefono?: string | null;
  email?: string | null;
};

const MAX_TICKET_ROWS = 5000;

/** Quita ceros a la izquierda (pero conserva al menos un dígito). */
function stripLeadingZeros(s: string): string {
  return s.replace(/^0+(?=\d)/, "");
}

/**
 * Busca un boleto por el código de barras (QR).
 * Los códigos de esta base empiezan todos con cero, y algunos sistemas
 * (Excel, el propio CodeREADr, el escáner) tratan el barcode como número y
 * recortan esos ceros a la izquierda. Se intenta primero coincidencia
 * exacta; si falla, se compara ignorando ceros a la izquierda en ambos lados.
 */
export async function findTicketByQrContent(
  prisma: PrismaClient,
  qrContent: string
): Promise<TicketLookupRow | null> {
  const trimmed = qrContent.trim();
  if (!trimmed) return null;

  const select = {
    qrContent: true,
    nombre: true,
    categoria: true,
    tipoBoleto: true,
    telefono: true,
    email: true,
  } as const;

  try {
    const exact = await prisma.ticketLookup.findUnique({
      where: { qrContent: trimmed },
      select,
    });
    if (exact) return exact;
  } catch {
    return null;
  }

  try {
    const normalizedInput = stripLeadingZeros(trimmed);
    const rows = await prisma.ticketLookup.findMany({
      select,
      take: MAX_TICKET_ROWS,
    });
    for (const row of rows) {
      if (stripLeadingZeros(row.qrContent.trim()) === normalizedInput) return row;
    }
  } catch {
    return null;
  }
  return null;
}

/** Inserta/actualiza filas en ticket_lookup. */
export async function upsertTicketLookupRows(
  prisma: PrismaClient,
  rows: TicketLookupRow[]
): Promise<void> {
  for (const { qrContent, nombre, categoria, tipoBoleto, telefono, email } of rows) {
    const normalized = qrContent.trim();
    if (!normalized || !nombre.trim()) continue;
    await prisma.ticketLookup.upsert({
      where: { qrContent: normalized },
      create: {
        qrContent: normalized,
        nombre: nombre.trim(),
        categoria: categoria?.trim() || null,
        tipoBoleto: tipoBoleto?.trim() || null,
        telefono: telefono?.trim() || null,
        email: email?.trim() || null,
      },
      update: {
        nombre: nombre.trim(),
        categoria: categoria?.trim() || null,
        tipoBoleto: tipoBoleto?.trim() || null,
        telefono: telefono?.trim() || null,
        email: email?.trim() || null,
      },
    });
  }
}

type TicketField = "qrContent" | "nombre" | "categoria" | "telefono" | "email" | "tipoBoleto";

/** Alias de cabecera reconocidos (sin tildes, en minúsculas) -> campo interno. */
const HEADER_FIELD_BY_ALIAS: Record<string, TicketField> = {
  qr: "qrContent",
  "qr content": "qrContent",
  barcode: "qrContent",
  codigo: "qrContent",
  nombre: "nombre",
  name: "nombre",
  empresa: "categoria",
  categoria: "categoria",
  telefono: "telefono",
  celular: "telefono",
  mail: "email",
  email: "email",
  correo: "email",
  tipoboleto: "tipoBoleto",
  "tipo de boleto": "tipoBoleto",
  "tipo boleto": "tipoBoleto",
};

function normalizeHeaderCell(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Si la primera línea es una cabecera reconocible (trae QR y Nombre), devuelve el mapeo columna -> campo. */
function detectHeaderMapping(headerLine: string, delimiter: string): Array<TicketField | null> | null {
  const cells = headerLine.split(delimiter).map(normalizeHeaderCell);
  const mapping = cells.map((c) => HEADER_FIELD_BY_ALIAS[c] ?? null);
  if (!mapping.includes("qrContent") || !mapping.includes("nombre")) return null;
  return mapping;
}

/**
 * Parsea el CSV de boletos. Dos formatos soportados:
 * - Simple, con cabecera (cualquier orden de columnas): ej. "QR,Nombre,Empresa,Telefono,Mail".
 *   Delimitador se detecta solo (coma si la línea trae comas, si no punto y coma).
 * - Legado, sin cabecera fiable: 12 columnas separadas por ";". Solo usa columna 1
 *   (QR/barcode), 2 (nombre), 3 (categoría) y 10 (tipo de boleto); el resto se ignora.
 */
export function parseTicketCsvText(text: string): TicketLookupRow[] {
  const lines = text
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes(",") ? "," : ";";
  const mapping = detectHeaderMapping(lines[0], delimiter);

  if (mapping) {
    const rows: TicketLookupRow[] = [];
    for (const line of lines.slice(1)) {
      const parts = line.split(delimiter);
      const values: Partial<Record<TicketField, string>> = {};
      mapping.forEach((field, i) => {
        if (!field) return;
        const value = parts[i]?.trim();
        if (value) values[field] = value;
      });
      if (!values.qrContent || !values.nombre) continue;
      rows.push({
        qrContent: values.qrContent,
        nombre: values.nombre,
        categoria: values.categoria ?? null,
        tipoBoleto: values.tipoBoleto ?? null,
        telefono: values.telefono ?? null,
        email: values.email ?? null,
      });
    }
    return rows;
  }

  // Formato legado: 12 columnas, separador ";", sin cabecera fiable.
  const rows: TicketLookupRow[] = [];
  for (const line of lines) {
    const parts = line.split(";");
    if (parts.length < 10) continue;
    const qrContent = parts[0]?.trim();
    const nombre = parts[1]?.trim();
    const categoria = parts[2]?.trim();
    const tipoBoleto = parts[9]?.trim();
    if (!qrContent || !nombre) continue;
    // Salta la fila de cabecera, sea cual sea el nombre de columna usado
    // (Column1/ID_Barcode/etc.): se detecta porque "nombre" es literalmente
    // la palabra "Nombre" (nunca sería el valor real de una persona).
    if (/^nombre$/i.test(nombre)) continue;
    rows.push({ qrContent, nombre, categoria, tipoBoleto });
  }
  return rows;
}
