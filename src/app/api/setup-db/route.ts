import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * GET /api/setup-db?token=WEBHOOK_SECRET
 * Crea la tabla print_jobs en la base de datos (solo la primera vez).
 * Llama una vez y luego puedes ignorar o borrar esta ruta.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "print_jobs" (
        "id" TEXT NOT NULL,
        "scan_id" TEXT,
        "content_hash" TEXT,
        "name" TEXT NOT NULL,
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
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "print_jobs_printed_at_created_at_idx" ON "print_jobs"("printed_at", "created_at");
    `);

    return NextResponse.json({ ok: true, message: "Tabla print_jobs creada o ya existía." });
  } catch (e) {
    console.error("setup-db error", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
