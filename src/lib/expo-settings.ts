import type { PrismaClient } from "@prisma/client";

export type LabelFieldKey = "name" | "empresa" | "pais" | "telefono" | "email" | "expo";

export const ALL_LABEL_FIELDS: LabelFieldKey[] = ["name", "empresa", "pais", "telefono", "email", "expo"];

/** Reproduce el orden/selección fija que existía antes de que esto fuera configurable. */
export const DEFAULT_LABEL_FIELDS: LabelFieldKey[] = ["name", "empresa", "pais", "expo"];

const SINGLETON_ID = "singleton";

export type ExpoSettingsDTO = {
  expoName: string | null;
  printQr: boolean;
  labelFields: LabelFieldKey[];
};

const DEFAULT_SETTINGS: ExpoSettingsDTO = {
  expoName: null,
  printQr: true,
  labelFields: DEFAULT_LABEL_FIELDS,
};

export function parseLabelFields(raw: string | null | undefined): LabelFieldKey[] {
  if (!raw) return DEFAULT_LABEL_FIELDS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_LABEL_FIELDS;
    const filtered = parsed.filter((f): f is LabelFieldKey => ALL_LABEL_FIELDS.includes(f));
    return filtered.length > 0 ? filtered : DEFAULT_LABEL_FIELDS;
  } catch {
    return DEFAULT_LABEL_FIELDS;
  }
}

/** Nunca lanza: si la tabla no existe todavía (no se corrió /api/setup-db), devuelve los defaults. */
export async function getExpoSettings(prisma: PrismaClient): Promise<ExpoSettingsDTO> {
  try {
    const row = await prisma.expoSettings.findUnique({ where: { id: SINGLETON_ID } });
    if (!row) return DEFAULT_SETTINGS;
    return {
      expoName: row.expoName,
      printQr: row.printQr,
      labelFields: parseLabelFields(row.labelFields),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function upsertExpoSettings(
  prisma: PrismaClient,
  patch: Partial<ExpoSettingsDTO>
): Promise<ExpoSettingsDTO> {
  const data = {
    ...(patch.expoName !== undefined && { expoName: patch.expoName }),
    ...(patch.printQr !== undefined && { printQr: patch.printQr }),
    ...(patch.labelFields !== undefined && { labelFields: JSON.stringify(patch.labelFields) }),
  };
  const row = await prisma.expoSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  });
  return {
    expoName: row.expoName,
    printQr: row.printQr,
    labelFields: parseLabelFields(row.labelFields),
  };
}
