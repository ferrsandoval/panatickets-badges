import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCsvText } from "@/lib/csv-qr-pais";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * POST /api/admin/upload-qr-pais-csv?token=WEBHOOK_SECRET
 * Body: CSV con cabecera qr_content,pais (o archivo multipart con el CSV).
 * Inserta/actualiza la tabla auxiliar qr_country_lookup (match por QR completo -> país).
 */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let text: string;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") ?? formData.get("csv");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Envía un archivo en el campo 'file' o 'csv'" },
        { status: 400 }
      );
    }
    text = await file.text();
  } else {
    text = await req.text();
  }

  const rows = parseCsvText(text);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron filas válidas (qr_content,pais)" },
      { status: 400 }
    );
  }

  try {
    for (const { qrContent, pais } of rows) {
      const normalized = qrContent.trim();
      if (!normalized) continue;
      await prisma.qrCountryLookup.upsert({
        where: { qrContent: normalized },
        create: { qrContent: normalized, pais: pais.trim() },
        update: { pais: pais.trim() },
      });
    }
    return NextResponse.json({
      ok: true,
      message: "CSV importado a qr_country_lookup",
      total: rows.length,
    });
  } catch (e) {
    console.error("upload-qr-pais-csv error", e);
    return NextResponse.json(
      { error: "Error al importar", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
