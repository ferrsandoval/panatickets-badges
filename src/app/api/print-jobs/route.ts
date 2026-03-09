import { NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const printedParam = searchParams.get("printed");
  const allJobs = printedParam === "all";
  const onlyPending = !allJobs && printedParam !== "true";
  const project = searchParams.get("project");
  const point = searchParams.get("point")?.trim() || null;
  const limitRaw = Math.min(5000, Math.max(1, parseInt(searchParams.get("limit") ?? "1000", 10) || 1000));

  try {
    const prisma = getPrismaForProject(project);
    const where =
      point
        ? undefined
        : allJobs
          ? {}
          : onlyPending
            ? { printedAt: null }
            : { printedAt: { not: null } };

    let jobs: Array<{ id: string; name: string; empresa: string | null; telefono: string | null; email: string | null; pais: string | null; createdAt: Date; printedAt: Date | null }>;
    if (point) {
      const fallbackJobs = await prisma.printJob.findMany({
        where: onlyPending ? { printedAt: null } : allJobs ? {} : { printedAt: { not: null } },
        orderBy: [{ printedAt: "asc" }, { createdAt: "desc" }],
        take: allJobs ? limitRaw : undefined,
        select: { id: true, name: true, empresa: true, telefono: true, email: true, pais: true, createdAt: true, printedAt: true, rawPayload: true },
      });
      jobs = fallbackJobs
        .filter((job) => typeof job.rawPayload === "string" && job.rawPayload.startsWith(`[point:${point}]`))
        .map(({ rawPayload: _rawPayload, ...job }) => job);
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
