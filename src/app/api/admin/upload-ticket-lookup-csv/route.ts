import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";
import { parseTicketCsvText, upsertTicketLookupRows } from "@/lib/ticket-lookup";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * POST /api/admin/upload-ticket-lookup-csv?token=WEBHOOK_SECRET
 * Body: CSV de boletos. Dos formatos aceptados (ver parseTicketCsvText):
 * - Simple, con cabecera, cualquier orden: ej. "QR,Nombre,Empresa,Telefono,Mail".
 * - Legado: 12 columnas separadas por ";" (solo usa columnas 1, 2, 3 y 10).
 * Inserta/actualiza ticket_lookup en la base por defecto (o la de ?project= si se indica).
 */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = req.nextUrl.searchParams.get("project")?.trim() || undefined;

  let text: string;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") ?? formData.get("csv");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Envía un archivo en el campo 'file' o 'csv'" }, { status: 400 });
    }
    text = await file.text();
  } else {
    text = await req.text();
  }

  const rows = parseTicketCsvText(text);
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron filas válidas (esperado: QR;Nombre;Categoria;...;TipoBoleto en la columna 10)" },
      { status: 400 }
    );
  }

  try {
    const prisma = getPrismaForProject(project);
    await upsertTicketLookupRows(prisma, rows);
    return NextResponse.json({
      ok: true,
      message: `CSV de boletos importado a ticket_lookup${project ? ` del proyecto "${project}"` : " (base por defecto)"}.`,
      project: project ?? null,
      total: rows.length,
    });
  } catch (e) {
    console.error("upload-ticket-lookup-csv error", e);
    return NextResponse.json(
      { error: "Error al importar", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/upload-ticket-lookup-csv?token=WEBHOOK_SECRET
 * Borra todas las filas de ticket_lookup de la base por defecto (o la de ?project= si se indica).
 */
export async function DELETE(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = req.nextUrl.searchParams.get("project")?.trim() || undefined;

  try {
    const prisma = getPrismaForProject(project);
    const result = await prisma.ticketLookup.deleteMany({});
    return NextResponse.json({
      ok: true,
      message: `Se borraron ${result.count} filas de ticket_lookup${project ? ` en "${project}"` : ""}.`,
      project: project ?? null,
      deleted: result.count,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Error al borrar", detail: message, project: project ?? null }, { status: 500 });
  }
}
