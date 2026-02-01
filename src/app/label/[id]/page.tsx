"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import "./label-print.css";

type Job = {
  id: string;
  name: string;
  empresa?: string | null;
  pais?: string | null;
  feria?: string | null;
};

export default function LabelPage() {
  const params = useParams();
  const id = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/print-jobs/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setJob(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!job) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [job]);

  if (loading) return <div className="label-page">Cargando…</div>;
  if (!job) return <div className="label-page">No encontrado</div>;

  const lines = [
    job.name,
    job.empresa,
  ].filter(Boolean) as string[];

  return (
    <div className="label-page">
      <div className="label-content">
        {lines.map((line, i) => (
          <div key={i} className="label-line">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
