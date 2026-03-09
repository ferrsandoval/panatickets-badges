"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";

const PROJECTS = [
  { key: "expo_logistica_2026", label: "EXPO LOGISTICA 2026" },
  { key: "expo_turismo_2026", label: "EXPO TURISMO 2026" },
  { key: "expo_comer_2026", label: "EXPOCOMER 2026" },
  { key: "expo_tech_2026", label: "EXPO TECH 2026" },
  { key: "expo_electronica_2026", label: "EXPO ELECTRÓNICA 2026" },
  { key: "expo_logistica_expositores_2026", label: "EXPO LOGISTICA EXPOSITORES 2026" },
  { key: "expo_turismo_expositores_2026", label: "EXPO TURISMO EXPOSITORES 2026" },
  { key: "expo_comer_expositores_2026", label: "EXPOCOMER EXPOSITORES 2026" },
  { key: "expo_tech_expositores_2026", label: "EXPO TECH EXPOSITORES 2026" },
  { key: "expo_electronica_expositores_2026", label: "EXPO ELECTRÓNICA EXPOSITORES 2026" },
] as const;

type PrintJob = {
  id: string;
  name: string;
  empresa: string | null;
  createdAt: string;
  printedAt: string | null;
};

export default function ImprimirExpositoresPage() {
  return (
    <Suspense fallback={<p style={{ margin: "2rem auto", maxWidth: 900 }}>Cargando…</p>}>
      <ImprimirExpositoresContent />
    </Suspense>
  );
}

function ImprimirExpositoresContent() {
  const [selectedProject, setSelectedProject] = useState<string>(PROJECTS[0].key);
  const [showPrinted, setShowPrinted] = useState(false);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    setError(null);
    const url = new URL("/api/print-jobs", window.location.origin);
    url.searchParams.set("project", selectedProject);
    url.searchParams.set("printed", showPrinted ? "true" : "false");
    fetch(url.toString())
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.detail ?? d.error ?? r.statusText)));
        return r.json();
      })
      .then((data: PrintJob[]) => setJobs(data))
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setJobs([]);
      })
      .finally(() => setLoading(false));
  }, [selectedProject, showPrinted]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const openPrintLabel = (jobId: string) => {
    const labelUrl = new URL(`/label/${jobId}`, window.location.origin);
    labelUrl.searchParams.set("project", selectedProject);
    window.open(labelUrl.toString(), "_blank", "noopener,noreferrer,width=400,height=400");
  };

  const currentLabel = PROJECTS.find((p) => p.key === selectedProject)?.label ?? selectedProject;

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "1rem" }}>
      <section
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.5rem",
          padding: "1rem 1.25rem",
          border: "1px solid #334155",
          borderRadius: 16,
          background:
            "linear-gradient(135deg, rgba(2,6,23,0.96) 0%, rgba(15,23,42,0.96) 60%, rgba(8,47,73,0.96) 100%)",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#38bdf8",
            textDecoration: "none",
            fontSize: "0.9rem",
          }}
        >
          ← Cola de impresión
        </Link>
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#e2e8f0" }}>Imprimir expositores</h1>
      </section>

      <section
        style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          border: "1px solid #334155",
          borderRadius: 12,
          background: "#0f172a",
        }}
      >
        <label htmlFor="expo-select" style={{ display: "block", marginBottom: "0.5rem", color: "#94a3b8" }}>
          Base de datos (expo)
        </label>
        <select
          id="expo-select"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 420,
            padding: "0.6rem 0.75rem",
            fontSize: "1rem",
            background: "#1e293b",
            color: "#e2e8f0",
            border: "1px solid #475569",
            borderRadius: 8,
          }}
        >
          {PROJECTS.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#94a3b8", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={showPrinted}
              onChange={(e) => setShowPrinted(e.target.checked)}
              style={{ accentColor: "#0ea5e9" }}
            />
            Mostrar ya impresas
          </label>
        </div>
      </section>

      {error && (
        <section
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            background: "rgba(248, 113, 113, 0.1)",
            border: "1px solid #f87171",
            borderRadius: 8,
            color: "#fca5a5",
          }}
        >
          <strong>Error</strong>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>{error}</p>
        </section>
      )}

      {loading && !jobs.length ? (
        <p style={{ color: "#94a3b8" }}>Cargando etiquetas…</p>
      ) : (
        <section
          style={{
            border: "1px solid #334155",
            borderRadius: 12,
            background: "#0f172a",
            overflow: "hidden",
          }}
        >
          <h2 style={{ margin: 0, padding: "1rem", fontSize: "1rem", borderBottom: "1px solid #334155", color: "#e2e8f0" }}>
            {showPrinted ? "Etiquetas ya impresas" : "Pendientes de imprimir"} — <strong>{currentLabel}</strong>
          </h2>
          <p style={{ margin: 0, padding: "0.5rem 1rem", fontSize: "0.8rem", color: "#94a3b8", borderBottom: "1px solid #334155" }}>
            Haz clic en &quot;Imprimir&quot; para abrir la etiqueta en una nueva ventana y usar Ctrl+P (o Cmd+P) para imprimir.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#1e293b", color: "#94a3b8" }}>
                  <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Nombre</th>
                  <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Empresa</th>
                  <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Creado</th>
                  <th style={{ textAlign: "right", padding: "0.6rem 0.75rem" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "1.5rem", color: "#64748b" }}>
                      {showPrinted ? "No hay etiquetas impresas en esta base." : "No hay etiquetas pendientes de imprimir."}
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} style={{ borderTop: "1px solid #1e293b" }}>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#e2e8f0" }}>{job.name}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#cbd5e1" }}>{job.empresa ?? "—"}</td>
                      <td style={{ padding: "0.6rem 0.75rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {new Date(job.createdAt).toLocaleString("es")}
                      </td>
                      <td style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => openPrintLabel(job.id)}
                          style={{
                            padding: "0.4rem 0.75rem",
                            background: "#0ea5e9",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          Imprimir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
