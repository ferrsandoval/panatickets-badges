import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";
import { ALL_LABEL_FIELDS, getExpoSettings, upsertExpoSettings, type LabelFieldKey } from "@/lib/expo-settings";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * GET /api/admin/expo-settings?project=expo_logistica_2026
 * Lectura pública (sin token, como db-stats): la usa la etiqueta impresa para
 * saber nombre de expo, si imprimir QR y qué campos mostrar. Nunca falla: si
 * la tabla no existe todavía, devuelve los valores por defecto.
 */
export async function GET(req: NextRequest) {
  const project = req.nextUrl.searchParams.get("project")?.trim() || undefined;
  const prisma = getPrismaForProject(project);
  const settings = await getExpoSettings(prisma);
  return NextResponse.json({ project: project ?? null, ...settings });
}

/**
 * POST /api/admin/expo-settings?project=expo_logistica_2026&token=WEBHOOK_SECRET
 * Body: { expoName?: string | null; printQr?: boolean; labelFields?: string[] }
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

  let body: { expoName?: string | null; printQr?: boolean; labelFields?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.labelFields !== undefined) {
    const invalid = body.labelFields.filter((f) => !ALL_LABEL_FIELDS.includes(f as LabelFieldKey));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "labelFields inválido", detail: `Valores no reconocidos: ${invalid.join(", ")}. Válidos: ${ALL_LABEL_FIELDS.join(", ")}.` },
        { status: 400 }
      );
    }
  }

  try {
    const prisma = getPrismaForProject(project);
    const settings = await upsertExpoSettings(prisma, {
      ...(body.expoName !== undefined && { expoName: body.expoName?.trim() || null }),
      ...(body.printQr !== undefined && { printQr: body.printQr }),
      ...(body.labelFields !== undefined && { labelFields: body.labelFields as LabelFieldKey[] }),
    });
    return NextResponse.json({ ok: true, project, ...settings });
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
