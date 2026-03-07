import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  type JobRow = { id: string; name: string; empresa?: string | null; telefono?: string | null; pais?: string | null; createdAt: Date; printedAt: Date | null };
  let job: JobRow | null = null;

  try {
    const prisma = getPrismaForProject(project);
    try {
      job = await prisma.printJob.findUnique({
        where: { id },
        select: { id: true, name: true, empresa: true, telefono: true, pais: true, createdAt: true, printedAt: true },
      });
    } catch {
      try {
        job = await prisma.printJob.findUnique({
          where: { id },
          select: { id: true, name: true, empresa: true, pais: true, createdAt: true, printedAt: true },
        });
        if (job) job = { ...job, telefono: null };
      } catch {
        job = await prisma.printJob.findUnique({
          where: { id },
          select: { id: true, name: true, createdAt: true, printedAt: true },
        });
        if (job) job = { ...job, empresa: null, telefono: null, pais: null };
      }
    }
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
