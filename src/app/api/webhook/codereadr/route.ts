import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseNameFromQrText, contentHash } from "@/lib/qr-parser";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return req.nextUrl.searchParams.get("token");
}

function validateToken(token: string | null): boolean {
  if (!WEBHOOK_SECRET) return true;
  return token === WEBHOOK_SECRET && !!token;
}

/** GET: comprobar que el webhook está vivo (CodeREADr no usa GET). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Webhook activo. CodeREADr debe enviar POST con el contenido del QR.",
  });
}

export async function POST(req: NextRequest) {
  if (!validateToken(getToken(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, string>;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = (await req.json()) as Record<string, string>;
  } else {
    const text = await req.text();
    body = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
  }

  const scanId =
    body.scan_id ?? body.scanId ?? body.scanid ?? body.EscanerID ?? body.escaner_id ?? null;
  const qrText =
    body.barcode_data ??
    body.scan_data ??
    body.data ??
    body.payload ??
    body.barcode ??
    body.Barcode ??
    body.scan_value ??
    body.value ??
    "";

  const name = parseNameFromQrText(qrText);

  if (!name) {
    return NextResponse.json(
      {
        error: "No se pudo extraer Name del QR",
        received: qrText.slice(0, 300),
        bodyKeys: Object.keys(body),
      },
      { status: 400 }
    );
  }

  const hash = contentHash(qrText);

  try {
    const existing = scanId
      ? await prisma.printJob.findUnique({ where: { scanId } })
      : await prisma.printJob.findUnique({ where: { contentHash: hash } });

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true, id: existing.id }, { status: 200 });
    }

    const job = await prisma.printJob.create({
      data: {
        scanId: scanId ?? undefined,
        contentHash: hash,
        name,
        rawPayload: qrText.slice(0, 2000),
      },
    });

    return NextResponse.json({ ok: true, id: job.id }, { status: 201 });
  } catch (e) {
    console.error("webhook codereadr error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
