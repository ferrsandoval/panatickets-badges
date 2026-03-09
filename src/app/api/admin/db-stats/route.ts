import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";
import {
  extractQrTextFromPayload,
  qrLookupCandidates,
  findPaisFromLookup,
} from "@/lib/qr-lookup";

const MISSING_ENV_PATTERN = /no se encontró una variable de entorno válida/i;

/**
 * GET /api/admin/db-stats?project=expo_logistica_2026
 * Devuelve estadísticas y contenido reciente de la base de datos de esa expo.
 * Si no existe DATABASE_URL_<EXPO> para esa expo, usa la base por defecto (DATABASE_URL) y devuelve usingDefaultDatabase.
 */
export async function GET(req: NextRequest) {
  const project = req.nextUrl.searchParams.get("project")?.trim();
  const onlyPrinted = req.nextUrl.searchParams.get("printed") === "true";
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

    const [printJobsTotal, printJobsPending, qrCountryLookupCount, recentJobsRaw, qrCountryLookupRows] =
      await Promise.all([
        prisma.printJob.count(),
        prisma.printJob.count({ where: { printedAt: null } }),
        prisma.qrCountryLookup.count().catch(() => 0),
        prisma.printJob.findMany({
          where: onlyPrinted ? { printedAt: { not: null } } : undefined,
          orderBy: [{ printedAt: "desc" }, { createdAt: "desc" }],
          take: 50,
          select: {
            id: true,
            name: true,
            empresa: true,
            pais: true,
            rawPayload: true,
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

    // País se obtiene siempre de la tabla qr_country_lookup (comparando con el contenido del QR)
    const recentJobs = await Promise.all(
      recentJobsRaw.map(async (j) => {
        const candidates = qrLookupCandidates(
          extractQrTextFromPayload(j.rawPayload),
          j.rawPayload ?? undefined
        );
        const paisFromLookup = await findPaisFromLookup(prisma, candidates);
        const pais = paisFromLookup ?? j.pais ?? null;
        return {
          id: j.id,
          name: j.name,
          empresa: j.empresa ?? null,
          pais,
          createdAt: j.createdAt.toISOString(),
          printedAt: j.printedAt?.toISOString() ?? null,
        };
      })
    );

    return NextResponse.json({
      project,
      usingDefaultDatabase,
      onlyPrinted,
      printJobsTotal,
      printJobsPending,
      qrCountryLookupCount,
      recentJobs,
      qrCountryLookup: qrCountryLookupRows.map((r) => ({ qrContent: r.qrContent, pais: r.pais })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const isConnectionError = /can't reach database|db\.prisma\.io|connection refused|ECONNREFUSED|ETIMEDOUT|network|unreachable/i.test(message);
    const hint = isConnectionError
      ? " Comprueba que la URL (DATABASE_URL o DATABASE_URL_EXPO_...) sea correcta, que el servidor esté en marcha y que sea accesible desde donde se ejecuta la app (Vercel, local, etc.). Si usas Prisma Postgres, verifica en console.prisma.io que la base no esté pausada."
      : "";
    return NextResponse.json(
      {
        error: "Error al conectar con la base de datos",
        detail: message + hint,
        project,
      },
      { status: 500 }
    );
  }
}
