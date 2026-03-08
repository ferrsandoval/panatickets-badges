import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";
import {
  extractQrTextFromPayload,
  qrLookupCandidates,
  findPaisFromLookup,
} from "@/lib/qr-lookup";
import { parseEmpresaFromQrText } from "@/lib/qr-parser";

function hydrateJobFieldsFromRawPayload<T extends { empresa?: string | null; pais?: string | null; rawPayload?: string | null }>(
  job: T | null
): T | null {
  if (!job) return job;
  const qrText = extractQrTextFromPayload(job.rawPayload);
  return {
    ...job,
    empresa: job.empresa ?? parseEmpresaFromQrText(qrText),
    // país no se rellena aquí: siempre viene de qr_country_lookup (enrichPaisFromLookup)
    pais: job.pais,
  };
}

export type LookupDebug = {
  qrTextPreview: string;
  candidatesCount: number;
  candidatesPreview: string[];
  paisFromLookup: string | null;
};

/** País SIEMPRE se obtiene de qr_country_lookup (el QR llega sin país). Compara el contenido del QR con la tabla. */
async function enrichPaisFromLookup<T extends { pais?: string | null; rawPayload?: string | null }>(
  job: T | null,
  prisma: Parameters<typeof findPaisFromLookup>[0]
): Promise<{ job: T; debug: LookupDebug | null } | { job: null; debug: null }> {
  if (!job) return { job: null, debug: null };
  const qrText = extractQrTextFromPayload(job.rawPayload);
  const candidates = qrLookupCandidates(qrText, job.rawPayload);
  const paisFromLookup = await findPaisFromLookup(prisma, candidates);
  const debug: LookupDebug = {
    qrTextPreview: qrText.slice(0, 200),
    candidatesCount: candidates.length,
    candidatesPreview: candidates.slice(0, 5).map((c) => c.slice(0, 80) + (c.length > 80 ? "…" : "")),
    paisFromLookup,
  };
  return {
    job: { ...job, pais: paisFromLookup ?? job.pais } as T,
    debug,
  };
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
  let lookupDebug: LookupDebug | null = null;
  if (job) {
    const result = await enrichPaisFromLookup(job, prisma);
    job = result.job;
    lookupDebug = result.debug;
  }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Database error", detail: message }, { status: 500 });
  }

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: job.id,
    name: job.name,
    empresa: job.empresa ?? null,
    telefono: job.telefono ?? null,
    pais: job.pais ?? null,
    rawPayload: job.rawPayload ?? null,
    createdAt: job.createdAt,
    printedAt: job.printedAt,
    debugLookup: lookupDebug ?? undefined,
  });
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
