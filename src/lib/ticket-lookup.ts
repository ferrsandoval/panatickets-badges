import type { PrismaClient } from "@prisma/client";

export type TicketLookupRow = {
  qrContent: string;
  nombre: string;
  categoria?: string | null;
  tipoBoleto?: string | null;
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

  try {
    const exact = await prisma.ticketLookup.findUnique({
      where: { qrContent: trimmed },
      select: { qrContent: true, nombre: true, categoria: true, tipoBoleto: true },
    });
    if (exact) return exact;
  } catch {
    return null;
  }

  try {
    const normalizedInput = stripLeadingZeros(trimmed);
    const rows = await prisma.ticketLookup.findMany({
      select: { qrContent: true, nombre: true, categoria: true, tipoBoleto: true },
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
  for (const { qrContent, nombre, categoria, tipoBoleto } of rows) {
    const normalized = qrContent.trim();
    if (!normalized || !nombre.trim()) continue;
    await prisma.ticketLookup.upsert({
      where: { qrContent: normalized },
      create: {
        qrContent: normalized,
        nombre: nombre.trim(),
        categoria: categoria?.trim() || null,
        tipoBoleto: tipoBoleto?.trim() || null,
      },
      update: {
        nombre: nombre.trim(),
        categoria: categoria?.trim() || null,
        tipoBoleto: tipoBoleto?.trim() || null,
      },
    });
  }
}

/**
 * Parsea el CSV de venta de boletos (12 columnas, separador ; o CR/LF/CRLF
 * como salto de fila). Solo usa columna 1 (QR/barcode), 2 (nombre) y 3
 * (categoría) y 10 (tipo de boleto) — el resto se ignora.
 */
export function parseTicketCsvText(text: string): TicketLookupRow[] {
  const lines = text
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter(Boolean);

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
