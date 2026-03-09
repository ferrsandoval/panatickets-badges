import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { getPrismaForProject } from "@/lib/prisma";
import { parseCsvText } from "@/lib/csv-qr-pais";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const CSV_FOLDER = join(process.cwd(), "data", "qr-pais");

/** Mapeo nombre de archivo CSV -> key del proyecto (expo). */
const CSV_FILE_TO_PROJECT: Record<string, string> = {
  "expo_logistica.csv": "expo_logistica_2026",
  "expo_turismo.csv": "expo_turismo_2026",
  "expo_comer.csv": "expo_comer_2026",
  "expo_tech.csv": "expo_tech_2026",
  "expo_electronica.csv": "expo_electronica_2026",
  "expo_logistica_expositores.csv": "expo_logistica_expositores_2026",
  "expo_turismo_expositores.csv": "expo_turismo_expositores_2026",
  "expo_comer_expositores.csv": "expo_comer_expositores_2026",
  "expo_tech_expositores.csv": "expo_tech_expositores_2026",
  "expo_electronica_expositores.csv": "expo_electronica_expositores_2026",
};

function getProjectForCsvFile(filename: string): string | null {
  return CSV_FILE_TO_PROJECT[filename.toLowerCase()] ?? null;
}

/**
 * GET /api/admin/import-qr-pais-from-folder?token=WEBHOOK_SECRET
 * Lee los .csv de data/qr-pais/ e importa cada uno en la base de su expo (EXPO_LOGISTICA.csv -> expo_logistica_2026, etc.).
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

  const byFile: Record<string, { project: string; rows: number }> = {};
  let totalRows = 0;

  try {
    for (const file of files) {
      const project = getProjectForCsvFile(file);
      if (!project) {
        byFile[file] = { project: "(omitido: nombre no mapeado)", rows: 0 };
        continue;
      }
      const prisma = getPrismaForProject(project);
      const path = join(CSV_FOLDER, file);
      const text = await readFile(path, "utf-8");
      const isExpositores = project.includes("expositores");
      const rows = parseCsvText(text, {
        format: isExpositores ? "expositores" : "invitados",
      });
      for (const { qrContent, pais, empresa } of rows) {
        const normalized = qrContent.trim();
        if (!normalized) continue;
        const empresaVal = empresa != null && empresa !== "" ? empresa.trim() : null;
        await prisma.qrCountryLookup.upsert({
          where: { qrContent: normalized },
          create: { qrContent: normalized, pais: pais.trim(), empresa: empresaVal },
          update: { pais: pais.trim(), empresa: empresaVal },
        });
        totalRows++;
      }
      byFile[file] = { project, rows: rows.length };
    }
    return NextResponse.json({
      ok: true,
      message: "CSV importados por expo (una base por expo)",
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
