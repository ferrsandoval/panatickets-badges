import { NextResponse } from "next/server";
import { getPrismaForScanStats } from "@/lib/prisma";

/**
 * GET /api/admin/scan-stats-data
 * Devuelve todos los registros de scan_records para el BI.
 */
export async function GET() {
  try {
    const prisma = getPrismaForScanStats();
    const records = await prisma.scanRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 50000,
    });
    return NextResponse.json(records);
  } catch (e) {
    console.error("scan-stats-data error", e);
    return NextResponse.json(
      { error: "Error al cargar datos", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
