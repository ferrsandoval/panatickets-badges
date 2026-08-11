"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buttonStyle, card, colors, errorText, inputStyle, labelStyle, mutedText, sectionTitle, successText } from "./styles";

type QrCountryRow = { qrContent: string; pais: string };

type PrintJobRow = {
  id: string;
  name: string;
  empresa: string | null;
  pais: string | null;
  createdAt: string;
  printedAt: string | null;
};

export function DatosTab({ project, currentLabel, adminPassword }: { project: string; currentLabel: string; adminPassword: string }) {
  const [qrCountryLookup, setQrCountryLookup] = useState<QrCountryRow[]>([]);
  const [allJobs, setAllJobs] = useState<PrintJobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [clearSuccess, setClearSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchQrLookup = useCallback(() => {
    const url = new URL("/api/admin/db-stats", window.location.origin);
    url.searchParams.set("project", project);
    fetch(url.toString())
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setQrCountryLookup(data.qrCountryLookup ?? []))
      .catch(() => setQrCountryLookup([]));
  }, [project]);

  const fetchAllJobs = useCallback(() => {
    setJobsLoading(true);
    const url = new URL("/api/print-jobs", window.location.origin);
    url.searchParams.set("project", project);
    url.searchParams.set("printed", "all");
    url.searchParams.set("limit", "3000");
    fetch(url.toString())
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: PrintJobRow[]) => setAllJobs(data))
      .catch(() => setAllJobs([]))
      .finally(() => setJobsLoading(false));
  }, [project]);

  useEffect(() => {
    fetchQrLookup();
  }, [fetchQrLookup, refreshTrigger]);

  useEffect(() => {
    fetchAllJobs();
  }, [fetchAllJobs, refreshTrigger]);

  const handleUploadCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);
    if (!adminPassword.trim()) {
      setUploadError("Introduce la contraseña de administrador arriba.");
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
      url.searchParams.set("project", project);
      url.searchParams.set("token", adminPassword.trim());
      const res = await fetch(url.toString(), { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? data.error ?? res.statusText);
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

  const handleClearQrLookup = async () => {
    if (!adminPassword.trim()) {
      setClearError("Introduce la contraseña de administrador arriba.");
      return;
    }
    if (!confirm(`¿Borrar toda la tabla QR → país de "${currentLabel}"? Esta acción no se puede deshacer.`)) return;
    setClearError(null);
    setClearSuccess(null);
    setClearLoading(true);
    try {
      const url = new URL("/api/admin/clear-qr-lookup", window.location.origin);
      url.searchParams.set("project", project);
      url.searchParams.set("token", adminPassword.trim());
      const res = await fetch(url.toString(), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? data.error ?? res.statusText);
      setClearSuccess(data.message ?? "Tabla borrada.");
      setRefreshTrigger((t) => t + 1);
    } catch (e) {
      setClearError(e instanceof Error ? e.message : String(e));
    } finally {
      setClearLoading(false);
    }
  };

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredJobs =
    searchLower === ""
      ? allJobs
      : allJobs.filter(
          (j) =>
            (j.name ?? "").toLowerCase().includes(searchLower) ||
            (j.empresa ?? "").toLowerCase().includes(searchLower) ||
            (j.pais ?? "").toLowerCase().includes(searchLower)
        );

  const openPrintLabel = (jobId: string) => {
    const labelUrl = new URL(`/label/${jobId}`, window.location.origin);
    labelUrl.searchParams.set("project", project);
    window.open(labelUrl.toString(), "_blank", "noopener,noreferrer,width=420,height=380");
  };

  return (
    <>
      <section style={card}>
        <h2 style={sectionTitle}>Subir CSV a esta expo</h2>
        <p style={mutedText}>
          Invitados: 2 columnas (qr_content, pais). Expositores: 3 columnas (QR Content, País, Empresa); no se verifica
          cabecera, se cargan todas las líneas. Se cargará en la base de <strong>{currentLabel}</strong>.
        </p>
        <form onSubmit={handleUploadCsv} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
          <div style={{ minWidth: 180 }}>
            <label htmlFor="upload-csv" style={labelStyle}>
              Archivo CSV
            </label>
            <input
              ref={fileInputRef}
              id="upload-csv"
              type="file"
              accept=".csv"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              style={{ ...inputStyle, padding: "0.4rem" }}
            />
          </div>
          <button type="submit" disabled={uploadLoading} style={buttonStyle({ disabled: uploadLoading })}>
            {uploadLoading ? "Subiendo…" : "Subir a esta expo"}
          </button>
        </form>
        {uploadError && <p style={errorText}>{uploadError}</p>}
        {uploadSuccess && <p style={successText}>{uploadSuccess}</p>}

        <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: `1px solid ${colors.border}` }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Borrar base de datos (QR → país)</h3>
          <p style={mutedText}>
            Elimina todas las filas de la tabla <strong>qr_country_lookup</strong> de esta expo. Usa la contraseña de arriba.
          </p>
          <button type="button" onClick={handleClearQrLookup} disabled={clearLoading} style={buttonStyle({ variant: "danger", disabled: clearLoading })}>
            {clearLoading ? "Borrando…" : "Borrar base de datos (esta expo)"}
          </button>
          {clearError && <p style={errorText}>{clearError}</p>}
          {clearSuccess && <p style={successText}>{clearSuccess}</p>}
        </div>
      </section>

      <section style={{ ...card, overflow: "hidden", padding: 0 }}>
        <h2 style={{ ...sectionTitle, margin: 0, padding: "1rem", borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
          Registros en <strong>{currentLabel}</strong>
        </h2>
        <div style={{ padding: "0.75rem 1rem", borderBottom: `1px solid ${colors.border}`, display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <input
            type="search"
            placeholder="Buscar por nombre, empresa o país…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 260px" }}
          />
          <span style={{ fontSize: "0.85rem", color: colors.textMuted }}>
            {jobsLoading ? "Cargando…" : `${filteredJobs.length} de ${allJobs.length} registros`}
          </span>
        </div>
        <div style={{ overflowX: "auto", maxHeight: "60vh", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead style={{ position: "sticky", top: 0, background: colors.bgAlt, zIndex: 1 }}>
              <tr style={{ color: colors.textMuted }}>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Nombre</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Empresa</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>País</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Creado</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Impreso</th>
                <th style={{ textAlign: "right", padding: "0.6rem 0.75rem" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {jobsLoading && allJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "1.5rem", color: colors.textDim }}>
                    Cargando registros…
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "1.5rem", color: colors.textDim }}>
                    {allJobs.length === 0 ? "No hay registros en esta base de datos." : "Ningún registro coincide con la búsqueda."}
                  </td>
                </tr>
              ) : (
                filteredJobs.map((j) => (
                  <tr key={j.id} style={{ borderTop: `1px solid ${colors.bgAlt}` }}>
                    <td style={{ padding: "0.6rem 0.75rem", color: colors.text }}>{j.name}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#cbd5e1" }}>{j.empresa ?? "—"}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#cbd5e1" }}>{j.pais ?? "—"}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: colors.textMuted, whiteSpace: "nowrap" }}>
                      {new Date(j.createdAt).toLocaleString("es")}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: j.printedAt ? colors.success : colors.warning }}>
                      {j.printedAt ? new Date(j.printedAt).toLocaleString("es") : "Pendiente"}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>
                      <button type="button" onClick={() => openPrintLabel(j.id)} style={{ ...buttonStyle(), padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}>
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

      <section style={{ ...card, overflow: "hidden", padding: 0 }}>
        <h2 style={{ margin: 0, padding: "1rem", fontSize: "1rem", borderBottom: `1px solid ${colors.border}` }}>
          Tabla <strong>QR → País</strong> (lookup) — contenido cargado ({qrCountryLookup.length} filas)
        </h2>
        <p style={{ margin: 0, padding: "0.5rem 1rem", fontSize: "0.8rem", color: colors.textMuted }}>
          Aquí se compara el contenido del QR con esta tabla para obtener el país en la etiqueta.
        </p>
        <div style={{ overflowX: "auto", maxHeight: "50vh", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead style={{ position: "sticky", top: 0, background: colors.bgAlt, zIndex: 1 }}>
              <tr style={{ color: colors.textMuted }}>
                <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", minWidth: 200 }}>QR (contenido)</th>
                <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", width: 120 }}>País</th>
              </tr>
            </thead>
            <tbody>
              {qrCountryLookup.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ padding: "1.5rem", color: colors.textDim }}>
                    No hay filas en la tabla de lookup. Sube un CSV con qr_content,pais arriba para esta expo.
                  </td>
                </tr>
              ) : (
                qrCountryLookup.map((row, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${colors.bgAlt}` }}>
                    <td
                      style={{ padding: "0.5rem 0.75rem", color: "#cbd5e1", fontFamily: "monospace", fontSize: "0.75rem", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={row.qrContent}
                    >
                      {row.qrContent}
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", color: colors.success, whiteSpace: "nowrap" }}>{row.pais}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
