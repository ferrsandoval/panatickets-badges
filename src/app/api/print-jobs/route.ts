import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const onlyPending = searchParams.get("printed") !== "true";

  try {
    const jobs = await prisma.printJob.findMany({
      where: onlyPending ? { printedAt: null } : undefined,
      orderBy: [{ printedAt: "asc" }, { createdAt: "desc" }],
      select: { id: true, name: true, createdAt: true, printedAt: true },
    });
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
