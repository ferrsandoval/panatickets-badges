import { NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const onlyPending = searchParams.get("printed") !== "true";
  const project = searchParams.get("project");
  const point = searchParams.get("point")?.trim() || null;

  try {
    const prisma = getPrismaForProject(project);
    let jobs: Array<{ id: string; name: string; createdAt: Date; printedAt: Date | null }>;
    try {
      jobs = await prisma.printJob.findMany({
        where: {
          ...(onlyPending ? { printedAt: null } : {}),
          ...(point ? { point } : {}),
        },
        orderBy: [{ printedAt: "asc" }, { createdAt: "desc" }],
        select: { id: true, name: true, createdAt: true, printedAt: true },
      });
    } catch (error) {
      if (!point) {
        throw error;
      }

      const fallbackJobs = await prisma.printJob.findMany({
        where: onlyPending ? { printedAt: null } : undefined,
        orderBy: [{ printedAt: "asc" }, { createdAt: "desc" }],
        select: { id: true, name: true, createdAt: true, printedAt: true, rawPayload: true },
      });
      jobs = fallbackJobs
        .filter((job) => typeof job.rawPayload === "string" && job.rawPayload.startsWith(`[point:${point}]`))
        .map(({ rawPayload: _rawPayload, ...job }) => job);
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
