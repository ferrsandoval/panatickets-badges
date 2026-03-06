"use client";

import { useEffect, useState } from "react";

type PrintJob = {
  id: string;
  name: string;
  createdAt: string;
  printedAt: string | null;
};

const PROJECTS = [
  { key: "expo_logistica_2026", label: "EXPO LOGISTICA 2026" },
  { key: "expo_turismo_2026", label: "EXPO TURISMO 2026" },
  { key: "expo_comer_2026", label: "EXPO COMER 2026" },
  { key: "expo_tech_2026", label: "EXPO TECH 2026" },
  { key: "expo_electronica_2026", label: "EXPO ELECTRÓNICA 2026" },
] as const;

type JobsByProject = Record<string, PrintJob[]>;

export default function PrintQueuePage() {
  const [jobsByProject, setJobsByProject] = useState<JobsByProject>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        PROJECTS.map(async ({ key }) => {
          const url = new URL("/api/print-jobs", window.location.origin);
          url.searchParams.set("printed", "false");
          url.searchParams.set("project", key);
          const res = await fetch(url.toString());
          if (!res.ok) throw new Error(res.statusText);
          const data = (await res.json()) as PrintJob[];
          return [key, data] as const;
        })
      );
      setJobsByProject(Object.fromEntries(results));
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

  const handlePrint = (projectKey: string, id: string) => {
    const url = `/label/${id}?project=${encodeURIComponent(projectKey)}`;
    const w = window.open(url, "_blank", "width=400,height=300");
    if (w) w.focus();
  };

  const handleMarkPrinted = async (projectKey: string, id: string) => {
    try {
      const url = new URL(`/api/print-jobs/${id}`, window.location.origin);
      url.searchParams.set("project", projectKey);
      const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printed: true }),
      });
      if (!res.ok) throw new Error(res.statusText);
      setJobsByProject((prev) => ({
        ...prev,
        [projectKey]: (prev[projectKey] ?? []).filter((j) => j.id !== id),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al marcar");
    }
  };

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Colas de impresión – Expos 2026</h1>
      <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
        Todas las expos se muestran en esta pantalla. Imprimir abre la vista de etiqueta con la expo correspondiente;
        luego marca como impreso.
      </p>

      {error && (
        <p style={{ color: "#f87171", marginBottom: "1rem" }}>{error}</p>
      )}

      {loading && Object.values(jobsByProject).every((list) => (list ?? []).length === 0) ? (
        <p>Cargando…</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {PROJECTS.map(({ key, label }) => {
            const jobs = jobsByProject[key] ?? [];
            return (
              <section
                key={key}
                style={{
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "0.75rem",
                  background: "#020617",
                }}
              >
                <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{label}</h2>
                {jobs.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: "0.875rem" }}>No hay etiquetas pendientes.</p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1e293b", textAlign: "left" }}>
                        <th style={{ padding: "0.4rem" }}>Nombre</th>
                        <th style={{ padding: "0.4rem" }}>Recibido</th>
                        <th style={{ padding: "0.4rem", width: 140 }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr key={job.id} style={{ borderBottom: "1px solid #1e293b" }}>
                          <td style={{ padding: "0.4rem" }}>{job.name}</td>
                          <td style={{ padding: "0.4rem", color: "#94a3b8" }}>
                            {new Date(job.createdAt).toLocaleString("es")}
                          </td>
                          <td style={{ padding: "0.4rem" }}>
                            <button
                              type="button"
                              onClick={() => handlePrint(key, job.id)}
                              style={{
                                marginRight: 4,
                                marginBottom: 4,
                                padding: "4px 8px",
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
                              onClick={() => handleMarkPrinted(key, job.id)}
                              style={{
                                padding: "4px 8px",
                                background: "#334155",
                                color: "#e2e8f0",
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                              }}
                            >
                              Marcado
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
