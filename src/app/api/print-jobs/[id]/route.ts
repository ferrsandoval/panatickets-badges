import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let job: { id: string; name: string; empresa?: string | null; createdAt: Date; printedAt: Date | null } | null = null;
  try {
    job = await prisma.printJob.findUnique({
      where: { id },
      select: { id: true, name: true, empresa: true, createdAt: true, printedAt: true },
    });
  } catch {
    job = await prisma.printJob.findUnique({
      where: { id },
      select: { id: true, name: true, createdAt: true, printedAt: true },
    });
    if (job) job = { ...job, empresa: null };
  }
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { printed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.printed !== true) {
    return NextResponse.json({ error: "Expected { printed: true }" }, { status: 400 });
  }

  const job = await prisma.printJob.update({
    where: { id },
    data: { printedAt: new Date() },
    select: { id: true, name: true, printedAt: true },
  });
  return NextResponse.json(job);
}
