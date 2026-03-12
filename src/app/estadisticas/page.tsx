"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

type ScanRow = Record<string, string | null | undefined>;

const CSV_COLS = "Scan_ID, Fecha, Hora, Dia_Semana, Timestamp_Completo, EXPO, Tipo_Persona, Nombre, Empresa, Email, Telefono, Celular, Escaneo";

const CHART_COLORS = ["#0ea5e9", "#38bdf8", "#22d3ee", "#06b6d4", "#0891b2", "#14b8a6", "#2dd4bf"];

function getVal(row: ScanRow, ...keys: string[]): string {
  for (const key of keys) {
    const k = Object.keys(row).find((h) => h?.trim().toLowerCase() === key.toLowerCase());
    const v = k ? row[k] : row[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function parseFechaToMes(fecha: string): string {
  if (!fecha) return "";
  const m = fecha.match(/(\d{4})-(\d{2})|\d{2}\/\d{2}\/(\d{4})|(\d{2})\/(\d{2})/);
  if (!m) return fecha.slice(0, 7) || fecha;
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const y = m[1] || m[3] || new Date().getFullYear();
  const mo = parseInt(m[2] || m[4] || m[5] || "1", 10);
  return `${months[mo - 1] || mo} ${String(y).slice(-2)}`;
}

function parseHoraToHour(hora: string): string {
  if (!hora) return "";
  const parts = hora.split(/[:\s]/);
  return parts[0] ? `${parts[0]}h` : hora;
}

export default function EstadisticasPage() {
  return (
    <Suspense fallback={<p style={{ margin: "2rem auto", maxWidth: 900 }}>Cargando…</p>}>
      <EstadisticasContent />
    </Suspense>
  );
}

type CrossStatsRow = {
  projectKey: string;
  projectLabel: string;
  scansInCsv: number;
  matchedInPrintJob: number;
};

function EstadisticasContent() {
  const [data, setData] = useState<ScanRow[]>([]);
  const [dataSource, setDataSource] = useState<"db" | "csv" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadToken, setUploadToken] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [crossStats, setCrossStats] = useState<{ totalScans: number; byExpo: CrossStatsRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFromDb = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/scan-stats-data");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json)
        ? json.map((r: Record<string, unknown>) => ({
            Scan_ID: String(r.scanId ?? ""),
            Fecha: String(r.fecha ?? ""),
            Hora: String(r.hora ?? ""),
            Dia_Semana: String(r.diaSemana ?? ""),
            Timestamp_Completo: String(r.timestampCompleto ?? ""),
            EXPO: String(r.expo ?? ""),
            Tipo_Persona: String(r.tipoPersona ?? ""),
            Nombre: String(r.nombre ?? ""),
            Empresa: String(r.empresa ?? ""),
            Email: String(r.email ?? ""),
            Telefono: String(r.telefono ?? ""),
            Celular: String(r.celular ?? ""),
            Escaneo: String(r.escaneo ?? ""),
          }))
        : [];
    } catch {
      return [];
    }
  }, []);

  const fetchCrossStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/scan-stats-cross");
      if (!res.ok) throw new Error(res.statusText);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchFromDb(), fetchCrossStats()]).then(([dbData, cross]) => {
      if (cancelled) return;
      if (dbData.length > 0) {
        setData(dbData);
        setDataSource("db");
      } else {
        setData([]);
        setDataSource(null);
      }
      setCrossStats(cross);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fetchFromDb, fetchCrossStats]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Selecciona un archivo CSV.");
      return;
    }
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setError(results.errors[0]?.message ?? "Error al parsear el CSV.");
          return;
        }
        const rows = (results.data ?? []) as ScanRow[];
        if (rows.length === 0) {
          setError("El CSV está vacío.");
          return;
        }
        setData(rows);
        setDataSource("csv");
      },
    });
  }, []);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const byExpo: Record<string, number> = {};
    const byTipoPersona: Record<string, number> = {};
    const byDia: Record<string, number> = {};
    const byMes: Record<string, number> = {};
    const byHora: Record<string, number> = {};
    const byFecha: Record<string, number> = {};
    const byEscaneo: Record<string, number> = {};

    for (const row of data) {
      const expo = getVal(row, "EXPO", "Expo") || "Sin expo";
      const tipo = getVal(row, "Tipo_Persona") || "Sin tipo";
      const dia = getVal(row, "Dia_Semana") || "Sin día";
      const fecha = getVal(row, "Fecha", "Fecha_Escaneo");
      const hora = getVal(row, "Hora", "Hora_Escaneo");
      const escaneo = getVal(row, "Escaneo") || "Sin dato";

      byExpo[expo] = (byExpo[expo] ?? 0) + 1;
      byTipoPersona[tipo] = (byTipoPersona[tipo] ?? 0) + 1;
      byDia[dia] = (byDia[dia] ?? 0) + 1;
      byEscaneo[escaneo] = (byEscaneo[escaneo] ?? 0) + 1;
      if (fecha) {
        const mes = parseFechaToMes(fecha);
        byMes[mes] = (byMes[mes] ?? 0) + 1;
        byFecha[fecha] = (byFecha[fecha] ?? 0) + 1;
      }
      if (hora) {
        const h = parseHoraToHour(hora);
        byHora[h] = (byHora[h] ?? 0) + 1;
      }
    }

    const toChart = (obj: Record<string, number>) =>
      Object.entries(obj)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const ordenDias = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
    const byDiaOrd = Object.entries(byDia)
      .sort((a, b) => {
        const ai = ordenDias.findIndex((d) => d.toLowerCase().includes(a[0].toLowerCase()));
        const bi = ordenDias.findIndex((d) => d.toLowerCase().includes(b[0].toLowerCase()));
        if (ai >= 0 && bi >= 0) return ai - bi;
        return b[1] - a[1];
      })
      .map(([name, value]) => ({ name, value }));

    const byHoraOrd = Object.entries(byHora)
      .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
      .map(([name, value]) => ({ name, value }));

    const byFechaOrd = Object.entries(byFecha)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, value]) => ({ name, value }));

    return {
      total: data.length,
      byExpo: toChart(byExpo),
      byTipoPersona: toChart(byTipoPersona),
      byDia: byDiaOrd.length > 0 ? byDiaOrd : toChart(byDia),
      byMes: toChart(byMes),
      byHora: byHoraOrd.length > 0 ? byHoraOrd : toChart(byHora),
      byFecha: byFechaOrd,
      byEscaneo: toChart(byEscaneo),
    };
  }, [data]);

  const clearLocal = () => {
    setData([]);
    setFileName(null);
    setError(null);
    setDataSource(null);
    setUploadSuccess(null);
    setUploadError(null);
    setCrossStats(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fetchFromDb().then((dbData) => {
      if (dbData.length > 0) {
        setData(dbData);
        setDataSource("db");
      }
      fetchCrossStats().then(setCrossStats);
    });
  };

  const handleSaveToDb = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);
    if (!uploadToken.trim()) {
      setUploadError("Introduce el token (WEBHOOK_SECRET).");
      return;
    }
    if (data.length === 0) {
      setUploadError("Carga un CSV primero.");
      return;
    }
    setUploadLoading(true);
    try {
      const csv = Papa.unparse(data);
      const formData = new FormData();
      formData.append("file", new Blob(["\uFEFF" + csv], { type: "text/csv" }), "estadisticas.csv");
      const url = new URL("/api/admin/upload-scan-stats-csv", window.location.origin);
      url.searchParams.set("token", uploadToken.trim());
      const res = await fetch(url.toString(), { method: "POST", body: formData });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail ?? json.error ?? res.statusText);
      setUploadSuccess(json.message ?? `Guardados ${json.total ?? data.length} registros.`);
      setDataSource("db");
      fetchCrossStats().then(setCrossStats);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteDb = async () => {
    if (!uploadToken.trim()) {
      setDeleteError("Introduce el token.");
      return;
    }
    if (!confirm("¿Eliminar todos los registros de la base de datos? Esta acción no se puede deshacer.")) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const url = new URL("/api/admin/clear-scan-records", window.location.origin);
      url.searchParams.set("token", uploadToken.trim());
      const res = await fetch(url.toString(), { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail ?? json.error ?? res.statusText);
      setData([]);
      setDataSource(null);
      setCrossStats(null);
      setUploadSuccess(`Base eliminada. ${json.count ?? 0} registros borrados.`);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleteLoading(false);
    }
  };

  const refreshFromDb = () => {
    setLoading(true);
    fetchFromDb().then((dbData) => {
      setData(dbData);
      setDataSource(dbData.length > 0 ? "db" : null);
      setLoading(false);
    });
    fetchCrossStats().then(setCrossStats);
  };

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "1rem" }}>
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
          background: "linear-gradient(135deg, rgba(2,6,23,0.96) 0%, rgba(15,23,42,0.96) 60%, rgba(8,47,73,0.96) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/" style={{ color: "#38bdf8", textDecoration: "none", fontSize: "0.9rem" }}>← Cola de impresión</Link>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Dashboard BI — Estadísticas</h1>
        </div>
      </section>

      <section
        style={{
          marginBottom: "1.5rem",
          padding: "1.25rem",
          border: "1px solid #334155",
          borderRadius: 12,
          background: "#0f172a",
        }}
      >
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.15rem" }}>Datos</h2>
        <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "#94a3b8" }}>
          Formato CSV: {CSV_COLS}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ padding: "0.5rem", background: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0", fontSize: "0.9rem" }}
          />
          {data.length > 0 && (
            <>
              <span style={{ color: "#34d399", fontSize: "0.9rem" }}>
                {dataSource === "db" ? "Base de datos" : fileName} — {data.length.toLocaleString()} registros
              </span>
              {dataSource === "db" && (
                <button type="button" onClick={refreshFromDb} disabled={loading} style={{ padding: "0.4rem 0.85rem", background: "#1e293b", color: "#e2e8f0", border: "1px solid #475569", borderRadius: 6, fontSize: "0.85rem", cursor: loading ? "not-allowed" : "pointer" }}>
                  Actualizar
                </button>
              )}
              <form onSubmit={handleSaveToDb} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="password"
                  value={uploadToken}
                  onChange={(e) => setUploadToken(e.target.value)}
                  placeholder="Token"
                  style={{ padding: "0.4rem 0.6rem", background: "#1e293b", border: "1px solid #475569", borderRadius: 6, color: "#e2e8f0", fontSize: "0.85rem", width: 160 }}
                />
                <button type="submit" disabled={uploadLoading} style={{ padding: "0.4rem 0.85rem", background: uploadLoading ? "#475569" : "#0ea5e9", color: "#fff", border: "none", borderRadius: 6, fontSize: "0.85rem", cursor: uploadLoading ? "not-allowed" : "pointer" }}>
                  {uploadLoading ? "Guardando…" : "Guardar en DB"}
                </button>
              </form>
              <button type="button" onClick={handleDeleteDb} disabled={deleteLoading} style={{ padding: "0.4rem 0.85rem", background: deleteLoading ? "#475569" : "#b91c1c", color: "#fff", border: "none", borderRadius: 6, fontSize: "0.85rem", cursor: deleteLoading ? "not-allowed" : "pointer" }}>
                {deleteLoading ? "Eliminando…" : "Eliminar base"}
              </button>
              {dataSource === "csv" && (
                <button type="button" onClick={clearLocal} style={{ padding: "0.4rem 0.85rem", background: "#475569", color: "#e2e8f0", border: "none", borderRadius: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                  Limpiar vista
                </button>
              )}
            </>
          )}
        </div>
        {error && <p style={{ margin: "0.75rem 0 0", color: "#f87171", fontSize: "0.9rem" }}>{error}</p>}
        {uploadError && <p style={{ margin: "0.75rem 0 0", color: "#f87171", fontSize: "0.9rem" }}>{uploadError}</p>}
        {deleteError && <p style={{ margin: "0.75rem 0 0", color: "#f87171", fontSize: "0.9rem" }}>{deleteError}</p>}
        {uploadSuccess && <p style={{ margin: "0.75rem 0 0", color: "#34d399", fontSize: "0.9rem" }}>{uploadSuccess}</p>}
      </section>

      {crossStats && crossStats.totalScans > 0 && (
        <section style={{ marginBottom: "1.5rem", padding: "1.25rem", border: "1px solid #334155", borderRadius: 12, background: "#0f172a" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.15rem" }}>Cruce con impresos por expo</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #334155" }}>
                  <th style={{ textAlign: "left", padding: "0.75rem", color: "#94a3b8" }}>Expo</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", color: "#94a3b8" }}>Escaneos</th>
                  <th style={{ textAlign: "right", padding: "0.75rem", color: "#94a3b8" }}>Coinciden impresos</th>
                </tr>
              </thead>
              <tbody>
                {crossStats.byExpo.map((r) => (
                  <tr key={r.projectKey} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "0.75rem", color: "#e2e8f0" }}>{r.projectLabel}</td>
                    <td style={{ padding: "0.75rem", textAlign: "right", color: "#94a3b8" }}>{r.scansInCsv.toLocaleString()}</td>
                    <td style={{ padding: "0.75rem", textAlign: "right", color: "#34d399", fontWeight: 600 }}>{r.matchedInPrintJob.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Cargando datos…</p>
      ) : !stats ? (
        <section style={{ padding: "3rem 2rem", textAlign: "center", border: "1px dashed #334155", borderRadius: 12, background: "#0f172a", color: "#64748b" }}>
          <p style={{ margin: 0 }}>Carga un CSV o guarda datos en la base para ver el análisis BI.</p>
        </section>
      ) : (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ padding: "1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }}>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Total</p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "1.5rem", fontWeight: 700, color: "#38bdf8" }}>{stats.total.toLocaleString()}</p>
            </div>
            <div style={{ padding: "1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }}>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Expos</p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "1.5rem", fontWeight: 700, color: "#22d3ee" }}>{stats.byExpo.length}</p>
            </div>
            <div style={{ padding: "1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }}>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Tipos persona</p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "1.5rem", fontWeight: 700, color: "#06b6d4" }}>{stats.byTipoPersona.length}</p>
            </div>
            {crossStats && crossStats.totalScans > 0 && (
              <div style={{ padding: "1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }}>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Tasa impresos</p>
                <p style={{ margin: "0.35rem 0 0", fontSize: "1.5rem", fontWeight: 700, color: "#34d399" }}>
                  {((crossStats.byExpo.reduce((s, r) => s + r.matchedInPrintJob, 0) / stats.total) * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ padding: "1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 12, minHeight: 300 }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Por Expo</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.byExpo.slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis type="category" dataKey="name" width={100} stroke="#64748b" fontSize={9} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0" }} formatter={(v: number) => [v.toLocaleString(), "Escaneos"]} />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ padding: "1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 12, minHeight: 300 }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Por Tipo de persona</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.byTipoPersona.slice(0, 8)} margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} tick={{ fill: "#94a3b8" }} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0" }} formatter={(v: number) => [v.toLocaleString(), "Escaneos"]} />
                  <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ padding: "1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 12, minHeight: 300 }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Por día de la semana</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.byDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} tick={{ fill: "#94a3b8" }} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0" }} formatter={(v: number) => [v.toLocaleString(), "Escaneos"]} />
                  <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {stats.byHora.length > 0 && (
              <div style={{ padding: "1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 12, minHeight: 300 }}>
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Horas pico</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={stats.byHora}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tick={{ fill: "#94a3b8" }} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0" }} formatter={(v: number) => [v.toLocaleString(), "Escaneos"]} />
                    <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
            {stats.byFecha.length > 0 && (
              <div style={{ padding: "1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 12, minHeight: 300 }}>
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Tendencia por fecha</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={stats.byFecha.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tick={{ fill: "#94a3b8" }} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0" }} formatter={(v: number) => [v.toLocaleString(), "Escaneos"]} />
                    <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: "#0ea5e9" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {stats.byMes.length > 0 && (
              <div style={{ padding: "1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 12, minHeight: 300 }}>
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Por mes</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.byMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tick={{ fill: "#94a3b8" }} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0" }} formatter={(v: number) => [v.toLocaleString(), "Escaneos"]} />
                    <Bar dataKey="value" fill="#0891b2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ padding: "1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 12, minHeight: 300 }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Distribución expos (top 5)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={stats.byExpo.slice(0, 5)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                    {stats.byExpo.slice(0, 5).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0" }} formatter={(v: number) => [v.toLocaleString(), "Escaneos"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {stats.byEscaneo.length > 0 && stats.byEscaneo.some((x) => x.name !== "Sin dato") && (
              <div style={{ padding: "1rem", background: "#0f172a", border: "1px solid #334155", borderRadius: 12, minHeight: 300 }}>
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Por tipo de escaneo</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.byEscaneo.slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tick={{ fill: "#94a3b8" }} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0" }} formatter={(v: number) => [v.toLocaleString(), "Escaneos"]} />
                    <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
