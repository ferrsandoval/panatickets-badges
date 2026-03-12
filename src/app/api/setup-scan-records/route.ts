import { NextRequest, NextResponse } from "next/server";
import { getPrismaForScanStats } from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * GET /api/setup-scan-records?token=WEBHOOK_SECRET
 * Crea la tabla scan_records en la base de expo_tech_2026 (o SCAN_STATS_PROJECT).
 * Ejecutar una vez antes de subir el CSV de estadísticas.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = getPrismaForScanStats();
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "scan_records" (
        "id" TEXT NOT NULL,
        "can_id" TEXT,
        "fecha_escaneo" TEXT,
        "hora_escaneo" TEXT,
        "dia_semana" TEXT,
        "mes" TEXT,
        "timestamp_completo" TEXT,
        "expo" TEXT,
        "service_name" TEXT,
        "persona_nombre" TEXT,
        "persona_compania" TEXT,
        "persona_email" TEXT,
        "persona_telefono" TEXT,
        "persona_celular" TEXT,
        "escaneado_por_usuario" TEXT,
        "escaneado_por_user_id" TEXT,
        "dispositivo" TEXT,
        "device_id" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "scan_records_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "scan_records_expo_idx" ON "scan_records"("expo");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "scan_records_persona_idx" ON "scan_records"("persona_nombre", "persona_compania", "persona_email");
    `);

    return NextResponse.json({
      ok: true,
      message: "Tabla scan_records creada (en la base de expo_tech_2026 o SCAN_STATS_PROJECT).",
    });
  } catch (e) {
    console.error("setup-scan-records error", e);
    return NextResponse.json(
      { error: "Error al crear tabla", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
