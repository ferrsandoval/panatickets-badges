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
    const rows = await prisma.qrCountryLookup.findMany({
      orderBy: { qrContent: "asc" },
      take: limit,
      select: { qrContent: true, pais: true },
    });
    return NextResponse.json({
      project,
      qrLookup: rows.map((r) => ({ qrContent: r.qrContent, pais: r.pais })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Error al leer la tabla QR → país", detail: message, project },
      { status: 500 }
    );
  }
}
