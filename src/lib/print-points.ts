import type { PrismaClient } from "@prisma/client";

export type PrintPointDTO = {
  key: string;
  label: string;
  authorizedUserIds: string[];
  sortOrder: number;
};

/**
 * Los 4 puntos de impresión son fijos (no se crean/borran puntos desde la UI).
 * Estos son los User ID de CodeREADr ya asignados hoy a cada uno — fuente
 * única de verdad: tanto el fallback del webhook (src/app/api/webhook/codereadr/route.ts)
 * como /configuraciones los leen de aquí, así nunca quedan desincronizados.
 */
export const DEFAULT_PRINT_POINTS: PrintPointDTO[] = [
  { key: "punto1", label: "Punto 1", authorizedUserIds: ["567189", "566374"], sortOrder: 0 },
  { key: "punto2", label: "Punto 2", authorizedUserIds: ["256045"], sortOrder: 1 },
  { key: "punto3", label: "Punto 3", authorizedUserIds: ["176281", "173272"], sortOrder: 2 },
  { key: "punto4", label: "Punto 4", authorizedUserIds: ["256044"], sortOrder: 3 },
];

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

/**
 * Devuelve siempre los 4 puntos fijos: para cada uno, la fila guardada en la
 * base de datos si existe, o su asignación por defecto (DEFAULT_PRINT_POINTS)
 * si esa expo todavía no la ha guardado. `provisioned: false` cuando la tabla
 * no existe todavía (no se corrió /api/setup-db) — informativo, no bloquea la
 * lectura porque de todas formas se devuelven los defaults.
 */
export async function getPrintPointsOrDefaults(
  prisma: PrismaClient
): Promise<{ points: PrintPointDTO[]; provisioned: boolean }> {
  let dbPoints: PrintPointDTO[] = [];
  let provisioned = true;
  try {
    dbPoints = await getPrintPoints(prisma);
  } catch {
    provisioned = false;
  }
  const byKey = new Map(dbPoints.map((p) => [p.key, p]));
  const points = DEFAULT_PRINT_POINTS.map((def) => byKey.get(def.key) ?? def);
  return { points, provisioned };
}
