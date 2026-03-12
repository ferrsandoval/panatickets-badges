"use client";

import Link from "next/link";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
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

type ScanRow = {
  can_ID?: string;
  Fecha_Escaneo?: string;
  Hora_Escaneo?: string;
  Dia_Semana?: string;
  Mes?: string;
  Timestamp_Completo?: string;
  Expo?: string;
  Service_Name?: string;
  Persona_Escaneada_Nombre?: string;
  Persona_Escaneada_Compania?: string;
  Persona_Escaneada_Email?: string;
  Persona_Escaneada_Telefono?: string;
  Persona_Escaneada_Celular?: string;
  Escaneado_Por_Usuario?: string;
  Escaneado_Por_User_ID?: string;
  Dispositivo?: string;
  Device_ID?: string;
  [key: string]: string | undefined;
};

const CHART_COLORS = ["#0ea5e9", "#38bdf8", "#22d3ee", "#06b6d4", "#0891b2"];

function getValue(row: ScanRow, key: string): string {
  const k = Object.keys(row).find((h) => h.trim().toLowerCase() === key.toLowerCase());
  return (k ? row[k] : row[key] ?? "").trim() || "";
}

export default function EstadisticasPage() {
  return (
    <Suspense fallback={<p style={{ margin: "2rem auto", maxWidth: 900 }}>Cargando…</p>}>
      <EstadisticasContent />
    </Suspense>
  );
}

function EstadisticasContent() {
  const [data, setData] = useState<ScanRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    setData([]);
    setFileName(null);
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
        const rows = results.data as ScanRow[];
        if (rows.length === 0) {
          setError("El CSV está vacío o no tiene filas de datos.");
          return;
        }
        setData(rows);
      },
    });
  }, []);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const byExpo: Record<string, number> = {};
    const byService: Record<string, number> = {};
    const byDia: Record<string, number> = {};
    const byMes: Record<string, number> = {};
    const byUsuario: Record<string, number> = {};
    const byDispositivo: Record<string, number> = {};

    for (const row of data) {
      const expo = getValue(row, "Expo") || "Sin expo";
      const service = getValue(row, "Service_Name") || "Sin servicio";
      const dia = getValue(row, "Dia_Semana") || "Sin día";
      const mes = getValue(row, "Mes") || "Sin mes";
      const usuario = getValue(row, "Escaneado_Por_Usuario") || "Sin usuario";
      const dispositivo = getValue(row, "Dispositivo") || "Sin dispositivo";

      byExpo[expo] = (byExpo[expo] ?? 0) + 1;
      byService[service] = (byService[service] ?? 0) + 1;
      byDia[dia] = (byDia[dia] ?? 0) + 1;
      byMes[mes] = (byMes[mes] ?? 0) + 1;
      byUsuario[usuario] = (byUsuario[usuario] ?? 0) + 1;
      byDispositivo[dispositivo] = (byDispositivo[dispositivo] ?? 0) + 1;
    }

    const toChartData = (obj: Record<string, number>) =>
      Object.entries(obj)
        .map(([name, value]) => ({ name, value, count: value }))
        .sort((a, b) => b.value - a.value);

    return {
      total: data.length,
      byExpo: toChartData(byExpo),
      byService: toChartData(byService),
      byDia: toChartData(byDia),
      byMes: toChartData(byMes),
      byUsuario: toChartData(byUsuario).slice(0, 10),
      byDispositivo: toChartData(byDispositivo),
    };
  }, [data]);

  const clearData = () => {
    setData([]);
    setFileName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          background:
            "linear-gradient(135deg, rgba(2,6,23,0.96) 0%, rgba(15,23,42,0.96) 60%, rgba(8,47,73,0.96) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/" style={{ color: "#38bdf8", textDecoration: "none", fontSize: "0.9rem" }}>
            ← Cola de impresión
          </Link>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Dashboard de estadísticas</h1>
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
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.15rem" }}>Cargar CSV de datos escaneados</h2>
        <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "#94a3b8" }}>
          Formato esperado: can_ID, Fecha_Escaneo, Hora_Escaneo, Dia_Semana, Mes, Timestamp_Completo, Expo,
          Service_Name, Persona_Escaneada_Nombre, Persona_Escaneada_Compania, Persona_Escaneada_Email,
          Persona_Escaneada_Telefono, Persona_Escaneada_Celular, Escaneado_Por_Usuario, Escaneado_Por_User_ID,
          Dispositivo, Device_ID
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <input
            ref={fileInputRef}
            id="csv-estadisticas"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{
              padding: "0.5rem",
              background: "#1e293b",
              border: "1px solid #475569",
              borderRadius: 8,
              color: "#e2e8f0",
              fontSize: "0.9rem",
            }}
          />
          {data.length > 0 && (
            <>
              <span style={{ color: "#34d399", fontSize: "0.9rem" }}>
                {fileName} — {data.length} registros
              </span>
              <button
                type="button"
                onClick={clearData}
                style={{
                  padding: "0.4rem 0.85rem",
                  background: "#475569",
                  color: "#e2e8f0",
                  border: "none",
                  borderRadius: 6,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Limpiar
              </button>
            </>
          )}
        </div>
        {error && (
          <p style={{ margin: "0.75rem 0 0", color: "#f87171", fontSize: "0.9rem" }}>{error}</p>
        )}
      </section>

      {!stats ? (
        <section
          style={{
            padding: "3rem 2rem",
            textAlign: "center",
            border: "1px dashed #334155",
            borderRadius: 12,
            background: "#0f172a",
            color: "#64748b",
          }}
        >
          <p style={{ margin: 0, fontSize: "1rem" }}>
            Carga un CSV con el resumen de datos escaneados para ver el dashboard.
          </p>
        </section>
      ) : (
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
                padding: "1.25rem",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 12,
              }}
            >
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase" }}>
                Total escaneos
              </p>
              <p style={{ margin: "0.5rem 0 0", fontSize: "1.75rem", fontWeight: 700, color: "#38bdf8" }}>
                {stats.total.toLocaleString()}
              </p>
            </div>
            <div
              style={{
                padding: "1.25rem",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 12,
              }}
            >
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase" }}>
                Expos
              </p>
              <p style={{ margin: "0.5rem 0 0", fontSize: "1.75rem", fontWeight: 700, color: "#22d3ee" }}>
                {stats.byExpo.length}
              </p>
            </div>
            <div
              style={{
                padding: "1.25rem",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 12,
              }}
            >
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase" }}>
                Servicios
              </p>
              <p style={{ margin: "0.5rem 0 0", fontSize: "1.75rem", fontWeight: 700, color: "#06b6d4" }}>
                {stats.byService.length}
              </p>
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                padding: "1rem",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 12,
                minHeight: 320,
              }}
            >
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Escaneos por Expo</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.byExpo} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    stroke="#64748b"
                    fontSize={10}
                    tick={{ fill: "#94a3b8" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                    formatter={(value: number) => [value.toLocaleString(), "Escaneos"]}
                  />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                padding: "1rem",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 12,
                minHeight: 320,
              }}
            >
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Escaneos por Servicio</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.byService.slice(0, 8)} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={{ fill: "#94a3b8" }} />
                  <YAxis stroke="#64748b" fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                    formatter={(value: number) => [value.toLocaleString(), "Escaneos"]}
                  />
                  <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                padding: "1rem",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 12,
                minHeight: 320,
              }}
            >
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Escaneos por día de la semana</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.byDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={{ fill: "#94a3b8" }} />
                  <YAxis stroke="#64748b" fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                    formatter={(value: number) => [value.toLocaleString(), "Escaneos"]}
                  />
                  <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: "#0ea5e9" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                padding: "1rem",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 12,
                minHeight: 320,
              }}
            >
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Escaneos por mes</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.byMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={{ fill: "#94a3b8" }} />
                  <YAxis stroke="#64748b" fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                    formatter={(value: number) => [value.toLocaleString(), "Escaneos"]}
                  />
                  <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                padding: "1rem",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 12,
                minHeight: 320,
              }}
            >
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Top 5 Expos (pastel)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stats.byExpo.slice(0, 5)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.byExpo.slice(0, 5).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                    formatter={(value: number) => [value.toLocaleString(), "Escaneos"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                padding: "1rem",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 12,
                minHeight: 320,
              }}
            >
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Top 10 usuarios escaneadores</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.byUsuario} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    stroke="#64748b"
                    fontSize={9}
                    tick={{ fill: "#94a3b8" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                    formatter={(value: number) => [value.toLocaleString(), "Escaneos"]}
                  />
                  <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {stats.byDispositivo.length > 0 && (
            <section
              style={{
                padding: "1rem",
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 12,
                marginBottom: "1.5rem",
                minHeight: 320,
              }}
            >
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Escaneos por dispositivo</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.byDispositivo.slice(0, 8)} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={{ fill: "#94a3b8" }} />
                  <YAxis stroke="#64748b" fontSize={11} tick={{ fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                    formatter={(value: number) => [value.toLocaleString(), "Escaneos"]}
                  />
                  <Bar dataKey="value" fill="#0891b2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}
        </>
      )}
    </main>
  );
}
