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

type PrintedJob = {
  id: string;
  name: string;
  empresa: string | null;
  pais: string | null;
  createdAt: string;
  printedAt: string | null;
};

type PrintedJobWithProject = PrintedJob & { projectKey: string; projectLabel: string };

function normalizeForSearch(s: string): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export default function InformeImpresosPage() {
  return (
    <Suspense fallback={<p style={{ margin: "2rem auto", maxWidth: 900 }}>Cargando…</p>}>
      <InformeImpresosContent />
    </Suspense>
  );
}

function InformeImpresosContent() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [allPrintedJobs, setAllPrintedJobs] = useState<PrintedJobWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const projectLabelByKey = useMemo(
    () => Object.fromEntries(PROJECTS.map((p) => [p.key, p.label])),
    []
  );

  const fetchPrintedJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        PROJECTS.map(async ({ key, label }) => {
          const url = new URL("/api/print-jobs", window.location.origin);
          url.searchParams.set("project", key);
          url.searchParams.set("printed", "true");
          url.searchParams.set("limit", "5000");
          const res = await fetch(url.toString());
          if (!res.ok) throw new Error(res.statusText);
          const data = (await res.json()) as PrintedJob[];
          return data.map((job) => ({ ...job, projectKey: key, projectLabel: label }));
        })
      );
      const flat = results.flat();
      setAllPrintedJobs(flat);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
      setAllPrintedJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrintedJobs();
  }, [fetchPrintedJobs, refreshTrigger]);

  const filteredJobs = useMemo(() => {
    let list = allPrintedJobs;
    if (selectedProject) {
      list = list.filter((j) => j.projectKey === selectedProject);
    }
    if (searchQuery.trim()) {
      const q = normalizeForSearch(searchQuery);
      list = list.filter(
        (j) =>
          normalizeForSearch(j.name).includes(q) ||
          normalizeForSearch(j.empresa ?? "").includes(q) ||
          normalizeForSearch(j.pais ?? "").includes(q) ||
          normalizeForSearch(j.projectLabel).includes(q)
      );
    }
    return list.sort((a, b) => {
      const da = a.printedAt || a.createdAt;
      const db = b.printedAt || b.createdAt;
      return new Date(db).getTime() - new Date(da).getTime();
    });
  }, [allPrintedJobs, selectedProject, searchQuery]);

  const exportCsv = () => {
    const headers = ["Nombre", "Empresa", "País", "Expo", "Fecha impresión"];
    const rows = filteredJobs.map((j) => [
      j.name ?? "",
      j.empresa ?? "",
      j.pais ?? "",
      j.projectLabel ?? "",
      j.printedAt ? new Date(j.printedAt).toLocaleString("es") : "",
    ]);
    const csv =
      headers.join(",") +
      "\n" +
      rows
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe-impresos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleString("es", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return s;
    }
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
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Informe de etiquetas impresas</h1>
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
          <button
            type="button"
            onClick={() => setRefreshTrigger((t) => t + 1)}
            style={{
              marginTop: "0.75rem",
              padding: "0.4rem 0.75rem",
              background: "#1e293b",
              color: "#e2e8f0",
              border: "1px solid #475569",
              borderRadius: 6,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </section>
      )}

      <section
        style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          border: "1px solid #334155",
          borderRadius: 12,
          background: "#0f172a",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "flex-end",
        }}
      >
        <div style={{ minWidth: 200, flex: 1 }}>
          <label htmlFor="search-informe" style={{ display: "block", marginBottom: "0.35rem", color: "#94a3b8", fontSize: "0.85rem" }}>
            Buscar
          </label>
          <input
            id="search-informe"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nombre, empresa, país…"
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              background: "#1e293b",
              border: "1px solid #475569",
              borderRadius: 8,
              color: "#e2e8f0",
              fontSize: "0.95rem",
            }}
          />
        </div>
        <div style={{ minWidth: 220 }}>
          <label htmlFor="expo-filter" style={{ display: "block", marginBottom: "0.35rem", color: "#94a3b8", fontSize: "0.85rem" }}>
            Filtrar por expo
          </label>
          <select
            id="expo-filter"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              background: "#1e293b",
              border: "1px solid #475569",
              borderRadius: 8,
              color: "#e2e8f0",
              fontSize: "0.95rem",
            }}
          >
            <option value="">Todas las expos</option>
            {PROJECTS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredJobs.length === 0}
          style={{
            padding: "0.5rem 1rem",
            background: filteredJobs.length === 0 ? "#475569" : "#0ea5e9",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: "0.9rem",
            cursor: filteredJobs.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          Exportar CSV ({filteredJobs.length})
        </button>
        <button
          type="button"
          onClick={() => setRefreshTrigger((t) => t + 1)}
          style={{
            padding: "0.5rem 1rem",
            background: "#1e293b",
            color: "#e2e8f0",
            border: "1px solid #475569",
            borderRadius: 8,
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Actualizar
        </button>
      </section>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Cargando informe…</p>
      ) : (
        <>
          <p style={{ marginBottom: "1rem", color: "#94a3b8", fontSize: "0.9rem" }}>
            Total: <strong style={{ color: "#e2e8f0" }}>{filteredJobs.length}</strong> etiquetas impresas
          </p>

          <div
            style={{
              overflowX: "auto",
              maxHeight: "65vh",
              overflowY: "auto",
              border: "1px solid #334155",
              borderRadius: 12,
              background: "#0f172a",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
              }}
            >
              <thead style={{ position: "sticky", top: 0, background: "#1e293b", zIndex: 1, boxShadow: "0 1px 0 0 #334155" }}>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.75rem 0.85rem", color: "#94a3b8", fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "2px solid #334155", whiteSpace: "nowrap" }}>
                    Nombre
                  </th>
                  <th style={{ textAlign: "left", padding: "0.75rem 0.85rem", color: "#94a3b8", fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "2px solid #334155", whiteSpace: "nowrap" }}>
                    Empresa
                  </th>
                  <th style={{ textAlign: "left", padding: "0.75rem 0.85rem", color: "#94a3b8", fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "2px solid #334155", whiteSpace: "nowrap" }}>
                    País
                  </th>
                  <th style={{ textAlign: "left", padding: "0.75rem 0.85rem", color: "#94a3b8", fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "2px solid #334155", whiteSpace: "nowrap" }}>
                    Expo
                  </th>
                  <th style={{ textAlign: "left", padding: "0.75rem 0.85rem", color: "#94a3b8", fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "2px solid #334155", whiteSpace: "nowrap" }}>
                    Fecha impresión
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                      No hay etiquetas impresas con el filtro actual.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr key={`${job.projectKey}-${job.id}`} style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "0.7rem 0.85rem", color: "#e2e8f0" }}>{job.name || "—"}</td>
                      <td style={{ padding: "0.7rem 0.85rem", color: "#94a3b8" }}>{job.empresa || "—"}</td>
                      <td style={{ padding: "0.7rem 0.85rem", color: "#94a3b8" }}>{job.pais || "—"}</td>
                      <td style={{ padding: "0.7rem 0.85rem", color: "#94a3b8", fontSize: "0.85rem" }}>{job.projectLabel}</td>
                      <td style={{ padding: "0.7rem 0.85rem", color: "#64748b", fontSize: "0.85rem" }}>{formatDate(job.printedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
