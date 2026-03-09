"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

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

type PrintJobRow = {
  id: string;
  name: string;
  empresa: string | null;
  telefono: string | null;
  email: string | null;
  pais: string | null;
  createdAt: string;
  printedAt: string | null;
};

type JobWithProject = PrintJobRow & { projectKey: string; projectLabel: string };

const LIMIT_PER_PROJECT = 500;

const tableStyles = {
  wrapper: {
    overflowX: "auto" as const,
    maxHeight: "65vh",
    overflowY: "auto" as const,
  },
  table: {
    width: "100%" as const,
    borderCollapse: "collapse" as const,
    fontSize: "0.875rem",
  },
  thead: {
    position: "sticky" as const,
    top: 0,
    background: "#1e293b",
    zIndex: 1,
    boxShadow: "0 1px 0 0 #334155",
  },
  th: {
    textAlign: "left" as const,
    padding: "0.75rem 0.85rem",
    color: "#94a3b8",
    fontWeight: 600,
    fontSize: "0.8rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    borderBottom: "2px solid #334155",
    whiteSpace: "nowrap" as const,
  },
  td: {
    padding: "0.7rem 0.85rem",
    borderBottom: "1px solid #1e293b",
    color: "#e2e8f0",
    verticalAlign: "middle" as const,
  },
  tdMuted: {
    color: "#94a3b8",
    fontSize: "0.85rem",
  },
};

export default function ImprimirExpositoresPage() {
  return (
    <Suspense fallback={<p style={{ margin: "2rem auto", maxWidth: 900 }}>Cargando…</p>}>
      <ImprimirExpositoresContent />
    </Suspense>
  );
}

function ImprimirExpositoresContent() {
  const [allJobs, setAllJobs] = useState<JobWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBase, setFilterBase] = useState<string>("");

  const fetchAllBases = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all(
      PROJECTS.map(({ key, label }) => {
        const url = new URL("/api/print-jobs", window.location.origin);
        url.searchParams.set("project", key);
        url.searchParams.set("printed", "all");
        url.searchParams.set("limit", String(LIMIT_PER_PROJECT));
        return fetch(url.toString())
          .then((r) => (r.ok ? r.json() : Promise.resolve([])))
          .then((data: PrintJobRow[]) =>
            data.map((j) => ({
              ...j,
              projectKey: key,
              projectLabel: label,
            }))
          );
      })
    )
      .then((arrays) => setAllJobs(arrays.flat()))
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setAllJobs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAllBases();
  }, [fetchAllBases]);

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredJobs = useMemo(() => {
    let list = allJobs;
    if (filterBase) list = list.filter((j) => j.projectKey === filterBase);
    if (searchLower) {
      list = list.filter(
        (j) =>
          (j.name ?? "").toLowerCase().includes(searchLower) ||
          (j.empresa ?? "").toLowerCase().includes(searchLower) ||
          (j.telefono ?? "").toLowerCase().includes(searchLower) ||
          (j.email ?? "").toLowerCase().includes(searchLower) ||
          (j.pais ?? "").toLowerCase().includes(searchLower) ||
          (j.projectLabel ?? "").toLowerCase().includes(searchLower)
      );
    }
    return list;
  }, [allJobs, filterBase, searchLower]);

  const openPrintLabel = (jobId: string, projectKey: string) => {
    const labelUrl = new URL(`/label/${jobId}`, window.location.origin);
    labelUrl.searchParams.set("project", projectKey);
    window.open(labelUrl.toString(), "_blank", "noopener,noreferrer,width=420,height=380");
  };

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "1rem" }}>
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
        <Link href="/" style={{ color: "#38bdf8", textDecoration: "none", fontSize: "0.9rem" }}>
          ← Cola de impresión
        </Link>
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#e2e8f0" }}>Imprimir expositores</h1>
      </section>

      <p style={{ margin: "0 0 1rem", color: "#94a3b8", fontSize: "0.9rem" }}>
        Registros cargados en las bases de datos (mismo formato que al leer con CodeREADr). Imprime la etiqueta con el mismo diseño.
      </p>

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

      <section
        style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          border: "1px solid #334155",
          borderRadius: 12,
          background: "#0f172a",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <label htmlFor="search" style={{ display: "block", marginBottom: "0.25rem", color: "#94a3b8", fontSize: "0.8rem" }}>
              Buscar
            </label>
            <input
              id="search"
              type="search"
              placeholder="Nombre, teléfono, email, empresa, país o base…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                fontSize: "0.9rem",
                background: "#1e293b",
                color: "#e2e8f0",
                border: "1px solid #475569",
                borderRadius: 8,
              }}
            />
          </div>
          <div style={{ flex: "0 1 280px", minWidth: 0 }}>
            <label htmlFor="filter-base" style={{ display: "block", marginBottom: "0.25rem", color: "#94a3b8", fontSize: "0.8rem" }}>
              Filtrar por base
            </label>
            <select
              id="filter-base"
              value={filterBase}
              onChange={(e) => setFilterBase(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                fontSize: "0.9rem",
                background: "#1e293b",
                color: "#e2e8f0",
                border: "1px solid #475569",
                borderRadius: 8,
              }}
            >
              <option value="">Todas las bases</option>
              {PROJECTS.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p style={{ margin: "0.75rem 0 0", fontSize: "0.8rem", color: "#64748b" }}>
          {loading ? "Cargando todas las bases…" : `${filteredJobs.length} de ${allJobs.length} registros`}
        </p>
      </section>

      <section
        style={{
          border: "1px solid #334155",
          borderRadius: 12,
          background: "#0f172a",
          overflow: "hidden",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2), 0 2px 4px -2px rgba(0,0,0,0.15)",
        }}
      >
        <h2 style={{ margin: 0, padding: "1rem 1.25rem", fontSize: "1.05rem", borderBottom: "1px solid #334155", color: "#e2e8f0" }}>
          Registros — imprimir mismo formato que CodeREADr
        </h2>
        <p style={{ margin: 0, padding: "0.5rem 1.25rem", fontSize: "0.8rem", color: "#94a3b8", borderBottom: "1px solid #334155" }}>
          Clic en &quot;Imprimir&quot; abre la etiqueta con el mismo diseño (nombre, empresa, país, QR, expo). Ctrl+P para imprimir.
        </p>
        <div style={tableStyles.wrapper}>
          <table style={tableStyles.table}>
            <thead style={tableStyles.thead}>
              <tr>
                <th style={{ ...tableStyles.th, minWidth: 160 }}>Base de datos</th>
                <th style={{ ...tableStyles.th, minWidth: 140 }}>Nombre</th>
                <th style={{ ...tableStyles.th, minWidth: 110 }}>Teléfono</th>
                <th style={{ ...tableStyles.th, minWidth: 160 }}>Email</th>
                <th style={{ ...tableStyles.th, minWidth: 140 }}>Empresa</th>
                <th style={{ ...tableStyles.th, minWidth: 90 }}>País</th>
                <th style={{ ...tableStyles.th, textAlign: "right", minWidth: 100 }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading && allJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "2rem", color: "#64748b", textAlign: "center" }}>
                    Cargando registros de todas las bases…
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "2rem", color: "#64748b" }}>
                    {allJobs.length === 0 ? "No hay registros en ninguna base." : "Ningún registro coincide con el filtro o búsqueda."}
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr
                    key={`${job.projectKey}-${job.id}`}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "";
                    }}
                  >
                    <td style={{ ...tableStyles.td, ...tableStyles.tdMuted, whiteSpace: "nowrap" }}>
                      {job.projectLabel}
                    </td>
                    <td style={tableStyles.td}>{job.name}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.tdMuted }}>{job.telefono ?? "—"}</td>
                    <td style={{ ...tableStyles.td, ...tableStyles.tdMuted, fontSize: "0.85rem" }}>{job.email ?? "—"}</td>
                    <td style={tableStyles.td}>{job.empresa ?? "—"}</td>
                    <td style={{ ...tableStyles.td, color: "#34d399", whiteSpace: "nowrap" }}>{job.pais ?? "—"}</td>
                    <td style={{ ...tableStyles.td, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => openPrintLabel(job.id, job.projectKey)}
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
    </main>
  );
}
