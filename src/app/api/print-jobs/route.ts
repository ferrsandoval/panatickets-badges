import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const onlyPending = searchParams.get("printed") !== "true";

  const jobs = await prisma.printJob.findMany({
    where: onlyPending ? { printedAt: null } : undefined,
    orderBy: [{ printedAt: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(jobs);
}
