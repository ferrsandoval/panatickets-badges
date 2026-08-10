import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";
import { qrLookupCandidates, findPaisFromLookup } from "@/lib/qr-lookup";
import { findTicketByQrContent } from "@/lib/ticket-lookup";
import {
  parseNameFromQrText,
  parseEmpresaFromQrText,
  parseFeriaFromQrText,
  parseTelefonoFromQrText,
  parseEmailFromQrText,
  contentHash,
} from "@/lib/qr-parser";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const WEBHOOK_SECRET_SHORT = process.env.WEBHOOK_SECRET_SHORT; // token corto por si CodeREADr corta la URL
const AUTHORIZED_POINT_BY_USER_ID: Record<string, string> = {
  "567189": "punto1",
  "256045": "punto2",
  "176281": "punto3",
  "173272": "punto3",
  "256044": "punto4",
};

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return req.nextUrl.searchParams.get("token");
}

function validateToken(token: string | null): boolean {
  if (!token) return false;
  if (WEBHOOK_SECRET && token === WEBHOOK_SECRET) return true;
  if (WEBHOOK_SECRET_SHORT && token === WEBHOOK_SECRET_SHORT) return true;
  return false;
}

function getString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function getPointFromAuthorizedUserId(userId: string | null): string | null {
  if (!userId) return null;
  return AUTHORIZED_POINT_BY_USER_ID[userId] ?? null;
}

/** Obtiene el texto del QR desde el body; acepta claves conocidas y busca cualquier valor que parezca formato Nombre='...'|... */
function getQrTextFromBody(body: Record<string, unknown>): string {
  const knownKeys = [
    "barcode_data", "BarcodeData", "barcodeData",
    "scan_data", "scanData", "ScanData",
    "data", "payload", "barcode", "Barcode",
    "scan_value", "scanValue", "value", "content", "qr", "QR",
  ];
  for (const k of knownKeys) {
    const v = body[k];
    // Sin mínimo de longitud aquí: el nombre de la clave ya es suficiente
    // garantía (a diferencia del loop de abajo, que barre claves desconocidas).
    // Boletos como CodeREADr Barcode=10007 son válidos y bastante más cortos
    // que el formato viejo Nombre='...'|Empresa='...'.
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = getQrTextFromBody(v as Record<string, unknown>);
      if (inner.length > 0) return inner;
    }
  }
  for (const v of Object.values(body)) {
    if (typeof v === "string" && v.length >= 15 && (v.includes("Nombre=") || v.includes("Name="))) return v.trim();
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = getQrTextFromBody(v as Record<string, unknown>);
      if (inner.length >= 15) return inner;
    }
  }
  return "";
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

  const project = req.nextUrl.searchParams.get("project");
  const pointFromQuery = req.nextUrl.searchParams.get("point")?.trim() || null;

  let body: Record<string, unknown>;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = (await req.json()) as Record<string, unknown>;
  } else {
    const text = await req.text();
    body = Object.fromEntries(new URLSearchParams(text)) as Record<string, unknown>;
  }

  const scanId = getString(body, "scan_id", "scanId", "scanid", "EscanerID", "escaner_id") ?? null;
  const userId =
    getString(body, "User ID", "user_id", "userid", "userId", "UserID", "user id", "idusuario") ?? null;
  const authorizedPoint = getPointFromAuthorizedUserId(userId);
  const point = authorizedPoint ?? pointFromQuery ?? undefined;
  const qrText = getQrTextFromBody(body);

  // Si el User ID no está en la lista fija de escáneres autorizados, se acepta
  // igual siempre que la URL traiga ?point=... explícito (evita tener que
  // cablear cada dispositivo nuevo en AUTHORIZED_POINT_BY_USER_ID).
  if (userId && !authorizedPoint && !pointFromQuery) {
    return NextResponse.json(
      {
        error: "Dispositivo no autorizado",
        detail: "Agrega ?point=punto1 (o el punto correspondiente) en la URL del webhook para este dispositivo.",
        receivedUserId: userId,
      },
      { status: 403 }
    );
  }

  if (!point) {
    return NextResponse.json(
      {
        error: "No se pudo identificar el punto de impresión",
        detail: "Envía un User ID autorizado desde CodeREADr o agrega ?point=punto1 en la URL.",
        receivedUserId: userId,
      },
      { status: 400 }
    );
  }

  const projectPrisma = getPrismaForProject(project);

  // Boletos: el QR es un código de barras opaco (sin "Nombre="/"Name=" embebido).
  // Se intenta resolver por ticket_lookup ANTES de exigir el formato con pipes,
  // para no romper el flujo existente de las expos con QR tipo Nombre='...'|...
  const ticketMatch = qrText ? await findTicketByQrContent(projectPrisma, qrText) : null;
  if (ticketMatch) {
    const ticketHash = contentHash(qrText);
    const ticketRawPayload = point ? `[point:${point}]\n${qrText.slice(0, 2000)}` : qrText.slice(0, 2000);
    try {
      // Busca por scanId O por contentHash (no solo uno u otro): un reescaneo
      // del mismo boleto siempre trae un scanId nuevo (EscanerID cambia cada
      // vez), así que solo mirar scanId nunca lo encuentra como duplicado, y
      // el create() de abajo choca con la restricción única de content_hash.
      const existing = await projectPrisma.printJob.findFirst({
        where: { OR: [...(scanId ? [{ scanId }] : []), { contentHash: ticketHash }] },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json({ ok: true, duplicate: true, id: existing.id }, { status: 200 });
      }

      const ticketJob = await projectPrisma.printJob.create({
        data: {
          scanId: scanId ?? undefined,
          contentHash: ticketHash,
          name: ticketMatch.nombre,
          rawPayload: ticketRawPayload,
          source: "ticket",
          ...(point !== undefined && { point }),
          ...(ticketMatch.categoria != null && { empresa: ticketMatch.categoria }),
          ...(ticketMatch.tipoBoleto != null && { pais: ticketMatch.tipoBoleto }),
          ...(ticketMatch.telefono != null && { telefono: ticketMatch.telefono }),
          ...(ticketMatch.email != null && { email: ticketMatch.email }),
        },
      });

      return NextResponse.json(
        {
          ok: true,
          id: ticketJob.id,
          parsed: {
            name: ticketMatch.nombre,
            categoria: ticketMatch.categoria,
            tipoBoleto: ticketMatch.tipoBoleto,
            telefono: ticketMatch.telefono,
            email: ticketMatch.email,
          },
          source: "ticket",
          qrPreview: qrText.slice(0, 150),
        },
        { status: 201 }
      );
    } catch (e) {
      console.error("webhook codereadr ticket error", e);
      return NextResponse.json(
        { error: "Internal error", detail: e instanceof Error ? e.message : String(e) },
        { status: 500 }
      );
    }
  }

  if (!qrText || qrText.length < 15) {
    return NextResponse.json(
      {
        error: "No se recibió contenido del QR o es demasiado corto",
        bodyKeys: Object.keys(body),
        hint: "CodeREADr debe enviar el texto del QR en barcode_data, Barcode, data o similar.",
      },
      { status: 400 }
    );
  }
  if (!qrText.includes("Nombre=") && !qrText.includes("Name=")) {
    return NextResponse.json(
      {
        error: "El contenido del QR no tiene formato esperado (Nombre='...'|Empresa='...'|...)",
        received: qrText.slice(0, 200),
        bodyKeys: Object.keys(body),
      },
      { status: 400 }
    );
  }

  const name = parseNameFromQrText(qrText);
  const empresa = parseEmpresaFromQrText(qrText) ?? undefined;
  const feria = parseFeriaFromQrText(qrText) ?? undefined;
  const telefono = parseTelefonoFromQrText(qrText) ?? undefined;
  const email = parseEmailFromQrText(qrText) ?? undefined;

  if (!name || name.trim().length < 2) {
    return NextResponse.json(
      {
        error: "No se pudo extraer un nombre válido del QR",
        received: qrText.slice(0, 300),
        bodyKeys: Object.keys(body),
      },
      { status: 400 }
    );
  }
  const nameTrimmed = name.trim();
  if (/^[\d\s\-\(\)]+$/.test(nameTrimmed)) {
    return NextResponse.json(
      {
        error: "El nombre extraído no parece válido (solo números/símbolos)",
        received: qrText.slice(0, 200),
      },
      { status: 400 }
    );
  }

  const hash = contentHash(qrText);
  const storedRawPayload = point ? `[point:${point}]\n${qrText.slice(0, 2000)}` : qrText.slice(0, 2000);

  // País SIEMPRE se obtiene de qr_country_lookup (el QR llega sin país)
  const payloadVariant = point ? `[point:${point}]\n${qrText.slice(0, 2000)}` : qrText.slice(0, 2000);
  const lookupCandidates = qrLookupCandidates(qrText.trim(), payloadVariant);
  const paisToUse: string | undefined = (await findPaisFromLookup(projectPrisma, lookupCandidates)) ?? undefined;
  const paisSource: "lookup" | "qr" | null = paisToUse ? "lookup" : null;

  try {
    try {
      // Busca por scanId O por contentHash: ver comentario equivalente en la
      // rama de ticket_lookup más arriba (mismo bug, misma causa).
      const existing = await projectPrisma.printJob.findFirst({
        where: { OR: [...(scanId ? [{ scanId }] : []), { contentHash: hash }] },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json({ ok: true, duplicate: true, id: existing.id }, { status: 200 });
      }

      const job = await projectPrisma.printJob.create({
        data: {
          scanId: scanId ?? undefined,
          contentHash: hash,
          name: nameTrimmed,
          rawPayload: storedRawPayload,
          ...(point !== undefined && { point }),
          ...(empresa !== undefined && { empresa }),
          ...(paisToUse !== undefined && { pais: paisToUse }),
          ...(feria !== undefined && { feria }),
          ...(telefono !== undefined && { telefono }),
          ...(email !== undefined && { email }),
        },
      });

      return NextResponse.json(
        {
          ok: true,
          id: job.id,
          parsed: { name: nameTrimmed, empresa, telefono, email, pais: paisToUse },
          paisSource,
          qrPreview: qrText.slice(0, 150),
        },
        { status: 201 }
      );
    } catch (e) {
      console.error("webhook codereadr error", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("empresa") || msg.includes("pais") || msg.includes("feria") || msg.includes("telefono") || msg.includes("email") || msg.includes("column")) {
        const id = randomUUID();
        const rawPayload = storedRawPayload;
        try {
          await projectPrisma.$executeRawUnsafe(
            `INSERT INTO print_jobs (id, scan_id, content_hash, name, point, empresa, pais, feria, telefono, email, raw_payload, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
            id,
            scanId ?? null,
            hash,
            nameTrimmed,
            point ?? null,
            empresa ?? null,
            paisToUse ?? null,
            feria ?? null,
            telefono ?? null,
            email ?? null,
            rawPayload
          );
          return NextResponse.json(
            { ok: true, id, parsed: { name: nameTrimmed, empresa, telefono, email, pais: paisToUse }, paisSource, qrPreview: qrText.slice(0, 150) },
            { status: 201 }
          );
        } catch (_e2) {
          try {
            await projectPrisma.$executeRawUnsafe(
              `INSERT INTO print_jobs (id, scan_id, content_hash, name, empresa, pais, feria, telefono, email, raw_payload, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
              id,
              scanId ?? null,
              hash,
              nameTrimmed,
              empresa ?? null,
              paisToUse ?? null,
              feria ?? null,
              telefono ?? null,
              email ?? null,
              rawPayload
            );
            return NextResponse.json(
              {
                ok: true,
                id,
                parsed: { name: nameTrimmed, empresa, telefono, email, pais: paisToUse },
                paisSource,
                qrPreview: qrText.slice(0, 150),
                warning: "Tabla sin columnas empresa/telefono/email. Ejecuta GET /api/setup-db?token=... para añadirlas.",
              },
              { status: 201 }
            );
          } catch (e3) {
            console.error("webhook codereadr create fallback error", e3);
            return NextResponse.json({ error: "Internal error", detail: String(e3) }, { status: 500 });
          }
        }
      }
      return NextResponse.json({ error: "Internal error", detail: msg }, { status: 500 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Internal error", detail: msg }, { status: 500 });
  }
}
