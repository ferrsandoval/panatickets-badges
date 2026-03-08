"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

const PROJECTS = [
  { key: "expo_logistica_2026", label: "EXPO LOGISTICA 2026" },
  { key: "expo_turismo_2026", label: "EXPO TURISMO 2026" },
  { key: "expo_comer_2026", label: "EXPO COMER 2026" },
  { key: "expo_tech_2026", label: "EXPO TECH 2026" },
  { key: "expo_electronica_2026", label: "EXPO ELECTRÓNICA 2026" },
] as const;

type DbStats = {
  project: string;
  printJobsTotal: number;
  printJobsPending: number;
  qrCountryLookupCount: number;
  recentJobs: Array<{
    id: string;
    name: string;
    empresa: string | null;
    pais: string | null;
    createdAt: string;
    printedAt: string | null;
  }>;
};

export default function DatabasesPage() {
  return (
    <Suspense fallback={<p style={{ margin: "2rem auto", maxWidth: 900 }}>Cargando…</p>}>
      <DatabasesContent />
    </Suspense>
  );
}

function DatabasesContent() {
  const [selectedProject, setSelectedProject] = useState<string>(PROJECTS[0].key);
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    setError(null);
    const url = new URL("/api/admin/db-stats", window.location.origin);
    url.searchParams.set("project", selectedProject);
    fetch(url.toString())
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.detail ?? d.error ?? r.statusText)));
        return r.json();
      })
      .then((data: DbStats) => {
        setStats(data);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, [selectedProject]);

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
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Bases de datos por expo</h1>
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
          Selecciona la expo para ver su base de datos
        </label>
        <select
          id="expo-select"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 400,
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
      </section>

      {error && (
        <p style={{ color: "#f87171", marginBottom: "1rem", padding: "1rem", background: "#1e293b", borderRadius: 8 }}>
          {error}
        </p>
      )}

      {loading && !stats && <p style={{ color: "#94a3b8" }}>Cargando estadísticas…</p>}

      {stats && !loading && (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                padding: "1rem",
                border: "1px solid #334155",
                borderRadius: 12,
                background: "#1e293b",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#38bdf8" }}>{stats.printJobsTotal}</div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Etiquetas totales</div>
            </div>
            <div
              style={{
                padding: "1rem",
                border: "1px solid #334155",
                borderRadius: 12,
                background: "#1e293b",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fbbf24" }}>{stats.printJobsPending}</div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Pendientes de imprimir</div>
            </div>
            <div
              style={{
                padding: "1rem",
                border: "1px solid #334155",
                borderRadius: 12,
                background: "#1e293b",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#34d399" }}>{stats.qrCountryLookupCount}</div>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>QR → país (lookup)</div>
            </div>
          </section>

          <section
            style={{
              border: "1px solid #334155",
              borderRadius: 12,
              background: "#0f172a",
              overflow: "hidden",
            }}
          >
            <h2 style={{ margin: 0, padding: "1rem", fontSize: "1rem", borderBottom: "1px solid #334155" }}>
              Últimos registros en <strong>{currentLabel}</strong>
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#1e293b", color: "#94a3b8" }}>
                    <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Nombre</th>
                    <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Empresa</th>
                    <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>País</th>
                    <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Creado</th>
                    <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Impreso</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentJobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "1.5rem", color: "#64748b" }}>
                        No hay registros en esta base de datos.
                      </td>
                    </tr>
                  ) : (
                    stats.recentJobs.map((j) => (
                      <tr key={j.id} style={{ borderTop: "1px solid #1e293b" }}>
                        <td style={{ padding: "0.6rem 0.75rem", color: "#e2e8f0" }}>{j.name}</td>
                        <td style={{ padding: "0.6rem 0.75rem", color: "#cbd5e1" }}>{j.empresa ?? "—"}</td>
                        <td style={{ padding: "0.6rem 0.75rem", color: "#cbd5e1" }}>{j.pais ?? "—"}</td>
                        <td style={{ padding: "0.6rem 0.75rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                          {new Date(j.createdAt).toLocaleString("es")}
                        </td>
                        <td style={{ padding: "0.6rem 0.75rem", color: j.printedAt ? "#34d399" : "#fbbf24" }}>
                          {j.printedAt ? new Date(j.printedAt).toLocaleString("es") : "Pendiente"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
