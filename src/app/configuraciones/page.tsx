"use client";

import Link from "next/link";
import { useState } from "react";
import { GeneralTab } from "./GeneralTab";
import { PuntosTab } from "./PuntosTab";
import { EtiquetaTab } from "./EtiquetaTab";
import { DatosTab } from "./DatosTab";
import { card, colors, inputStyle, labelStyle } from "./styles";

// Prueba de venta a cliente: un solo proyecto (boletos), sin selector de expos.
const PROJECTS = [{ key: "expo_logistica_2026", label: "Boletos" }] as const;

const TABS = [
  { key: "general", label: "General" },
  { key: "puntos", label: "Puntos de impresión" },
  { key: "etiqueta", label: "Etiqueta impresa" },
  { key: "datos", label: "Datos" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function ConfiguracionesPage() {
  const [selectedProject, setSelectedProject] = useState<string>(PROJECTS[0].key);
  const [adminToken, setAdminToken] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("general");

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
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          background:
            "linear-gradient(135deg, rgba(2,6,23,0.96) 0%, rgba(15,23,42,0.96) 60%, rgba(8,47,73,0.96) 100%)",
        }}
      >
        <Link href="/" style={{ color: colors.accent, textDecoration: "none", fontSize: "0.9rem" }}>
          ← Cola de impresión
        </Link>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Configuraciones</h1>
      </section>

      <section style={{ ...card, display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <label htmlFor="expo-select" style={labelStyle}>
            Expo
          </label>
          <select
            id="expo-select"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            style={inputStyle}
          >
            {PROJECTS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <label htmlFor="admin-token" style={labelStyle}>
            Token de administrador
          </label>
          <input
            id="admin-token"
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder="WEBHOOK_SECRET"
            style={inputStyle}
          />
        </div>
      </section>

      <nav style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: 8,
              border: `1px solid ${activeTab === tab.key ? colors.accent : colors.border}`,
              background: activeTab === tab.key ? "#082f49" : "transparent",
              color: activeTab === tab.key ? colors.accent : colors.textMuted,
              fontSize: "0.9rem",
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "general" && <GeneralTab project={selectedProject} adminToken={adminToken} />}
      {activeTab === "puntos" && <PuntosTab project={selectedProject} adminToken={adminToken} />}
      {activeTab === "etiqueta" && <EtiquetaTab project={selectedProject} adminToken={adminToken} />}
      {activeTab === "datos" && <DatosTab project={selectedProject} currentLabel={currentLabel} adminToken={adminToken} />}
    </main>
  );
}
