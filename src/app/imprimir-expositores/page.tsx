"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { extractQrTextFromPayload } from "@/lib/qr-lookup";
import {
  parseNameFromQrText,
  parseEmpresaFromQrText,
  parseTelefonoFromQrText,
  parseEmailFromQrText,
} from "@/lib/qr-parser";
import { hasUnprintableOrRisky } from "@/lib/print-text";
import { PROJECTS_EXPOSITORES } from "@/lib/print-projects";
import { ManualUserEntry } from "@/components/manual-user-entry";

const PROJECTS = PROJECTS_EXPOSITORES;

type QrLookupRow = { qrContent: string; pais: string; empresa?: string };

type RowWithProject = QrLookupRow & { projectKey: string; projectLabel: string };

/** Indica si la base es de tipo EXPOSITORES (formato CSV: QR Content, Empresa, País). */
function isExpositoresProject(projectKey: string): boolean {
  return projectKey.includes("expositores");
}

/** Normaliza texto para búsqueda: trim, minúsculas, espacios colapsados. */
function normalizeForSearch(s: string): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Obtiene y filtra la información del QR Content usando el mismo parser que CodeREADr.
 * Quita prefijo [point:xxx] y extrae nombre, empresa, teléfono, email.
 */
function getParsedFieldsFromQrContent(qrContent: string): {
  qrText: string;
  name: string;
  empresa: string;
  telefono: string;
  email: string;
} {
  const qrText = extractQrTextFromPayload(qrContent).trim() || qrContent.trim();
  const name = parseNameFromQrText(qrText)?.trim().slice(0, 80) ?? "";
  const empresa = parseEmpresaFromQrText(qrText)?.trim().slice(0, 80) ?? "";
  const telefono = parseTelefonoFromQrText(qrText)?.trim().slice(0, 40) ?? "";
  const email = parseEmailFromQrText(qrText)?.trim().slice(0, 80) ?? "";
  return { qrText, name, empresa, telefono, email };
}

/**
 * EXPOSITORES: Columna 1 = texto con Nombre='...'; Empresa=''; etc. Columna 2 = País. Columna 3 = Empresa.
 * Extrae Nombre (y opcionalmente Email, Teléfono) de la columna 1; Empresa y País de las columnas de la tabla.
 */
function getDisplayFields(row: RowWithProject): {
  name: string;
  empresa: string;
  pais: string;
  telefono: string;
  email: string;
} {
  if (isExpositoresProject(row.projectKey)) {
    const qrText = ((extractQrTextFromPayload(row.qrContent) || row.qrContent) ?? "").trim();
    const name = (parseNameFromQrText(qrText) ?? "").trim().slice(0, 80);
    const empresa = (row.empresa ?? "").trim();
    const pais = (row.pais ?? "").trim();
    const telefono = (parseTelefonoFromQrText(qrText) ?? "").trim().slice(0, 40);
    const email = (parseEmailFromQrText(qrText) ?? "").trim().slice(0, 80);
    return { name, empresa, pais, telefono, email };
  }
  const parsed = getParsedFieldsFromQrContent(row.qrContent);
  return {
    name: parsed.name,
    empresa: parsed.empresa,
    pais: (row.pais ?? "").trim(),
    telefono: parsed.telefono,
    email: parsed.email,
  };
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
      PROJECTS.map(async ({ key, label }) => {
        const url = new URL("/api/admin/qr-lookup", window.location.origin);
        url.searchParams.set("project", key);
        url.searchParams.set("limit", String(LIMIT_PER_PROJECT));
        const r = await fetch(url.toString());
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg = (data?.detail ?? data?.error ?? r.statusText) || "Error al cargar";
          return { rows: [] as RowWithProject[], error: `${label}: ${msg}` };
        }
        const rows = (data?.qrLookup ?? []).map((row: QrLookupRow) => ({
          ...row,
          projectKey: key,
          projectLabel: label,
        }));
        return { rows, error: undefined as string | undefined };
      })
    )
      .then((results) => {
        const all = results.flatMap((r) => r.rows);
        const errors = results.map((r) => r.error).filter(Boolean) as string[];
        setAllRows(all);
        setError(errors.length > 0 ? errors.join(" | ") : null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setAllRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAllQrLookup();
  }, [fetchAllQrLookup]);

  const searchNormalized = normalizeForSearch(searchQuery);
  const filteredRows = useMemo(() => {
    let list = allRows;
    if (filterBase) list = list.filter((r) => r.projectKey === filterBase);
    if (searchNormalized) {
      const terms = searchNormalized.split(/\s+/).filter(Boolean);
      list = list.filter((r) => {
        const display = getDisplayFields(r);
        const searchable = [
          r.qrContent,
          r.pais,
          r.empresa,
          r.projectLabel,
          display.name,
          display.empresa,
          display.telefono,
          display.email,
        ].map(normalizeForSearch);
        const full = searchable.join(" ");
        return terms.every((term) => full.includes(term));
      });
    }
    return list;
  }, [allRows, filterBase, searchNormalized]);

  const openPrintLabel = (row: RowWithProject) => {
    const { name, empresa, pais } = getDisplayFields(row);
    const labelUrl = new URL("/label/directo", window.location.origin);
    labelUrl.searchParams.set("project", row.projectKey);
    labelUrl.searchParams.set("qr_content", encodeURIComponent(row.qrContent));
    labelUrl.searchParams.set("pais", encodeURIComponent(pais));
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
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
          padding: "1rem 1.25rem",
          border: "1px solid #334155",
          borderRadius: 16,
          background:
            "linear-gradient(135deg, rgba(2,6,23,0.96) 0%, rgba(15,23,42,0.96) 60%, rgba(8,47,73,0.96) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "#38bdf8", textDecoration: "none", fontSize: "0.9rem" }}>
            ← Cola de impresión
          </Link>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#e2e8f0" }}>Imprimir expositores</h1>
        </div>
        <ManualUserEntry
          projects={PROJECTS}
          buttonLabel="Ingresar expositor manual"
          onSaved={fetchAllQrLookup}
        />
      </section>

      <p style={{ margin: "0 0 1rem", color: "#94a3b8", fontSize: "0.9rem" }}>
        Datos de las 5 bases <strong>expositores</strong>. Columna 1: texto con Nombre, Email, Celular (se extraen). Columna 2: País. Columna 3: Empresa.
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
          <button
            type="button"
            onClick={() => fetchAllQrLookup()}
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
          {loading ? "Cargando QR content de las bases expositores…" : `${filteredRows.length} de ${allRows.length} filas`}
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
          Columna 1: se extrae Nombre, Email y Teléfono/Celular. Columna 2: País. Columna 3: Empresa. Busca por cualquier campo. Imprimir = mismo formato. Ctrl+P.
        </p>
        <div style={tableStyles.wrapper}>
          <table style={tableStyles.table}>
            <thead style={tableStyles.thead}>
              <tr>
                <th style={{ ...tableStyles.th, minWidth: 160 }}>Base de datos</th>
                <th style={{ ...tableStyles.th, minWidth: 120 }}>Nombre</th>
                <th style={{ ...tableStyles.th, minWidth: 100 }}>Teléfono</th>
                <th style={{ ...tableStyles.th, minWidth: 140 }}>Email</th>
                <th style={{ ...tableStyles.th, minWidth: 120 }}>Empresa</th>
                <th style={{ ...tableStyles.th, minWidth: 80 }}>País</th>
                <th style={{ ...tableStyles.th, minWidth: 180 }}>QR Content</th>
                <th style={{ ...tableStyles.th, textAlign: "right", minWidth: 90 }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading && allRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "2rem", color: "#64748b", textAlign: "center" }}>
                    Cargando QR content de las bases expositores…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "2rem", color: "#64748b" }}>
                    {allRows.length === 0 ? "No hay QR content en ninguna base. Sube CSV en Ver bases de datos." : "Ninguna fila coincide con el filtro o búsqueda."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const display = getDisplayFields(row);
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
                        {display.name || "—"}
                        {hasUnprintableOrRisky(display.name) && (
                          <span title="Contiene % o caracteres que pueden no imprimirse bien" style={{ marginLeft: 4, color: "#fbbf24" }}>⚠</span>
                        )}
                      </td>
                      <td style={{ ...tableStyles.td, ...tableStyles.tdMuted, whiteSpace: "nowrap" }}>
                        {display.telefono || "—"}
                        {hasUnprintableOrRisky(display.telefono) && (
                          <span title="Contiene % o caracteres que pueden no imprimirse bien" style={{ marginLeft: 4, color: "#fbbf24" }}>⚠</span>
                        )}
                      </td>
                      <td style={{ ...tableStyles.td, ...tableStyles.tdMuted, fontSize: "0.85rem" }}>
                        {display.email || "—"}
                        {hasUnprintableOrRisky(display.email) && (
                          <span title="Contiene % o caracteres que pueden no imprimirse bien" style={{ marginLeft: 4, color: "#fbbf24" }}>⚠</span>
                        )}
                      </td>
                      <td style={{ ...tableStyles.td, ...tableStyles.tdMuted }}>
                        {display.empresa || "—"}
                        {hasUnprintableOrRisky(display.empresa) && (
                          <span title="Contiene % o caracteres que pueden no imprimirse bien" style={{ marginLeft: 4, color: "#fbbf24" }}>⚠</span>
                        )}
                      </td>
                      <td style={{ ...tableStyles.td, color: "#34d399", whiteSpace: "nowrap", fontWeight: 500 }}>
                        {display.pais || "—"}
                        {hasUnprintableOrRisky(display.pais) && (
                          <span title="Contiene % o caracteres que pueden no imprimirse bien" style={{ marginLeft: 4, color: "#fbbf24" }}>⚠</span>
                        )}
                      </td>
                      <td
                        style={{
                          ...tableStyles.td,
                          fontFamily: "monospace",
                          fontSize: "0.78rem",
                          color: "#94a3b8",
                          maxWidth: 240,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={row.qrContent}
                      >
                        {row.qrContent}
                        {hasUnprintableOrRisky(row.qrContent) && (
                          <span title="Contiene % o caracteres que pueden no imprimirse bien" style={{ marginLeft: 4, color: "#fbbf24" }}>⚠</span>
                        )}
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
