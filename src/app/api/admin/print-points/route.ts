import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";
import { deletePrintPoint, getPrintPointsOrDefaults, upsertPrintPoint } from "@/lib/print-points";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * GET /api/admin/print-points?project=expo_logistica_2026
 * Lectura pública (sin token): la usan la home (nav de puntos), /configuraciones
 * y el webhook de CodeREADr para resolver el punto por User ID. Siempre
 * devuelve los 4 puntos fijos (ver DEFAULT_PRINT_POINTS), usando lo guardado
 * en la base si existe. `provisioned:false` es solo informativo (la tabla
 * print_points no existe todavía en esa expo).
 */
export async function GET(req: NextRequest) {
  const project = req.nextUrl.searchParams.get("project")?.trim() || undefined;
  const prisma = getPrismaForProject(project);
  const { points, provisioned } = await getPrintPointsOrDefaults(prisma);
  return NextResponse.json({ project: project ?? null, points, provisioned });
}

/**
 * POST /api/admin/print-points?project=expo_logistica_2026&token=WEBHOOK_SECRET
 * Body: { key: string; label: string; authorizedUserIds: string[]; sortOrder?: number }
 * Upsert por key (alta y edición en un mismo endpoint).
 */
export async function POST(req: NextRequest) {
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

  let body: { key?: string; label?: string; authorizedUserIds?: string[]; sortOrder?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const key = body.key?.trim();
  const label = body.label?.trim();
  if (!key || !label) {
    return NextResponse.json({ error: "Faltan campos", detail: "key y label son obligatorios." }, { status: 400 });
  }

  try {
    const prisma = getPrismaForProject(project);
    const point = await upsertPrintPoint(prisma, {
      key,
      label,
      authorizedUserIds: (body.authorizedUserIds ?? []).map((v) => v.trim()).filter(Boolean),
      sortOrder: body.sortOrder ?? 0,
    });
    return NextResponse.json({ ok: true, project, point });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "Error al guardar",
        detail: `${message} Si la tabla no existe, ejecuta GET /api/setup-db?token=...&project=${project} primero.`,
        project,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/print-points?project=expo_logistica_2026&token=WEBHOOK_SECRET&key=punto1
 */
export async function DELETE(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = req.nextUrl.searchParams.get("project")?.trim();
  const key = req.nextUrl.searchParams.get("key")?.trim();
  if (!project || !key) {
    return NextResponse.json({ error: "Faltan parámetros", detail: "Añade ?project=...&key=..." }, { status: 400 });
  }

  try {
    const prisma = getPrismaForProject(project);
    await deletePrintPoint(prisma, key);
    return NextResponse.json({ ok: true, project, key });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Error al borrar", detail: message, project }, { status: 500 });
  }
}
