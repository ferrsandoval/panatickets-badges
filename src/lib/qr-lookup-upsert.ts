import type { PrismaClient } from "@prisma/client";

export type QrLookupRow = { qrContent: string; pais: string; empresa?: string | null };

function isEmpresaColumnError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /column.*empresa|empresa.*does not exist/i.test(msg);
}

function escapeSql(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

/**
 * Inserta/actualiza filas en qr_country_lookup.
 * Si la base no tiene columna empresa, hace fallback a raw SQL con solo qr_content y pais.
 * @returns true si se usó el fallback (sin empresa).
 */
export async function upsertQrLookupRows(prisma: PrismaClient, rows: QrLookupRow[]): Promise<boolean> {
  try {
    for (const { qrContent, pais, empresa } of rows) {
      const normalized = qrContent.trim();
      if (!normalized) continue;
      const empresaVal = empresa != null && empresa !== "" ? empresa.trim() : null;
      await prisma.qrCountryLookup.upsert({
        where: { qrContent: normalized },
        create: { qrContent: normalized, pais: pais.trim(), empresa: empresaVal },
        update: { pais: pais.trim(), empresa: empresaVal },
      });
    }
    return false;
  } catch (e) {
    if (!isEmpresaColumnError(e)) throw e;
    for (const { qrContent, pais } of rows) {
      const normalized = qrContent.trim();
      if (!normalized) continue;
      const q = escapeSql(normalized);
      const p = escapeSql(pais.trim());
      await prisma.$executeRawUnsafe(
        `INSERT INTO qr_country_lookup (id, qr_content, pais, created_at) VALUES (gen_random_uuid()::text, '${q}', '${p}', NOW()) ON CONFLICT (qr_content) DO UPDATE SET pais = EXCLUDED.pais`
      );
    }
    return true;
  }
}
