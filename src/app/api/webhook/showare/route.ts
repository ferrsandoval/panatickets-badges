import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/prisma";
import { contentHash } from "@/lib/qr-parser";

const SHOWARE_SECRET = process.env.SHOWARE_WEBHOOK_SECRET;

// Todos los eventos de Showare son dinámicos (Showare los crea de su lado sin
// aviso previo), así que por defecto TODOS comparten esta única base/schema
// dedicada — nada que aprovisionar cuando aparece un evento nuevo. Un evento
// puntual puede aislarse en su propia base con SHOWARE_EVENTO_<ID>=<project>
// (ver getProjectForEvento) o con ?project=... en la URL del webhook.
const SHOWARE_DEFAULT_PROJECT = process.env.SHOWARE_DEFAULT_PROJECT?.trim() || "showare";

// Mapeo opcional evento_id -> proyecto propio, para el caso raro de un evento
// grande que se quiera aislar en su base. Formato env:
// SHOWARE_EVENTO_<ID_NORMALIZADO>=proyecto_key, ej. SHOWARE_EVENTO_EVT_2026_001=expo_logistica_2026
function getProjectForEvento(eventoId: string): string | null {
  const normalized = eventoId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return process.env[`SHOWARE_EVENTO_${normalized}`] ?? null;
}

function tokensIguales(a: string, b: string): boolean {
  const bufA = createHash("sha256").update(a).digest();
  const bufB = createHash("sha256").update(b).digest();
  return timingSafeEqual(bufA, bufB);
}

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return req.nextUrl.searchParams.get("token");
}

// Extrae un valor de un objeto anidado dado un path como "asistente.nombre"
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function getStr(obj: Record<string, unknown>, ...paths: string[]): string | null {
  for (const path of paths) {
    const v = getNestedValue(obj, path);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

/**
 * Detecta el nombre del asistente probando múltiples campos comunes.
 * Si hay nombre y apellidos separados, los concatena.
 */
function detectName(body: Record<string, unknown>): string | null {
  // Intentar nombre + apellidos (varios formatos anidados y planos)
  const nombre = getStr(
    body,
    "asistente.nombre", "asistente.name", "asistente.first_name", "asistente.firstName",
    "attendee.nombre", "attendee.name", "attendee.first_name",
    "nombre", "name", "first_name", "firstName", "nombres"
  );
  const apellidos = getStr(
    body,
    "asistente.apellidos", "asistente.apellido", "asistente.last_name", "asistente.lastName",
    "attendee.apellidos", "attendee.last_name",
    "apellidos", "apellido", "last_name", "lastName"
  );

  if (nombre && apellidos) return `${nombre} ${apellidos}`;
  if (nombre) return nombre;
  if (apellidos) return apellidos;

  // Fallback: campo nombre completo
  return getStr(
    body,
    "asistente.nombre_completo", "asistente.full_name", "asistente.fullName",
    "attendee.full_name",
    "nombre_completo", "full_name", "fullName", "Nombre", "Name"
  );
}

/**
 * Detecta el ID único del boleto para deduplicación.
 */
function detectBoletoId(body: Record<string, unknown>): string | null {
  return getStr(
    body,
    "boleto_id", "boletoId", "ticket_id", "ticketId",
    "acreditacion.id", "acreditacion.codigo",
    "id", "barcode", "qr_id", "scan_id"
  );
}

/**
 * Extrae campos conocidos para mostrar con etiqueta legible en la impresión.
 * Devuelve un objeto plano clave->valor con todo lo que encuentre.
 */
function extractDisplayFields(body: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};

  function walk(obj: unknown, prefix = ""): void {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value === null || value === undefined) continue;
      if (typeof value === "object" && !Array.isArray(value)) {
        walk(value, fullKey);
      } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        result[fullKey] = String(value);
      }
    }
  }

  walk(body);
  return result;
}

/** GET: verificar que el endpoint está activo */
export async function GET() {
  return NextResponse.json({ ok: true, message: "Webhook Showare activo." });
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!SHOWARE_SECRET || !token || !tokensIguales(token, SHOWARE_SECRET)) {
    return NextResponse.json({ error: { code: "AUTH_ERROR", message: "Token inválido o ausente" } }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Body debe ser JSON válido" } },
      { status: 400 }
    );
  }

  // Evento → proyecto. Por defecto todos los eventos de Showare caen en la
  // misma base dedicada (SHOWARE_DEFAULT_PROJECT); solo se usa un proyecto
  // distinto si alguien configuró explícitamente un mapeo o ?project=.
  const eventoId = getStr(body, "evento_id", "eventoId", "event_id", "eventId") ?? null;
  const projectFromQuery = req.nextUrl.searchParams.get("project")?.trim() ?? null;
  const project =
    (eventoId ? getProjectForEvento(eventoId) : null) ?? projectFromQuery ?? SHOWARE_DEFAULT_PROJECT;

  // Punto de impresión (estación) al que debe llegar este registro. Se
  // configura una vez en la URL del webhook que se le da a Showare, ej.
  // ?point=punto1. Si no se manda, el job queda sin punto y solo aparece en
  // una cola "sin filtrar por punto" (ver /api/print-jobs).
  const point = req.nextUrl.searchParams.get("point")?.trim() || undefined;

  // Nombre obligatorio
  const name = detectName(body);
  if (!name || name.trim().length < 2) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "No se pudo extraer un nombre válido del payload.",
          detail: "Envía asistente.nombre / asistente.apellidos (u otros campos de nombre comunes).",
          receivedKeys: Object.keys(body),
        },
      },
      { status: 400 }
    );
  }

  const boletoId = detectBoletoId(body);
  const displayFields = extractDisplayFields(body);
  const rawPayload = `[showare]\n${JSON.stringify(body, null, 2)}`;
  const hash = contentHash(rawPayload);

  const projectPrisma = getPrismaForProject(project);

  // Deduplicación: primero por boleto_id, luego por hash del payload completo
  try {
    const existing = boletoId
      ? await projectPrisma.printJob.findUnique({ where: { scanId: boletoId }, select: { id: true } })
      : await projectPrisma.printJob.findUnique({ where: { contentHash: hash }, select: { id: true } });

    if (existing) {
      return NextResponse.json(
        { status: "ok", mensaje: "Registro recibido correctamente", folio_interno: existing.id, print_queue: { estado: "duplicado", prioridad: "normal" } },
        { status: 200 }
      );
    }

    const job = await projectPrisma.printJob.create({
      data: {
        scanId: boletoId ?? undefined,
        contentHash: hash,
        name: name.trim(),
        rawPayload,
        source: "showare",
        ...(point !== undefined && { point }),
        eventoId: eventoId ?? undefined,
        empresa: getStr(body, "asistente.empresa", "asistente.company", "empresa", "company", "acreditacion.tipo", "tipo") ?? undefined,
        pais: getStr(body, "asistente.pais", "asistente.country", "asistente.país", "pais", "país", "country") ?? undefined,
        feria: getStr(body, "evento_nombre", "evento.nombre", "event_name", "feria") ?? undefined,
      },
    });

    return NextResponse.json(
      {
        status: "ok",
        mensaje: "Registro recibido correctamente",
        folio_interno: job.id,
        print_queue: { estado: "en_cola", prioridad: "normal" },
        parsed: { name: name.trim(), fields: Object.keys(displayFields).length },
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("webhook showare error", e);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: msg } },
      { status: 500 }
    );
  }
}
