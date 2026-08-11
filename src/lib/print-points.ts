import type { PrismaClient } from "@prisma/client";

export type PrintPointDTO = {
  key: string;
  label: string;
  authorizedUserIds: string[];
  sortOrder: number;
};

function parseUserIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * A diferencia de getExpoSettings, esta función SÍ puede lanzar si la tabla no
 * existe todavía — el llamador decide cómo distinguir "tabla no existe" de
 * "tabla vacía" (ver /api/admin/print-points).
 */
export async function getPrintPoints(prisma: PrismaClient): Promise<PrintPointDTO[]> {
  const rows = await prisma.printPoint.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  return rows.map((r) => ({
    key: r.key,
    label: r.label,
    authorizedUserIds: parseUserIds(r.authorizedUserIds),
    sortOrder: r.sortOrder,
  }));
}

export async function upsertPrintPoint(
  prisma: PrismaClient,
  input: { key: string; label: string; authorizedUserIds: string[]; sortOrder: number }
): Promise<PrintPointDTO> {
  const data = {
    label: input.label,
    authorizedUserIds: JSON.stringify(input.authorizedUserIds),
    sortOrder: input.sortOrder,
  };
  const row = await prisma.printPoint.upsert({
    where: { key: input.key },
    create: { key: input.key, ...data },
    update: data,
  });
  return {
    key: row.key,
    label: row.label,
    authorizedUserIds: parseUserIds(row.authorizedUserIds),
    sortOrder: row.sortOrder,
  };
}

export async function deletePrintPoint(prisma: PrismaClient, key: string): Promise<void> {
  await prisma.printPoint.delete({ where: { key } }).catch(() => {});
}
