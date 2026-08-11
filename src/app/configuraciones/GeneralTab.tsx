"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonStyle, card, colors, errorBox, errorText, inputStyle, labelStyle, mutedText, sectionTitle, successText, warningBox } from "./styles";

type DbStatsSummary = {
  usingDefaultDatabase?: boolean;
  printJobsTotal: number;
  printJobsPending: number;
  qrCountryLookupCount: number;
};

export function GeneralTab({ project, adminToken }: { project: string; adminToken: string }) {
  const [stats, setStats] = useState<DbStatsSummary | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [expoName, setExpoName] = useState("");
  const [nameLoaded, setNameLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const fetchStats = useCallback(() => {
    setStatsError(null);
    const url = new URL("/api/admin/db-stats", window.location.origin);
    url.searchParams.set("project", project);
    url.searchParams.set("printed", "true");
    fetch(url.toString())
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.detail ?? d.error ?? r.statusText)));
        return r.json();
      })
      .then((data: DbStatsSummary) => setStats(data))
      .catch((e) => {
        setStatsError(e instanceof Error ? e.message : String(e));
        setStats(null);
      });
  }, [project]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setNameLoaded(false);
    const url = new URL("/api/admin/expo-settings", window.location.origin);
    url.searchParams.set("project", project);
    fetch(url.toString())
      .then((r) => r.json())
      .then((data) => setExpoName(data.expoName ?? ""))
      .catch(() => setExpoName(""))
      .finally(() => setNameLoaded(true));
  }, [project]);

  const handleSaveExpoName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);
    if (!adminToken.trim()) {
      setSaveError("Introduce el token de administrador arriba.");
      return;
    }
    setSaving(true);
    try {
      const url = new URL("/api/admin/expo-settings", window.location.origin);
      url.searchParams.set("project", project);
      url.searchParams.set("token", adminToken.trim());
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expoName: expoName.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? data.error ?? res.statusText);
      setSaveSuccess("Nombre de expo guardado.");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {statsError && (
        <section style={errorBox}>
          <strong>Error de conexión</strong>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>{statsError}</p>
          {/can't reach database|db\.prisma\.io|connection refused|ECONNREFUSED/i.test(statsError) && (
            <>
              <p style={{ margin: "0.75rem 0 0", fontSize: "0.85rem", color: colors.textMuted }}>
                Para <strong>{project}</strong>: verifica que la variable{" "}
                <code>DATABASE_URL_{project.toUpperCase().replace(/[^A-Z0-9]/g, "_")}</code> (o _DATABASE_URL, _POSTGRES_URL)
                esté en Vercel. Si usas Prisma Postgres: entra en{" "}
                <a href="https://console.prisma.io" target="_blank" rel="noopener noreferrer" style={{ color: colors.accent }}>
                  console.prisma.io
                </a>{" "}
                y comprueba que la base <strong>no esté pausada</strong> (Resume si lo está). Usa la URL <strong>Pooled</strong>{" "}
                en Vercel, no la Direct. Tras cambios: <strong>Redeploy</strong>.
              </p>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: colors.textDim }}>
                Más detalles en <code>docs/VARIABLES_POR_EXPO.md</code> (sección &quot;Can&apos;t reach database server&quot;).
              </p>
              <button type="button" onClick={fetchStats} style={{ ...buttonStyle({ variant: "ghost" }), marginTop: "0.75rem" }}>
                Reintentar
              </button>
            </>
          )}
        </section>
      )}

      {stats?.usingDefaultDatabase && (
        <section style={warningBox}>
          <strong>Base por defecto.</strong> Para la expo &quot;{project}&quot; no está configurada la variable de entorno
          correspondiente. Se muestra la base de datos por defecto.
        </section>
      )}

      <section style={card}>
        <h2 style={sectionTitle}>Nombre de la expo</h2>
        <p style={mutedText}>
          Aparece como última línea en la etiqueta impresa (los boletos no la muestran, siguen sin mostrar la expo).
        </p>
        <form onSubmit={handleSaveExpoName} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            <label htmlFor="expo-name" style={labelStyle}>
              Nombre a mostrar
            </label>
            <input
              id="expo-name"
              value={expoName}
              onChange={(e) => setExpoName(e.target.value)}
              placeholder="EXPO LOGISTICA 2026"
              disabled={!nameLoaded}
              style={inputStyle}
            />
          </div>
          <button type="submit" disabled={saving} style={buttonStyle({ disabled: saving })}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </form>
        {saveError && <p style={errorText}>{saveError}</p>}
        {saveSuccess && <p style={successText}>{saveSuccess}</p>}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard value={stats?.printJobsTotal ?? "—"} label="Etiquetas totales" color={colors.accent} />
        <StatCard value={stats?.printJobsPending ?? "—"} label="Pendientes de imprimir" color={colors.warning} />
        <StatCard value={stats?.qrCountryLookupCount ?? "—"} label="QR → país (lookup)" color={colors.success} />
      </section>
    </>
  );
}

function StatCard({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div style={{ padding: "1rem", border: `1px solid ${colors.border}`, borderRadius: 12, background: colors.bgAlt, textAlign: "center" }}>
      <div style={{ fontSize: "1.75rem", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: "0.85rem", color: colors.textMuted }}>{label}</div>
    </div>
  );
}
