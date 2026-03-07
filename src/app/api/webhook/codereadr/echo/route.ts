import { NextRequest, NextResponse } from "next/server";
import { getLastCodereadrEcho, setLastCodereadrEcho } from "@/lib/codereadr-echo-store";

/**
 * POST /api/webhook/codereadr/echo
 * Recibe lo que envía CodeREADr y lo devuelve (para depurar).
 * Pon esta URL temporalmente en CodeREADr como Postback URL para ver si llegan las peticiones y qué traen.
 */
export async function GET() {
  return NextResponse.json(
    getLastCodereadrEcho() ?? {
      ok: true,
      message: "Echo: aún no se ha recibido ningún payload.",
      receivedAt: null,
      bodyKeys: [],
      bodySample: {},
    }
  );
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let body: Record<string, string>;
  if (contentType.includes("application/json")) {
    body = (await req.json()) as Record<string, string>;
  } else {
    const text = await req.text();
    body = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
  }

  const payload = {
    ok: true,
    message: "Echo: recibido",
    receivedAt: new Date().toISOString(),
    bodyKeys: Object.keys(body),
    bodySample: Object.fromEntries(
      Object.entries(body).map(([k, v]) => [k, String(v).slice(0, 200)])
    ),
  } as const;

  setLastCodereadrEcho(payload);

  return NextResponse.json(payload);
}
