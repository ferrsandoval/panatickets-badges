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

type QrLookupRow = { qrContent: string; pais: string };

type RowWithProject = QrLookupRow & { projectKey: string; projectLabel: string };

/** Parsea qr_content para extraer nombre y empresa (líneas, CSV o texto). */
function parseQrContentForTable(qrContent: string): { name: string; empresa: string } {
  const t = qrContent.trim();
  if (!t) return { name: "", empresa: "" };
  const lines = t.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (lines.length >= 2) {
    return { name: lines[0].slice(0, 80), empresa: lines[1].slice(0, 80) };
  }
  if (lines.length === 1) {
    const one = lines[0];
    const byComma = one.split(",").map((s) => s.trim());
    const bySemicolon = one.split(";").map((s) => s.trim());
    if (byComma.length >= 2) return { name: byComma[0].slice(0, 80), empresa: byComma[1].slice(0, 80) };
    if (bySemicolon.length >= 2) return { name: bySemicolon[0].slice(0, 80), empresa: bySemicolon[1].slice(0, 80) };
    return { name: one.slice(0, 80), empresa: "" };
  }
  return { name: t.slice(0, 80), empresa: "" };
}

const LIMIT_PER_PROJECT = 3000;

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
  const [allRows, setAllRows] = useState<RowWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBase, setFilterBase] = useState<string>("");

  const fetchAllQrLookup = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all(
      PROJECTS.map(({ key, label }) => {
        const url = new URL("/api/admin/qr-lookup", window.location.origin);
        url.searchParams.set("project", key);
        url.searchParams.set("limit", String(LIMIT_PER_PROJECT));
        return fetch(url.toString())
          .then((r) => (r.ok ? r.json() : Promise.resolve({ qrLookup: [] })))
          .then((data: { qrLookup?: QrLookupRow[] }) =>
            (data.qrLookup ?? []).map((row) => ({
              ...row,
              projectKey: key,
              projectLabel: label,
            }))
          );
      })
    )
      .then((arrays) => setAllRows(arrays.flat()))
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setAllRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAllQrLookup();
  }, [fetchAllQrLookup]);

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    let list = allRows;
    if (filterBase) list = list.filter((r) => r.projectKey === filterBase);
    if (searchLower) {
      list = list.filter((r) => {
        const { name, empresa } = parseQrContentForTable(r.qrContent);
        return (
          (r.qrContent ?? "").toLowerCase().includes(searchLower) ||
          (r.pais ?? "").toLowerCase().includes(searchLower) ||
          (r.projectLabel ?? "").toLowerCase().includes(searchLower) ||
          (name ?? "").toLowerCase().includes(searchLower) ||
          (empresa ?? "").toLowerCase().includes(searchLower)
        );
      });
    }
    return list;
  }, [allRows, filterBase, searchLower]);

  const openPrintLabel = (row: RowWithProject) => {
    const { name, empresa } = parseQrContentForTable(row.qrContent);
    const labelUrl = new URL("/label/directo", window.location.origin);
    labelUrl.searchParams.set("project", row.projectKey);
    labelUrl.searchParams.set("qr_content", encodeURIComponent(row.qrContent));
    labelUrl.searchParams.set("pais", encodeURIComponent(row.pais));
    if (name) labelUrl.searchParams.set("name", encodeURIComponent(name));
    if (empresa) labelUrl.searchParams.set("empresa", encodeURIComponent(empresa));
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
        Datos de la tabla <strong>QR Content</strong> cargados para comparar (por base de datos). De aquí se obtienen las bases y el contenido; la etiqueta se imprime con el mismo formato que cuando se lee con CodeREADr.
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
              placeholder="Nombre, empresa, país, QR content o base…"
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
          {loading ? "Cargando QR content de todas las bases…" : `${filteredRows.length} de ${allRows.length} filas`}
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
          QR Content — datos filtrados y con formato de impresión
        </h2>
        <p style={{ margin: 0, padding: "0.5rem 1.25rem", fontSize: "0.8rem", color: "#94a3b8", borderBottom: "1px solid #334155" }}>
          Nombre y Empresa se obtienen del QR Content (por líneas o comas). País desde la tabla. Imprimir usa el mismo formato que CodeREADr. Ctrl+P para imprimir.
        </p>
        <div style={tableStyles.wrapper}>
          <table style={tableStyles.table}>
            <thead style={tableStyles.thead}>
              <tr>
                <th style={{ ...tableStyles.th, minWidth: 170 }}>Base de datos</th>
                <th style={{ ...tableStyles.th, minWidth: 140 }}>Nombre</th>
                <th style={{ ...tableStyles.th, minWidth: 140 }}>Empresa</th>
                <th style={{ ...tableStyles.th, minWidth: 90 }}>País</th>
                <th style={{ ...tableStyles.th, minWidth: 220 }}>QR Content</th>
                <th style={{ ...tableStyles.th, textAlign: "right", minWidth: 100 }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading && allRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "2rem", color: "#64748b", textAlign: "center" }}>
                    Cargando QR content de todas las bases…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "2rem", color: "#64748b" }}>
                    {allRows.length === 0 ? "No hay QR content en ninguna base. Sube CSV en Ver bases de datos." : "Ninguna fila coincide con el filtro o búsqueda."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const { name, empresa } = parseQrContentForTable(row.qrContent);
                  return (
                    <tr
                      key={`${row.projectKey}-${idx}-${row.qrContent.slice(0, 40)}`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "";
                      }}
                    >
                      <td style={{ ...tableStyles.td, ...tableStyles.tdMuted, whiteSpace: "nowrap" }}>
                        {row.projectLabel}
                      </td>
                      <td style={{ ...tableStyles.td, fontWeight: 600, color: "#f1f5f9" }}>
                        {name || "—"}
                      </td>
                      <td style={{ ...tableStyles.td, ...tableStyles.tdMuted }}>
                        {empresa || "—"}
                      </td>
                      <td style={{ ...tableStyles.td, color: "#34d399", whiteSpace: "nowrap", fontWeight: 500 }}>
                        {row.pais || "—"}
                      </td>
                      <td
                        style={{
                          ...tableStyles.td,
                          fontFamily: "monospace",
                          fontSize: "0.8rem",
                          color: "#94a3b8",
                          maxWidth: 280,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={row.qrContent}
                      >
                        {row.qrContent}
                      </td>
                      <td style={{ ...tableStyles.td, textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => openPrintLabel(row)}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
