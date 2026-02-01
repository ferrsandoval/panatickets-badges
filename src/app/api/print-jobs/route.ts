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
    return NextResponse.json(jobs);
  } catch (e) {
    console.error("GET /api/print-jobs error", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Database error", detail: message },
      { status: 500 }
    );
  }
}
