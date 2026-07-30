import { NextRequest, NextResponse } from "next/server";
import { getPrismaForScanStats } from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * GET /api/setup-scan-records?token=WEBHOOK_SECRET
 * Crea la tabla scan_records (formato nuevo: Scan_ID, Fecha, Hora, Dia_Semana, Timestamp_Completo, EXPO, Tipo_Persona, Nombre, Empresa, Email, Telefono, Celular, Escaneo).
 * Si existe con esquema antiguo, se elimina y se recrea.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = getPrismaForScanStats();
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "scan_records" CASCADE`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "scan_records" (
        "id" TEXT NOT NULL,
        "scan_id" TEXT,
        "fecha" TEXT,
        "hora" TEXT,
        "dia_semana" TEXT,
        "timestamp_completo" TEXT,
        "expo" TEXT,
        "tipo_persona" TEXT,
        "nombre" TEXT,
        "empresa" TEXT,
        "email" TEXT,
        "telefono" TEXT,
        "celular" TEXT,
        "escaneo" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "scan_records_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX "scan_records_expo_idx" ON "scan_records"("expo")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX "scan_records_tipo_persona_idx" ON "scan_records"("tipo_persona")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX "scan_records_persona_idx" ON "scan_records"("nombre", "empresa", "email")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX "scan_records_fecha_idx" ON "scan_records"("fecha")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX "scan_records_hora_idx" ON "scan_records"("hora")`);

    return NextResponse.json({
      ok: true,
      message: "Tabla scan_records creada (esquema nuevo).",
    });
  } catch (e) {
    console.error("setup-scan-records error", e);
    return NextResponse.json(
      { error: "Error al crear tabla", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
