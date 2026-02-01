"use client";

import { useEffect, useState } from "react";

type PrintJob = {
  id: string;
  name: string;
  createdAt: string;
  printedAt: string | null;
};

export default function PrintQueuePage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/print-jobs?printed=false");
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setJobs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const t = setInterval(fetchJobs, 5000);
    return () => clearInterval(t);
  }, []);

  const handlePrint = (id: string) => {
    const w = window.open(`/label/${id}`, "_blank", "width=400,height=300");
    if (w) w.focus();
  };

  const handleMarkPrinted = async (id: string) => {
    try {
      const res = await fetch(`/api/print-jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printed: true }),
      });
      if (!res.ok) throw new Error(res.statusText);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al marcar");
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Cola de impresión</h1>
      <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
        Etiquetas pendientes. Imprimir abre la vista de etiqueta; luego marcar como impreso.
      </p>

      {error && (
        <p style={{ color: "#f87171", marginBottom: "1rem" }}>{error}</p>
      )}

      {loading && jobs.length === 0 ? (
        <p>Cargando…</p>
      ) : jobs.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>No hay etiquetas pendientes.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155", textAlign: "left" }}>
              <th style={{ padding: "0.75rem" }}>Nombre</th>
              <th style={{ padding: "0.75rem" }}>Recibido</th>
              <th style={{ padding: "0.75rem", width: 200 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} style={{ borderBottom: "1px solid #334155" }}>
                <td style={{ padding: "0.75rem" }}>{job.name}</td>
                <td style={{ padding: "0.75rem", color: "#94a3b8" }}>
                  {new Date(job.createdAt).toLocaleString("es")}
                </td>
                <td style={{ padding: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => handlePrint(job.id)}
                    style={{
                      marginRight: 8,
                      padding: "6px 12px",
                      background: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Imprimir
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkPrinted(job.id)}
                    style={{
                      padding: "6px 12px",
                      background: "#334155",
                      color: "#e2e8f0",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Marcar impreso
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
