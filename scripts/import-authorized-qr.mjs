import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function parseCsv(text) {
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        currentValue += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentValue += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
}

function resolveDatabaseUrl(project) {
  if (!project) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Falta DATABASE_URL. Pasa --project o define DATABASE_URL.");
    }
    return process.env.DATABASE_URL;
  }

  const normalized = project.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const baseEnvVar = `DATABASE_URL_${normalized}`;
  const candidates = [
    baseEnvVar,
    `${baseEnvVar}_DATABASE_URL`,
    `${baseEnvVar}_POSTGRES_URL`,
    `${baseEnvVar}_PRISMA_DATABASE_URL`,
  ];

  for (const envVar of candidates) {
    const value = process.env[envVar];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  throw new Error(
    `No se encontró una variable válida para "${project}". Probé: ${candidates.join(", ")}`
  );
}

function getColumnIndex(headerRow, args) {
  if (args["column-index"] !== undefined) {
    const index = Number(args["column-index"]);
    if (Number.isNaN(index) || index < 0) {
      throw new Error("--column-index debe ser un número >= 0.");
    }
    return index;
  }

  if (args.column) {
    const index = headerRow.findIndex(
      (value) => value.trim().toLowerCase() === String(args.column).trim().toLowerCase()
    );
    if (index === -1) {
      throw new Error(`No encontré la columna "${args.column}" en el CSV.`);
    }
    return index;
  }

  return 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = args.file;
  const project = args.project;
  const hasHeader = args["has-header"] !== "false";

  if (!file) {
    throw new Error(
      "Uso: node scripts/import-authorized-qr.mjs --project expo_logistica_2026 --file /ruta/archivo.csv [--column QR] [--column-index 0]"
    );
  }

  const absoluteFile = path.resolve(process.cwd(), file);
  const raw = await fs.readFile(absoluteFile, "utf8");
  const csvText = raw.replace(/^\uFEFF/, "");
  const rows = parseCsv(csvText).filter((row) => row.some((value) => value.trim().length > 0));

  if (rows.length === 0) {
    throw new Error("El CSV está vacío.");
  }

  const headerRow = hasHeader ? rows[0] : rows[0].map((_, index) => String(index));
  const columnIndex = getColumnIndex(headerRow, args);
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const entries = dataRows
    .map((row, index) => ({
      qrContent: (row[columnIndex] ?? "").trim(),
      sourceRow: hasHeader ? index + 2 : index + 1,
    }))
    .filter((row) => row.qrContent.length > 0);

  if (entries.length === 0) {
    throw new Error("No encontré valores de QR en la columna indicada.");
  }

  const prisma = new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(project),
    log: ["error"],
  });

  try {
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const result = await prisma.authorizedQr.createMany({
        data: batch.map((entry) => ({
          qrContent: entry.qrContent,
          sourceFile: path.basename(absoluteFile),
          sourceRow: entry.sourceRow,
        })),
        skipDuplicates: true,
      });
      inserted += result.count;
    }

    console.log(`Proyecto: ${project ?? "DATABASE_URL por defecto"}`);
    console.log(`Archivo: ${absoluteFile}`);
    console.log(`Filas leídas: ${entries.length}`);
    console.log(`Filas insertadas: ${inserted}`);
    console.log(`Filas omitidas por duplicado: ${entries.length - inserted}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
