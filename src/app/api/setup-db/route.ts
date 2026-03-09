import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * GET /api/setup-db?token=WEBHOOK_SECRET&project=expo_logistica_2026
 * Crea print_jobs y qr_country_lookup en la base de ese proyecto (expo).
 * Obligatorio: project = key de la expo. Llama una vez por cada expo.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = req.nextUrl.searchParams.get("project")?.trim();
  if (!project) {
    return NextResponse.json(
      {
        error: "Falta project",
        detail: "Añade ?project=expo_logistica_2026 (o expo_turismo_2026, expo_comer_2026, expo_tech_2026, expo_electronica_2026, expo_*_expositores_2026).",
      },
      { status: 400 }
    );
  }

  try {
    const prisma = getPrismaForProject(project);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "print_jobs" (
        "id" TEXT NOT NULL,
        "scan_id" TEXT,
        "content_hash" TEXT,
        "name" TEXT NOT NULL,
        "point" TEXT,
        "raw_payload" TEXT,
        "printed_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "print_jobs_scan_id_key" ON "print_jobs"("scan_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "print_jobs_content_hash_key" ON "print_jobs"("content_hash");
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "point" TEXT;`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "print_jobs_point_printed_at_created_at_idx" ON "print_jobs"("point", "printed_at", "created_at");
    `);

    await prisma.$executeRawUnsafe(`ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "empresa" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "pais" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "feria" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "telefono" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "email" TEXT;`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "qr_country_lookup" (
        "id" TEXT NOT NULL,
        "qr_content" TEXT NOT NULL,
        "pais" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "qr_country_lookup_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "qr_country_lookup_qr_content_key" ON "qr_country_lookup"("qr_content");
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "qr_country_lookup" ADD COLUMN IF NOT EXISTS "empresa" TEXT;`);

    return NextResponse.json({
      ok: true,
      message: `Tablas print_jobs y qr_country_lookup creadas/actualizadas para el proyecto "${project}".`,
      project,
    });
  } catch (e) {
    console.error("setup-db error", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
