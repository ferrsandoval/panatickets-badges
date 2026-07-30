import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";
import { parseTicketCsvText, upsertTicketLookupRows } from "@/lib/ticket-lookup";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * POST /api/admin/upload-ticket-lookup-csv?token=WEBHOOK_SECRET&project=expo_logistica_2026
 * Body: CSV de venta de boletos (12 columnas; separador ; y salto de fila
 * \r, \n o \r\n). Solo se usan columna 1 (QR/barcode), 2 (nombre), 3
 * (categoría) y 10 (tipo de boleto); el resto se ignora.
 * Inserta/actualiza ticket_lookup en la base de esa expo.
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
      message: `CSV de boletos importado a ticket_lookup del proyecto "${project}".`,
      project,
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
