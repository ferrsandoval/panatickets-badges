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
  pais: string | null;
  createdAt: string;
  printedAt: string | null;
};

type JobWithProject = PrintJobRow & { projectKey: string; projectLabel: string };

const LIMIT_PER_PROJECT = 400;

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
          .then((data: PrintJobRow[]) => data.map((j) => ({ ...j, projectKey: key, projectLabel: label })));
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
    if (filterBase) {
      list = list.filter((j) => j.projectKey === filterBase);
    }
    if (searchLower) {
      list = list.filter(
        (j) =>
          (j.name ?? "").toLowerCase().includes(searchLower) ||
          (j.empresa ?? "").toLowerCase().includes(searchLower) ||
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
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem" }}>
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

      <p style={{ margin: "0 0 1rem", color: "#94a3b8", fontSize: "0.9rem" }}>
        Registros cargados en todas las bases de datos. Puedes imprimir cualquier etiqueta directamente sin pasar por CodeREADr.
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
              placeholder="Nombre, empresa, país o base…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
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
                padding: "0.5rem 0.75rem",
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
        }}
      >
        <h2 style={{ margin: 0, padding: "1rem", fontSize: "1rem", borderBottom: "1px solid #334155", color: "#e2e8f0" }}>
          Registros (todas las bases)
        </h2>
        <p style={{ margin: 0, padding: "0.5rem 1rem", fontSize: "0.8rem", color: "#94a3b8", borderBottom: "1px solid #334155" }}>
          Haz clic en &quot;Imprimir&quot; para abrir la etiqueta en una nueva ventana. Imprime con Ctrl+P (o Cmd+P). No requiere CodeREADr.
        </p>
        <div style={{ overflowX: "auto", maxHeight: "65vh", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead style={{ position: "sticky", top: 0, background: "#1e293b", zIndex: 1 }}>
              <tr style={{ color: "#94a3b8" }}>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Base de datos</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Nombre</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Empresa</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>País</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Creado</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Impreso</th>
                <th style={{ textAlign: "right", padding: "0.6rem 0.75rem" }}>Acción</th>
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
                  <tr key={`${job.projectKey}-${job.id}`} style={{ borderTop: "1px solid #1e293b" }}>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#94a3b8", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {job.projectLabel}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#e2e8f0" }}>{job.name}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#cbd5e1" }}>{job.empresa ?? "—"}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#cbd5e1" }}>{job.pais ?? "—"}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                      {new Date(job.createdAt).toLocaleString("es")}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: job.printedAt ? "#34d399" : "#fbbf24" }}>
                      {job.printedAt ? new Date(job.printedAt).toLocaleString("es") : "Pendiente"}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => openPrintLabel(job.id, job.projectKey)}
                        style={{
                          padding: "0.35rem 0.65rem",
                          background: "#0ea5e9",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          fontSize: "0.8rem",
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
