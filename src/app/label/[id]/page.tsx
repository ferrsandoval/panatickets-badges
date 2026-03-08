"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useParams, useSearchParams } from "next/navigation";
import "./label-print.css";

type Job = {
  id: string;
  name: string;
  empresa?: string | null;
  telefono?: string | null;
  pais?: string | null;
  rawPayload?: string | null;
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

  const lines = [
    { text: getLabelValue(job.name), className: "label-name" },
    { text: getLabelValue(job.empresa), className: "label-empresa" },
    { text: getLabelValue(job.pais), className: "label-email" },
    { text: getLabelValue(expoLabel), className: "label-expo" },
  ];

  return (
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
  );
}
