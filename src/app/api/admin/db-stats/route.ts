import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";

/**
 * GET /api/admin/db-stats?project=expo_logistica_2026
 * Devuelve estadísticas y contenido reciente de la base de datos de esa expo.
 */
export async function GET(req: NextRequest) {
  const project = req.nextUrl.searchParams.get("project")?.trim();
  if (!project) {
    return NextResponse.json(
      { error: "Falta project", detail: "Añade ?project=expo_logistica_2026 (o otra expo)." },
      { status: 400 }
    );
  }

  try {
    const prisma = getPrismaForProject(project);

    const [printJobsTotal, printJobsPending, qrCountryLookupCount, recentJobs] = await Promise.all([
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
    ]);

    return NextResponse.json({
      project,
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
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Error al conectar con la base de datos", detail: message, project },
      { status: 500 }
    );
  }
}
