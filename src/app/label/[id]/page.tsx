"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { useParams, useSearchParams } from "next/navigation";
import { sanitizeForPrint } from "@/lib/print-text";
import { ALL_LABEL_FIELDS, DEFAULT_LABEL_FIELDS, type LabelFieldKey } from "@/lib/expo-settings";
import "./label-print.css";

type ExpoSettingsState = {
  expoName: string | null;
  printQr: boolean;
  labelFields: LabelFieldKey[];
};

type LookupDebug = {
  qrTextPreview: string;
  candidatesCount: number;
  candidatesPreview: string[];
  paisFromLookup: string | null;
};

type Job = {
  id: string;
  name: string;
  empresa?: string | null;
  telefono?: string | null;
  email?: string | null;
  pais?: string | null;
  rawPayload?: string | null;
  source?: string | null;
  debugLookup?: LookupDebug | null;
};

function getExpoLabel(project: string | null): string | null {
  switch (project) {
    case "expo_logistica_2026":
      return "EXPO LOGISTICA 2026";
    case "expo_turismo_2026":
      return "EXPO TURISMO 2026";
    case "expo_comer_2026":
      return "EXPOCOMER 2026";
    case "expo_tech_2026":
      return "EXPO TECH 2026";
    case "expo_electronica_2026":
      return "EXPO ELECTRÓNICA 2026";
    case "expo_logistica_expositores_2026":
      return "EXPO LOGISTICA EXPOSITORES 2026";
    case "expo_turismo_expositores_2026":
      return "EXPO TURISMO EXPOSITORES 2026";
    case "expo_comer_expositores_2026":
      return "EXPOCOMER EXPOSITORES 2026";
    case "expo_tech_expositores_2026":
      return "EXPO TECH EXPOSITORES 2026";
    case "expo_electronica_expositores_2026":
      return "EXPO ELECTRÓNICA EXPOSITORES 2026";
    default:
      return null;
  }
}

function getLabelValue(value: string | null | undefined): string {
  return value?.trim() || "";
}

function extractQrText(rawPayload: string | null | undefined): string {
  if (!rawPayload) return "";
  return rawPayload.replace(/^\[point:[^\]]+\]\s*/i, "").trim();
}

type ShofieldEntry = { key: string; label: string; value: string; rank: number };

// Campos a omitir en la etiqueta (IDs internos, timestamps, etc.)
const SHOWARE_SKIP_KEYS = new Set([
  "boleto_id", "boletoId", "ticket_id", "ticketId", "orden_id", "ordenId",
  "evento_id", "eventoId", "event_id", "eventId",
  "fecha_compra", "fechaCompra", "created_at", "createdAt", "updated_at",
  "facturacion.monto", "facturacion.moneda", "facturacion.status_pago",
]);

const SHOWARE_LABEL_MAP: Record<string, string> = {
  "asistente.nombre": "Nombre", "asistente.name": "Nombre", "asistente.first_name": "Nombre",
  "asistente.apellidos": "Apellidos", "asistente.apellido": "Apellidos", "asistente.last_name": "Apellidos",
  "asistente.nombre_completo": "Nombre", "asistente.full_name": "Nombre",
  "asistente.empresa": "Empresa", "asistente.company": "Empresa",
  "asistente.pais": "País", "asistente.país": "País", "asistente.country": "País",
  "asistente.email": "Email", "asistente.correo": "Email",
  "asistente.telefono": "Teléfono", "asistente.teléfono": "Teléfono", "asistente.phone": "Teléfono",
  "acreditacion.tipo": "Tipo", "acreditacion.type": "Tipo",
  "evento_nombre": "Evento", "evento.nombre": "Evento", "event_name": "Evento",
};

function parseShowareFields(rawPayload: string | null | undefined): ShofieldEntry[] {
  if (!rawPayload?.startsWith("[showare]")) return [];
  try {
    const jsonStr = rawPayload.replace(/^\[showare\]\s*/i, "");
    const body = JSON.parse(jsonStr) as Record<string, unknown>;

    const entries: ShofieldEntry[] = [];
    const walk = (obj: unknown, prefix = ""): void => {
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (SHOWARE_SKIP_KEYS.has(fullKey) || SHOWARE_SKIP_KEYS.has(key)) continue;
        if (value === null || value === undefined || value === "") continue;
        if (typeof value === "object" && !Array.isArray(value)) {
          walk(value, fullKey);
        } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          entries.push({
            key: fullKey,
            label: SHOWARE_LABEL_MAP[fullKey] ?? SHOWARE_LABEL_MAP[key] ?? key,
            value: String(value),
            rank: SHOWARE_LABEL_MAP[fullKey] ? 0 : 1,
          });
        }
      }
    }
    walk(body);
    // Ordenar: campos mapeados primero, luego los demás
    return entries.sort((a, b) => a.rank - b.rank);
  } catch {
    return [];
  }
}

export default function LabelPage() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ExpoSettingsState | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const project = searchParams.get("project");
    const url = project ? `/api/print-jobs/${id}?project=${encodeURIComponent(project)}` : `/api/print-jobs/${id}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setJob(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, searchParams]);

  useEffect(() => {
    const project = searchParams.get("project");
    const url = new URL("/api/admin/expo-settings", window.location.origin);
    if (project) url.searchParams.set("project", project);
    fetch(url.toString())
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setSettings({
          expoName: data.expoName ?? null,
          printQr: data.printQr !== false,
          labelFields: Array.isArray(data.labelFields) && data.labelFields.length > 0 ? data.labelFields : DEFAULT_LABEL_FIELDS,
        });
      })
      .catch(() => setSettings(null))
      .finally(() => setSettingsLoaded(true));
  }, [searchParams]);

  useEffect(() => {
    // Espera también a settingsLoaded: evita imprimir con la configuración por
    // defecto por una carrera si el fetch de settings tarda más que el de job.
    if (!job || !settingsLoaded) return;
    const t = setTimeout(() => {
      window.print();
      // Avisa a la página que orquesta la cola (si estamos en su iframe) que
      // window.print() ya se disparó con los datos reales, para que no marque
      // "impreso" con un temporizador ciego antes de que esto ocurra.
      try {
        window.parent?.postMessage({ type: "panatickets:printed", id }, window.location.origin);
      } catch {
        // no-op: si no hay parent (ventana abierta directa), no aplica
      }
    }, 300);
    return () => clearTimeout(t);
  }, [job, id, settingsLoaded]);

  useEffect(() => {
    if (settings && settings.printQr === false) {
      setQrDataUrl("");
      return;
    }
    // Para Showare: usar acreditacion.qr si existe, sino el nombre
    let qrText = "";
    if (job?.source === "showare" && job.rawPayload?.startsWith("[showare]")) {
      try {
        const body = JSON.parse(job.rawPayload.replace(/^\[showare\]\s*/i, "")) as Record<string, unknown>;
        const acr = body["acreditacion"] as Record<string, unknown> | undefined;
        const qrField = acr?.["qr"] ?? acr?.["codigo"] ?? acr?.["code"];
        qrText = typeof qrField === "string" && qrField.trim() ? qrField.trim() : job.name;
      } catch {
        qrText = job?.name ?? "";
      }
    } else {
      qrText = extractQrText(job?.rawPayload);
    }
    if (!qrText) {
      setQrDataUrl("");
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(qrText, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 180,
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [job, settings]);

  if (loading) return <div className="label-page">Cargando…</div>;
  if (!job) return <div className="label-page">No encontrado</div>;

  const project = searchParams.get("project");
  const expoLabel = settings?.expoName?.trim() || getExpoLabel(project);
  const fetchUrl = project ? `/api/print-jobs/${id}?project=${encodeURIComponent(project)}` : `/api/print-jobs/${id}`;
  const isShoware = job.source === "showare";
  const showareFields = isShoware ? parseShowareFields(job.rawPayload) : [];

  // Render etiqueta CodeREADr: campos y orden configurables desde /configuraciones
  // (settings.labelFields), con el orden actual como valor por defecto.
  const isTicket = job.source === "ticket";
  const FIELD_CLASS: Record<LabelFieldKey, string> = {
    name: "label-name",
    empresa: "label-empresa",
    pais: "label-pais",
    telefono: "label-telefono",
    email: "label-email",
    expo: "label-expo",
  };
  // Igual que hoy hace país: si el valor queda vacío, la línea se omite.
  // Nombre/empresa/expo siempre se incluyen si están seleccionados (fidelidad con el comportamiento actual).
  const HIDE_LINE_IF_EMPTY = new Set<LabelFieldKey>(["pais", "telefono", "email"]);
  const fieldValue = (field: LabelFieldKey): string => {
    switch (field) {
      case "name": return sanitizeForPrint(getLabelValue(job.name));
      case "empresa": return sanitizeForPrint(getLabelValue(job.empresa));
      case "pais": return sanitizeForPrint(getLabelValue(job.pais));
      case "telefono": return sanitizeForPrint(getLabelValue(job.telefono));
      case "email": return sanitizeForPrint(getLabelValue(job.email));
      case "expo": return getLabelValue(expoLabel);
    }
  };
  const activeFields = (settings?.labelFields?.length ? settings.labelFields : DEFAULT_LABEL_FIELDS).filter(
    (f): f is LabelFieldKey =>
      ALL_LABEL_FIELDS.includes(f) &&
      // Los boletos no muestran el nombre de la expo (esa clave es solo interna, para la base de datos).
      (f !== "expo" || !isTicket)
  );
  const codereadrLines = activeFields
    .map((field) => ({ field, text: fieldValue(field) }))
    .filter((line) => !HIDE_LINE_IF_EMPTY.has(line.field) || line.text)
    .map((line) => ({ text: line.text, className: FIELD_CLASS[line.field] }));

  const debugPanel = (
    <div className="label-debug" key={`${id}-${project ?? ""}`}>
      <p className="label-debug-title">Información recibida (solo pantalla, no se imprime)</p>
      <p><strong>URL de la API:</strong> {fetchUrl}</p>
      <p><strong>project (expo):</strong> {project ?? "(no enviado)"}</p>
      <p><strong>source:</strong> {job.source ?? "(no definido — CodeREADr)"}</p>
      {!isShoware && (
        <>
          <p><strong>pais en el job (se imprime):</strong> {job.pais === undefined ? "undefined" : job.pais === null ? "null" : JSON.stringify(job.pais)}</p>
          {job.debugLookup && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#0f172a", borderRadius: 8, border: "1px solid #334155" }}>
              <p className="label-debug-title" style={{ marginBottom: "0.5rem" }}>Comparación con tabla QR → país</p>
              <p style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}><strong>Texto del QR (preview):</strong></p>
              <pre style={{ margin: "0.25rem 0", fontSize: "0.75rem", overflow: "auto", maxHeight: 80 }}>{job.debugLookup.qrTextPreview || "(vacío)"}</pre>
              <p style={{ margin: "0.5rem 0 0.25rem", fontSize: "0.85rem" }}><strong>Candidatos probados:</strong> {job.debugLookup.candidatesCount}</p>
              <p style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}><strong>País obtenido de la tabla lookup:</strong> {job.debugLookup.paisFromLookup ?? "(ninguno)"}</p>
              {job.debugLookup.candidatesPreview.length > 0 && (
                <>
                  <p style={{ margin: "0.5rem 0 0.25rem", fontSize: "0.85rem" }}><strong>Primeros candidatos:</strong></p>
                  <pre style={{ margin: "0.25rem 0", fontSize: "0.7rem", overflow: "auto", maxHeight: 120 }}>{job.debugLookup.candidatesPreview.join("\n")}</pre>
                </>
              )}
            </div>
          )}
        </>
      )}
      {isShoware && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
          <strong>Campos Showare detectados ({showareFields.length}):</strong>
          {showareFields.map((f) => (
            <p key={f.key} style={{ margin: "0.2rem 0" }}><strong>{f.label}:</strong> {f.value}</p>
          ))}
        </div>
      )}
      <pre className="label-debug-json">{JSON.stringify(job, null, 2)}</pre>
    </div>
  );

  return (
    <>
      <div className="label-page">
        <div className="label-layout">
          <div className="label-content">
            {isShoware ? (
              showareFields.map((f, i) => (
                <div
                  key={f.key}
                  className={`label-field ${i === 0 ? "label-field-main" : i === 1 ? "label-field-secondary" : ""}`}
                >
                  {i >= 2 && <span className="label-field-key">{f.label}:</span>}
                  {sanitizeForPrint(f.value)}
                </div>
              ))
            ) : (
              codereadrLines.map((line, i) => (
                <div key={i} className={`label-line ${line.className}`}>
                  {line.text}
                </div>
              ))
            )}
          </div>
          <div className="label-qr">
            {qrDataUrl ? <img src={qrDataUrl} alt="QR" className="label-qr-image" /> : null}
          </div>
        </div>
      </div>
      {mounted && typeof document !== "undefined" && createPortal(debugPanel, document.body)}
    </>
  );
}
