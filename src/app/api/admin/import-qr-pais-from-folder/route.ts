import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { parseCsvText } from "@/lib/csv-qr-pais";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/** Ruta de la carpeta con CSVs (respecto a la raíz del proyecto). */
const CSV_FOLDER = join(process.cwd(), "data", "qr-pais");

/**
 * GET /api/admin/import-qr-pais-from-folder?token=WEBHOOK_SECRET
 * Lee todos los .csv de la carpeta data/qr-pais/ del proyecto e importa a qr_country_lookup.
 * Pon tus CSV ahí, haz push a GitHub (Vercel redespliega) y llama esta URL una vez.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let files: string[];
  try {
    const entries = await readdir(CSV_FOLDER, { withFileTypes: true });
    files = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".csv")).map((e) => e.name);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "No se pudo leer la carpeta data/qr-pais",
        detail: msg,
        hint: "Crea la carpeta data/qr-pais en el proyecto y añade archivos .csv con columnas qr_content,pais. Luego haz push y vuelve a llamar.",
      },
      { status: 404 }
    );
  }

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No hay archivos .csv en data/qr-pais", files: [] },
      { status: 400 }
    );
  }

  let totalRows = 0;
  const byFile: Record<string, number> = {};

  try {
    for (const file of files) {
      const path = join(CSV_FOLDER, file);
      const text = await readFile(path, "utf-8");
      const rows = parseCsvText(text);
      for (const { qrContent, pais } of rows) {
        const normalized = qrContent.trim();
        if (!normalized) continue;
        await prisma.qrCountryLookup.upsert({
          where: { qrContent: normalized },
          create: { qrContent: normalized, pais: pais.trim() },
          update: { pais: pais.trim() },
        });
        totalRows++;
      }
      byFile[file] = rows.length;
    }
    return NextResponse.json({
      ok: true,
      message: "CSV importados desde data/qr-pais",
      files,
      byFile,
      total: totalRows,
    });
  } catch (e) {
    console.error("import-qr-pais-from-folder error", e);
    return NextResponse.json(
      { error: "Error al importar", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
