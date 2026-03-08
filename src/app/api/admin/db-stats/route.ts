import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";

const MISSING_ENV_PATTERN = /no se encontró una variable de entorno válida/i;

/**
 * GET /api/admin/db-stats?project=expo_logistica_2026
 * Devuelve estadísticas y contenido reciente de la base de datos de esa expo.
 * Si no existe DATABASE_URL_<EXPO> para esa expo, usa la base por defecto (DATABASE_URL) y devuelve usingDefaultDatabase.
 */
export async function GET(req: NextRequest) {
  const project = req.nextUrl.searchParams.get("project")?.trim();
  if (!project) {
    return NextResponse.json(
      { error: "Falta project", detail: "Añade ?project=expo_logistica_2026 (o otra expo)." },
      { status: 400 }
    );
  }

  let prisma;
  let usingDefaultDatabase = false;
  try {
    prisma = getPrismaForProject(project);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (MISSING_ENV_PATTERN.test(message)) {
      try {
        prisma = getPrismaForProject(null);
        usingDefaultDatabase = true;
      } catch (e2) {
        return NextResponse.json(
          { error: "Error al conectar", detail: e2 instanceof Error ? e2.message : String(e2), project },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Error al conectar con la base de datos", detail: message, project },
        { status: 500 }
      );
    }
  }

  try {

    const [printJobsTotal, printJobsPending, qrCountryLookupCount, recentJobs, qrCountryLookupRows] =
      await Promise.all([
        prisma.printJob.count(),
        prisma.printJob.count({ where: { printedAt: null } }),
        prisma.qrCountryLookup.count().catch(() => 0),
        prisma.printJob.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            name: true,
            empresa: true,
            pais: true,
            createdAt: true,
            printedAt: true,
          },
        }),
        prisma.qrCountryLookup.findMany({
          orderBy: { qrContent: "asc" },
          take: 5000,
          select: { qrContent: true, pais: true },
        }).catch(() => []),
      ]);

    return NextResponse.json({
      project,
      usingDefaultDatabase,
      printJobsTotal,
      printJobsPending,
      qrCountryLookupCount,
      recentJobs: recentJobs.map((j) => ({
        id: j.id,
        name: j.name,
        empresa: j.empresa ?? null,
        pais: j.pais ?? null,
        createdAt: j.createdAt.toISOString(),
        printedAt: j.printedAt?.toISOString() ?? null,
      })),
      qrCountryLookup: qrCountryLookupRows.map((r) => ({ qrContent: r.qrContent, pais: r.pais })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Error al conectar con la base de datos", detail: message, project },
      { status: 500 }
    );
  }
}
