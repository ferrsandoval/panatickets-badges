import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";

/**
 * GET /api/admin/qr-lookup?project=expo_logistica_2026
 * Devuelve solo la tabla qr_country_lookup (qr_content, pais) de esa base.
 */
export async function GET(req: NextRequest) {
  const project = req.nextUrl.searchParams.get("project")?.trim();
  const limit = Math.min(10000, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "5000", 10) || 5000));

  if (!project) {
    return NextResponse.json(
      { error: "Falta project", detail: "Añade ?project=expo_logistica_2026 (u otra expo)." },
      { status: 400 }
    );
  }

  try {
    const prisma = getPrismaForProject(project);
    try {
      const rows = await prisma.qrCountryLookup.findMany({
        orderBy: { qrContent: "asc" },
        take: limit,
        select: { qrContent: true, pais: true, empresa: true },
      });
      return NextResponse.json({
        project,
        qrLookup: rows.map((r) => ({ qrContent: r.qrContent, pais: r.pais, empresa: r.empresa ?? undefined })),
      });
    } catch (queryErr) {
      const msg = queryErr instanceof Error ? queryErr.message : String(queryErr);
      const maybeMissingColumn = /column.*empresa|empresa.*does not exist|does not exist.*empresa/i.test(msg);
      if (maybeMissingColumn) {
        const safeLimit = Math.min(10000, Math.max(1, Number(limit)));
        const raw = await prisma.$queryRawUnsafe<Array<{ qr_content: string; pais: string }>>(
          `SELECT qr_content, pais FROM qr_country_lookup ORDER BY qr_content ASC LIMIT ${safeLimit}`
        );
        return NextResponse.json({
          project,
          qrLookup: raw.map((r) => ({ qrContent: r.qr_content, pais: r.pais, empresa: undefined })),
        });
      }
      throw queryErr;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Error al leer la tabla QR → país", detail: message, project },
      { status: 500 }
    );
  }
}
