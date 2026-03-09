"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { safeDecodeUriComponent, sanitizeForPrint } from "@/lib/print-text";
import "../[id]/label-print.css";

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

/** Deriva nombre para la etiqueta desde qr_content (primera línea o primeros 40 caracteres). */
function nameFromQrContent(qrContent: string): string {
  const t = qrContent.trim();
  const firstLine = t.split(/\r?\n/)[0]?.trim() || t;
  return firstLine.length > 40 ? firstLine.slice(0, 40) : firstLine;
}

function LabelDirectoContent() {
  const searchParams = useSearchParams();
  const project = searchParams.get("project");
  const qrContentParam = searchParams.get("qr_content");
  const paisParam = searchParams.get("pais");
  const nameParam = searchParams.get("name");
  const empresaParam = searchParams.get("empresa");

  const qrContent = qrContentParam ? safeDecodeUriComponent(qrContentParam) : "";
  const rawPais = paisParam ? safeDecodeUriComponent(paisParam) : "";
  const rawName = getLabelValue(nameParam ? safeDecodeUriComponent(nameParam) : "") || nameFromQrContent(qrContent);
  const rawEmpresa = getLabelValue(empresaParam ? safeDecodeUriComponent(empresaParam) : "");
  const pais = sanitizeForPrint(rawPais);
  const name = sanitizeForPrint(rawName);
  const empresa = sanitizeForPrint(rawEmpresa);

  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!qrContent.trim()) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(qrContent, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 180,
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [qrContent]);

  useEffect(() => {
    if (qrContent || name) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [qrContent, name]);

  const expoLabel = getExpoLabel(project);

  const lines = [
    { text: name, className: "label-name" },
    { text: empresa, className: "label-empresa" },
    ...(pais ? [{ text: pais, className: "label-pais" }] : []),
    { text: getLabelValue(expoLabel), className: "label-expo" },
  ];

  if (!qrContent.trim() && !name) {
    return <div className="label-page">Faltan parámetros (qr_content o name).</div>;
  }

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

export default function LabelDirectoPage() {
  return (
    <Suspense fallback={<div className="label-page">Cargando…</div>}>
      <LabelDirectoContent />
    </Suspense>
  );
}
