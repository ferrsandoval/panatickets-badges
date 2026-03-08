"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

const PROJECTS = [
  { key: "expo_logistica_2026", label: "EXPO LOGISTICA 2026" },
  { key: "expo_turismo_2026", label: "EXPO TURISMO 2026" },
  { key: "expo_comer_2026", label: "EXPO COMER 2026" },
  { key: "expo_tech_2026", label: "EXPO TECH 2026" },
  { key: "expo_electronica_2026", label: "EXPO ELECTRÓNICA 2026" },
] as const;

type DbStats = {
  project: string;
  usingDefaultDatabase?: boolean;
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
  qrCountryLookup: Array<{ qrContent: string; pais: string }>;
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [uploadToken, setUploadToken] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStats = useCallback(() => {
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

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshTrigger]);

  const handleUploadCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);
    if (!uploadToken.trim()) {
      setUploadError("Introduce el token de administrador (WEBHOOK_SECRET).");
      return;
    }
    if (!uploadFile) {
      setUploadError("Selecciona un archivo CSV.");
      return;
    }
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.set("file", uploadFile);
      const url = new URL("/api/admin/upload-qr-pais-csv", window.location.origin);
      url.searchParams.set("project", selectedProject);
      url.searchParams.set("token", uploadToken.trim());
      const res = await fetch(url.toString(), { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail ?? data.error ?? res.statusText);
      }
      setUploadSuccess(data.message ?? `Importadas ${data.total ?? 0} filas.`);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadLoading(false);
    }
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

      {stats && stats.usingDefaultDatabase && (
        <section
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            background: "rgba(251, 191, 36, 0.15)",
            border: "1px solid #f59e0b",
            borderRadius: 8,
            color: "#fbbf24",
          }}
        >
          <strong>Base por defecto.</strong> Para la expo &quot;{stats.project}&quot; no está configurada la variable de entorno (ej.{" "}
          <code style={{ fontSize: "0.85em" }}>DATABASE_URL_{stats.project.toUpperCase().replace(/[^A-Z0-9]/g, "_")}</code>
          ). Se muestra la base de datos por defecto (<code>DATABASE_URL</code>). Configura las variables en Vercel y redeploy para ver cada expo por separado.
        </section>
      )}

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

          <section
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              border: "1px solid #334155",
              borderRadius: 12,
              background: "#0f172a",
            }}
          >
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Subir CSV (qr_content,pais)</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "#94a3b8" }}>
              Carga un archivo CSV con cabecera <code>qr_content,pais</code> para rellenar la tabla de lookup de esta expo.
            </p>
            <form onSubmit={handleUploadCsv} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
              <div style={{ minWidth: 200 }}>
                <label htmlFor="upload-token" style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.25rem" }}>
                  Token de admin
                </label>
                <input
                  id="upload-token"
                  type="password"
                  value={uploadToken}
                  onChange={(e) => setUploadToken(e.target.value)}
                  placeholder="WEBHOOK_SECRET"
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.6rem",
                    background: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: 6,
                    color: "#e2e8f0",
                    fontSize: "0.9rem",
                  }}
                />
              </div>
              <div style={{ minWidth: 180 }}>
                <label htmlFor="upload-csv" style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.25rem" }}>
                  Archivo CSV
                </label>
                <input
                  ref={fileInputRef}
                  id="upload-csv"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  style={{
                    width: "100%",
                    padding: "0.4rem",
                    background: "#1e293b",
                    border: "1px solid #475569",
                    borderRadius: 6,
                    color: "#e2e8f0",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={uploadLoading}
                style={{
                  padding: "0.5rem 1rem",
                  background: uploadLoading ? "#475569" : "#0ea5e9",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: "0.9rem",
                  cursor: uploadLoading ? "not-allowed" : "pointer",
                }}
              >
                {uploadLoading ? "Subiendo…" : "Subir a esta expo"}
              </button>
            </form>
            {uploadError && (
              <p style={{ margin: "0.75rem 0 0", color: "#f87171", fontSize: "0.85rem" }}>{uploadError}</p>
            )}
            {uploadSuccess && (
              <p style={{ margin: "0.75rem 0 0", color: "#34d399", fontSize: "0.85rem" }}>{uploadSuccess}</p>
            )}
          </section>

          <section
            style={{
              marginTop: "1.5rem",
              border: "1px solid #334155",
              borderRadius: 12,
              background: "#0f172a",
              overflow: "hidden",
            }}
          >
            <h2 style={{ margin: 0, padding: "1rem", fontSize: "1rem", borderBottom: "1px solid #334155" }}>
              Tabla <strong>QR → País</strong> (lookup) — contenido cargado ({(stats.qrCountryLookup ?? []).length} filas)
            </h2>
            <p style={{ margin: 0, padding: "0.5rem 1rem", fontSize: "0.8rem", color: "#94a3b8" }}>
              Aquí se compara el contenido del QR con esta tabla para obtener el país en la etiqueta.
            </p>
            <div style={{ overflowX: "auto", maxHeight: "50vh", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead style={{ position: "sticky", top: 0, background: "#1e293b", zIndex: 1 }}>
                  <tr style={{ color: "#94a3b8" }}>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", minWidth: 200 }}>QR (contenido)</th>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", width: 120 }}>País</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.qrCountryLookup ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ padding: "1.5rem", color: "#64748b" }}>
                        No hay filas en la tabla de lookup. Sube un CSV con qr_content,pais arriba para esta expo.
                      </td>
                    </tr>
                  ) : (
                    (stats.qrCountryLookup ?? []).map((row, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #1e293b" }}>
                        <td
                          style={{
                            padding: "0.5rem 0.75rem",
                            color: "#cbd5e1",
                            fontFamily: "monospace",
                            fontSize: "0.75rem",
                            maxWidth: 400,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={row.qrContent}
                        >
                          {row.qrContent}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", color: "#34d399", whiteSpace: "nowrap" }}>
                          {row.pais}
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
