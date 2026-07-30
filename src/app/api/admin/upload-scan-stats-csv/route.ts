import { NextRequest, NextResponse } from "next/server";
import { getPrismaForScanStats } from "@/lib/prisma";
import Papa from "papaparse";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

function getValue(row: Record<string, string>, key: string): string {
  const k = Object.keys(row).find((h) => h.trim().toLowerCase() === key.toLowerCase());
  return (k ? row[k] : row[key] ?? "").trim() || "";
}

/**
 * POST /api/admin/upload-scan-stats-csv?token=WEBHOOK_SECRET
 * Body: multipart/form-data con file o CSV en raw body.
 * Inserta en scan_records (usa la base de expo_tech_2026 o SCAN_STATS_PROJECT).
 * Reemplaza datos existentes: borra todos y vuelve a insertar.
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
        { error: "Envía un archivo CSV en el campo 'file' o 'csv'" },
        { status: 400 }
      );
    }
    text = await file.text();
  } else {
    text = await req.text();
  }

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0 && (!result.data || result.data.length === 0)) {
    return NextResponse.json(
      { error: "Error al parsear CSV", detail: result.errors[0]?.message },
      { status: 400 }
    );
  }

  const rows = result.data ?? [];
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "El CSV está vacío o no tiene filas de datos" },
      { status: 400 }
    );
  }

  try {
    const prisma = getPrismaForScanStats();
    await prisma.scanRecord.deleteMany({});

    const records = rows.map((row) => ({
      scanId: getValue(row, "Scan_ID") || getValue(row, "can_ID") || null,
      fecha: getValue(row, "Fecha") || getValue(row, "Fecha_Escaneo") || null,
      hora: getValue(row, "Hora") || getValue(row, "Hora_Escaneo") || null,
      diaSemana: getValue(row, "Dia_Semana") || null,
      timestampCompleto: getValue(row, "Timestamp_Completo") || null,
      expo: getValue(row, "EXPO") || getValue(row, "Expo") || null,
      tipoPersona: getValue(row, "Tipo_Persona") || null,
      nombre: getValue(row, "Nombre") || getValue(row, "Persona_Escaneada_Nombre") || null,
      empresa: getValue(row, "Empresa") || getValue(row, "Persona_Escaneada_Compania") || null,
      email: getValue(row, "Email") || getValue(row, "Persona_Escaneada_Email") || null,
      telefono: getValue(row, "Telefono") || getValue(row, "Persona_Escaneada_Telefono") || null,
      celular: getValue(row, "Celular") || getValue(row, "Persona_Escaneada_Celular") || null,
      escaneo: getValue(row, "Escaneo") || null,
    }));

    await prisma.scanRecord.createMany({
      data: records,
      skipDuplicates: true,
    });

    const total = await prisma.scanRecord.count();
    return NextResponse.json({
      ok: true,
      message: `CSV importado a scan_records. ${total} registros.`,
      total,
    });
  } catch (e) {
    console.error("upload-scan-stats-csv error", e);
    return NextResponse.json(
      { error: "Error al importar", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
