import type { PrismaClient } from "@prisma/client";

export type TicketLookupRow = {
  qrContent: string;
  nombre: string;
  categoria?: string | null;
  tipoBoleto?: string | null;
};

/**
 * Busca un boleto por coincidencia exacta del código de barras (QR).
 * A diferencia de qr_country_lookup, el QR aquí es un ID opaco (no texto
 * Nombre=...), así que no hace falta la normalización por candidatos.
 */
export async function findTicketByQrContent(
  prisma: PrismaClient,
  qrContent: string
): Promise<TicketLookupRow | null> {
  const trimmed = qrContent.trim();
  if (!trimmed) return null;
  try {
    const row = await prisma.ticketLookup.findUnique({
      where: { qrContent: trimmed },
      select: { qrContent: true, nombre: true, categoria: true, tipoBoleto: true },
    });
    return row;
  } catch {
    return null;
  }
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
    // Salta la fila de cabecera si el archivo la trae (Column1;Column2;...).
    if (/^column1$/i.test(qrContent)) continue;
    rows.push({ qrContent, nombre, categoria, tipoBoleto });
  }
  return rows;
}
