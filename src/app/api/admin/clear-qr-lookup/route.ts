import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * DELETE /api/admin/clear-qr-lookup?token=WEBHOOK_SECRET&project=expo_logistica_2026
 * Borra todas las filas de qr_country_lookup de la base del proyecto indicado.
 */
export async function DELETE(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = req.nextUrl.searchParams.get("project")?.trim();
  if (!project) {
    return NextResponse.json(
      { error: "Falta project", detail: "Añade ?project=expo_logistica_2026 (u otra expo)." },
      { status: 400 }
    );
  }

  try {
    const prisma = getPrismaForProject(project);
    const result = await prisma.qrCountryLookup.deleteMany({});
    return NextResponse.json({
      ok: true,
      message: `Se borraron ${result.count} filas de qr_country_lookup en "${project}".`,
      project,
      deleted: result.count,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Error al borrar", detail: message, project },
      { status: 500 }
    );
  }
}
