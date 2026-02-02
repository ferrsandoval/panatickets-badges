import { NextRequest, NextResponse } from "next/server";
import {
  parseNameFromQrText,
  parseEmpresaFromQrText,
  parseEmailFromQrText,
  parseTelefonoFromQrText,
} from "@/lib/qr-parser";

/**
 * GET /api/debug/parse-qr?qr=Nombre%3D%27...%27%7CEmpresa%3D...
 * POST /api/debug/parse-qr con body { "qr": "Nombre='...'|Empresa='...'|..." }
 * Devuelve los campos extraídos para verificar que el parser funciona.
 */
export async function GET(req: NextRequest) {
  const qr = req.nextUrl.searchParams.get("qr");
  if (!qr) {
    return NextResponse.json(
      { error: "Falta query param qr= con el texto del QR (URL-encoded)" },
      { status: 400 }
    );
  }
  const qrText = decodeURIComponent(qr);
  return parseAndRespond(qrText);
}

export async function POST(req: NextRequest) {
  let body: { qr?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON con campo qr" }, { status: 400 });
  }
  const qrText = body.qr ?? "";
  if (!qrText.trim()) {
    return NextResponse.json({ error: "Falta campo qr en el body" }, { status: 400 });
  }
  return parseAndRespond(qrText);
}

function parseAndRespond(qrText: string) {
  const name = parseNameFromQrText(qrText);
  const empresa = parseEmpresaFromQrText(qrText);
  const email = parseEmailFromQrText(qrText);
  const telefono = parseTelefonoFromQrText(qrText);
  return NextResponse.json({
    name,
    empresa,
    email,
    telefono,
    qrLength: qrText.length,
    qrPreview: qrText.slice(0, 120) + (qrText.length > 120 ? "..." : ""),
  });
}
