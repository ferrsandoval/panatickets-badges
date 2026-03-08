import type { PrismaClient } from "@prisma/client";

/**
 * Quita el prefijo [point:xxx] del rawPayload para obtener el texto del QR.
 */
export function extractQrTextFromPayload(rawPayload: string | null | undefined): string {
  if (!rawPayload) return "";
  return rawPayload.replace(/^\[point:[^\]]+\]\s*/i, "");
}

/**
 * Genera variantes del texto QR para buscar en qr_country_lookup
 * (espacios, saltos de línea, normalización Unicode).
 */
export function qrLookupCandidates(qrText: string, rawPayload?: string | null): string[] {
  const t = qrText.trim();
  const candidates = new Set<string>();
  if (t) {
    candidates.add(t);
    const noCr = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    candidates.add(noCr);
    candidates.add(noCr.trim());
    const singleSpace = t.replace(/\s+/g, " ").trim();
    candidates.add(singleSpace);
    if (typeof String.prototype.normalize === "function") {
      candidates.add(t.normalize("NFC"));
      candidates.add(singleSpace.normalize("NFC"));
    }
  }
  if (rawPayload?.trim()) candidates.add(rawPayload.trim());
  const afterPrefix = rawPayload?.replace(/^\[point:[^\]]+\]\s*/i, "").trim();
  if (afterPrefix) candidates.add(afterPrefix);
  return Array.from(candidates);
}

/**
 * Busca el país en qr_country_lookup: primero coincidencia exacta,
 * luego por LOWER(TRIM(qr_content)) para ignorar mayúsculas y espacios.
 */
export async function findPaisFromLookup(
  prisma: PrismaClient,
  candidates: string[]
): Promise<string | null> {
  if (!candidates.length) return null;
  try {
    const exact = await prisma.qrCountryLookup.findFirst({
      where: { qrContent: { in: candidates } },
      select: { pais: true },
    });
    if (exact?.pais) return exact.pais;
  } catch {
    // tabla puede no existir
  }
  const normalized = Array.from(
    new Set(candidates.map((c) => c.toLowerCase().trim()).filter(Boolean))
  );
  for (const c of normalized) {
    try {
      const rows = await prisma.$queryRawUnsafe<{ pais: string }[]>(
        "SELECT pais FROM qr_country_lookup WHERE LOWER(TRIM(qr_content)) = $1 LIMIT 1",
        c
      );
      if (rows[0]?.pais) return rows[0].pais;
    } catch {
      continue;
    }
  }
  return null;
}
