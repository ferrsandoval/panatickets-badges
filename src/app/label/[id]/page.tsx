"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import "./label-print.css";

type Job = {
  id: string;
  name: string;
  empresa?: string | null;
  telefono?: string | null;
  email?: string | null;
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

export default function LabelPage() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="label-page">Cargando…</div>;
  if (!job) return <div className="label-page">No encontrado</div>;

  const expoLabel = getExpoLabel(searchParams.get("project"));

  const lines = [
    job.name && { text: job.name, className: "label-name" },
    job.empresa && { text: job.empresa, className: "label-empresa" },
    job.email && { text: job.email, className: "label-email" },
    expoLabel && { text: expoLabel, className: "label-expo" },
  ].filter(Boolean) as { text: string; className: string }[];

  return (
    <div className="label-page">
      <div className="label-content">
        {lines.map((line, i) => (
          <div key={i} className={`label-line ${line.className}`}>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
