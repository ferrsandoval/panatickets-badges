"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { useParams, useSearchParams } from "next/navigation";
import "./label-print.css";

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
  pais?: string | null;
  rawPayload?: string | null;
  debugLookup?: LookupDebug | null;
};

function getExpoLabel(project: string | null): string | null {
  switch (project) {
    case "expo_logistica_2026":
      return "EXPO LOGISTICA 2026";
    case "expo_turismo_2026":
      return "EXPO TURISMO 2026";
    case "expo_comer_2026":
      return "EXPO COMER 2026";
    case "expo_tech_2026":
      return "EXPO TECH 2026";
    case "expo_electronica_2026":
      return "EXPO ELECTRÓNICA 2026";
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

export default function LabelPage() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
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
    if (!job) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [job]);

  useEffect(() => {
    const qrText = extractQrText(job?.rawPayload);
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
  }, [job]);

  if (loading) return <div className="label-page">Cargando…</div>;
  if (!job) return <div className="label-page">No encontrado</div>;

  const expoLabel = getExpoLabel(searchParams.get("project"));

  const paisValue = getLabelValue(job.pais);
  const lines = [
    { text: getLabelValue(job.name), className: "label-name" },
    { text: getLabelValue(job.empresa), className: "label-empresa" },
    ...(paisValue ? [{ text: paisValue, className: "label-pais" }] : []),
    { text: getLabelValue(expoLabel), className: "label-expo" },
  ];

  const project = searchParams.get("project");
  const fetchUrl = project ? `/api/print-jobs/${id}?project=${encodeURIComponent(project)}` : `/api/print-jobs/${id}`;

  const debugPanel = (
    <div className="label-debug" key={`${id}-${project ?? ""}`}>
      <p className="label-debug-title">Información recibida (solo pantalla, no se imprime) — se actualiza con cada nueva etiqueta</p>
      <p><strong>URL de la API:</strong> {fetchUrl}</p>
      <p><strong>project (expo):</strong> {project ?? "(no enviado)"}</p>
      <p><strong>pais en el job (se imprime):</strong> {job.pais === undefined ? "undefined" : job.pais === null ? "null" : JSON.stringify(job.pais)}</p>
      {job.debugLookup && (
        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#0f172a", borderRadius: 8, border: "1px solid #334155" }}>
          <p className="label-debug-title" style={{ marginBottom: "0.5rem" }}>Comparación con tabla QR → país</p>
          <p style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}><strong>Texto del QR (preview):</strong></p>
          <pre style={{ margin: "0.25rem 0", fontSize: "0.75rem", overflow: "auto", maxHeight: 80 }}>{job.debugLookup.qrTextPreview || "(vacío)"}</pre>
          <p style={{ margin: "0.5rem 0 0.25rem", fontSize: "0.85rem" }}><strong>Candidatos probados:</strong> {job.debugLookup.candidatesCount}</p>
          <p style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}><strong>País obtenido de la tabla lookup:</strong> {job.debugLookup.paisFromLookup ?? "(ninguno — no hubo coincidencia)"}</p>
          {job.debugLookup.candidatesPreview.length > 0 && (
            <>
              <p style={{ margin: "0.5rem 0 0.25rem", fontSize: "0.85rem" }}><strong>Primeros candidatos (para comparar con tu CSV):</strong></p>
              <pre style={{ margin: "0.25rem 0", fontSize: "0.7rem", overflow: "auto", maxHeight: 120 }}>{job.debugLookup.candidatesPreview.join("\n")}</pre>
            </>
          )}
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
            {lines.map((line, i) => (
              <div key={i} className={`label-line ${line.className}`}>
                {line.text}
              </div>
            ))}
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
