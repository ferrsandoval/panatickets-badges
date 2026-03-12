import { NextRequest, NextResponse } from "next/server";
import { getPrismaForScanStats } from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * DELETE /api/admin/clear-scan-records?token=WEBHOOK_SECRET
 * Elimina todos los registros de scan_records.
 */
export async function DELETE(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = getPrismaForScanStats();
    const result = await prisma.scanRecord.deleteMany({});
    return NextResponse.json({
      ok: true,
      message: `Eliminados ${result.count} registros de scan_records.`,
      count: result.count,
    });
  } catch (e) {
    console.error("clear-scan-records error", e);
    return NextResponse.json(
      { error: "Error al eliminar", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
