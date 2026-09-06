import { NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const printedParam = searchParams.get("printed");
  const allJobs = printedParam === "all";
  const onlyPending = !allJobs && printedParam !== "true";
  const project = searchParams.get("project");
  const point = searchParams.get("point")?.trim() || null;
  const evento = searchParams.get("evento")?.trim() || null;
  const limitRaw = Math.min(5000, Math.max(1, parseInt(searchParams.get("limit") ?? "1000", 10) || 1000));

  try {
    const prisma = getPrismaForProject(project);
    const printedFilter = allJobs ? {} : onlyPending ? { printedAt: null } : { printedAt: { not: null } };
    const where = point ? undefined : { ...printedFilter, ...(evento ? { eventoId: evento } : {}) };

    let jobs: Array<{ id: string; name: string; empresa: string | null; telefono: string | null; email: string | null; pais: string | null; createdAt: Date; printedAt: Date | null }>;
    if (point) {
      // Los jobs de CodeREADr solo llevan el punto codificado como prefijo
      // "[point:X]" en rawPayload (comportamiento histórico); los de Showare
      // sí guardan el punto en la columna `point`. Se aceptan ambos.
      const fallbackJobs = await prisma.printJob.findMany({
        where: { ...printedFilter, ...(evento ? { eventoId: evento } : {}) },
        orderBy: [{ printedAt: "asc" }, { createdAt: "desc" }],
        take: allJobs ? limitRaw : undefined,
        select: { id: true, name: true, empresa: true, telefono: true, email: true, pais: true, createdAt: true, printedAt: true, rawPayload: true, point: true },
      });
      jobs = fallbackJobs
        .filter(
          (job) =>
            job.point === point ||
            (typeof job.rawPayload === "string" && job.rawPayload.startsWith(`[point:${point}]`))
        )
        .map(({ rawPayload: _rawPayload, point: _point, ...job }) => job);
    } else {
      jobs = await prisma.printJob.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        take: allJobs ? limitRaw : undefined,
        select: { id: true, name: true, empresa: true, telefono: true, email: true, pais: true, createdAt: true, printedAt: true },
      });
    }
    const valid = jobs.filter((j) => j.name && j.name.trim().length >= 2);
    return NextResponse.json(valid);
  } catch (e) {
    console.error("GET /api/print-jobs error", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Database error", detail: message },
      { status: 500 }
    );
  }
}
