import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";
import { parseEmpresaFromQrText, parsePaisFromQrText } from "@/lib/qr-parser";
import type { PrismaClient } from "@prisma/client";

function extractQrText(rawPayload: string | null | undefined): string {
  if (!rawPayload) return "";
  return rawPayload.replace(/^\[point:[^\]]+\]\s*/i, "");
}

function hydrateJobFieldsFromRawPayload<T extends { empresa?: string | null; pais?: string | null; rawPayload?: string | null }>(
  job: T | null
): T | null {
  if (!job) return job;
  const qrText = extractQrText(job.rawPayload);
  return {
    ...job,
    empresa: job.empresa ?? parseEmpresaFromQrText(qrText),
    pais: job.pais ?? parsePaisFromQrText(qrText),
  };
}

/** Variantes normalizadas del texto QR para buscar en qr_country_lookup (evitar fallos por espacios/saltos de línea). */
function qrLookupCandidates(qrText: string, rawPayload?: string | null): string[] {
  const t = qrText.trim();
  const candidates = new Set<string>();
  if (t) {
    candidates.add(t);
    const noCr = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    candidates.add(noCr);
    candidates.add(noCr.trim());
    const singleSpace = t.replace(/\s+/g, " ").trim();
    candidates.add(singleSpace);
  }
  if (rawPayload?.trim()) candidates.add(rawPayload.trim());
  return Array.from(candidates);
}

/** Si el job no tiene pais, intenta obtenerlo de qr_country_lookup por el texto del QR. */
async function enrichPaisFromLookup<T extends { pais?: string | null; rawPayload?: string | null }>(
  job: T | null,
  prisma: PrismaClient
): Promise<T | null> {
  if (!job || (job.pais != null && job.pais.trim() !== "")) return job;
  const qrText = extractQrText(job.rawPayload);
  const candidates = qrLookupCandidates(qrText, job.rawPayload);
  if (!candidates.length) return job;
  try {
    const lookup = await prisma.qrCountryLookup.findFirst({
      where: { qrContent: { in: candidates } },
      select: { pais: true },
    });
    if (lookup?.pais) return { ...job, pais: lookup.pais };
  } catch {
    // tabla puede no existir en este proyecto
  }
  return job;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  type JobRow = { id: string; name: string; empresa?: string | null; telefono?: string | null; pais?: string | null; rawPayload?: string | null; createdAt: Date; printedAt: Date | null };
  let job: JobRow | null = null;

  try {
    const prisma = getPrismaForProject(project);
    try {
      job = await prisma.printJob.findUnique({
        where: { id },
        select: { id: true, name: true, empresa: true, telefono: true, pais: true, rawPayload: true, createdAt: true, printedAt: true },
      });
      job = hydrateJobFieldsFromRawPayload(job);
    } catch {
      try {
        job = await prisma.printJob.findUnique({
          where: { id },
          select: { id: true, name: true, empresa: true, pais: true, rawPayload: true, createdAt: true, printedAt: true },
        });
        if (job) job = hydrateJobFieldsFromRawPayload({ ...job, telefono: null });
      } catch {
        job = await prisma.printJob.findUnique({
          where: { id },
          select: { id: true, name: true, empresa: true, pais: true, rawPayload: true, createdAt: true, printedAt: true },
        });
        if (job) job = hydrateJobFieldsFromRawPayload({ ...job, telefono: null });
      }
    }
    if (job) job = await enrichPaisFromLookup(job, prisma);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Database error", detail: message }, { status: 500 });
  }

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  let body: { printed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.printed !== true) {
    return NextResponse.json({ error: "Expected { printed: true }" }, { status: 400 });
  }

  try {
    const prisma = getPrismaForProject(project);
    const job = await prisma.printJob.update({
      where: { id },
      data: { printedAt: new Date() },
      select: { id: true, name: true, printedAt: true },
    });
    return NextResponse.json(job);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Database error", detail: message }, { status: 500 });
  }
}
