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

const MAX_LOOKUP_ROWS = 15000;

/** Normaliza para comparar: trim, minúsculas, espacios colapsados, sin \r. */
function normalizeForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Obtiene el país desde qr_country_lookup: carga la tabla y compara en código
 * con la misma normalización, para garantizar el match aunque haya diferencias de formato.
 */
export async function findPaisFromLookup(
  prisma: PrismaClient,
  candidates: string[]
): Promise<string | null> {
  if (!candidates.length) return null;
  let rows: { qrContent: string; pais: string }[];
  try {
    rows = await prisma.qrCountryLookup.findMany({
      take: MAX_LOOKUP_ROWS,
      select: { qrContent: true, pais: true },
    });
  } catch {
    return null;
  }
  if (!rows.length) return null;

  const normalizedCandidates = Array.from(
    new Set(candidates.map(normalizeForMatch).filter(Boolean))
  );
  const lookupByNormalized = new Map<string, string>();
  for (const row of rows) {
    const key = normalizeForMatch(row.qrContent);
    if (key && !lookupByNormalized.has(key)) lookupByNormalized.set(key, row.pais);
  }

  for (const nc of normalizedCandidates) {
    const pais = lookupByNormalized.get(nc);
    if (pais) return pais;
  }

  for (const nc of normalizedCandidates) {
    for (const [tableKey, pais] of lookupByNormalized) {
      if (nc.length >= 10 && tableKey.length >= 10 && (nc.includes(tableKey) || tableKey.includes(nc)))
        return pais;
    }
  }
  return null;
}
