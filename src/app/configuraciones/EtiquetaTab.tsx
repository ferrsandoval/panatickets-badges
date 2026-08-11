"use client";

import { useEffect, useState } from "react";
import { ALL_LABEL_FIELDS, DEFAULT_LABEL_FIELDS, type LabelFieldKey } from "@/lib/expo-settings";
import { buttonStyle, card, colors, errorText, mutedText, sectionTitle, successText } from "./styles";

const FIELD_LABELS: Record<LabelFieldKey, string> = {
  name: "Nombre",
  empresa: "Empresa",
  pais: "País",
  telefono: "Teléfono",
  email: "Email",
  expo: "Nombre de expo",
};

export function EtiquetaTab({ project, adminToken }: { project: string; adminToken: string }) {
  const [loaded, setLoaded] = useState(false);
  const [printQr, setPrintQr] = useState(true);
  const [fields, setFields] = useState<LabelFieldKey[]>(DEFAULT_LABEL_FIELDS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoaded(false);
    const url = new URL("/api/admin/expo-settings", window.location.origin);
    url.searchParams.set("project", project);
    fetch(url.toString())
      .then((r) => r.json())
      .then((data) => {
        setPrintQr(data.printQr !== false);
        setFields(Array.isArray(data.labelFields) && data.labelFields.length > 0 ? data.labelFields : DEFAULT_LABEL_FIELDS);
      })
      .catch(() => {
        setPrintQr(true);
        setFields(DEFAULT_LABEL_FIELDS);
      })
      .finally(() => setLoaded(true));
  }, [project]);

  const hiddenFields = ALL_LABEL_FIELDS.filter((f) => !fields.includes(f));

  const moveUp = (index: number) => {
    if (index === 0) return;
    setFields((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setFields((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const hide = (field: LabelFieldKey) => setFields((prev) => prev.filter((f) => f !== field));
  const show = (field: LabelFieldKey) => setFields((prev) => [...prev, field]);

  const handleSave = async () => {
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
        body: JSON.stringify({ printQr, labelFields: fields }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? data.error ?? res.statusText);
      setSaveSuccess("Configuración de etiqueta guardada.");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={card}>
      <h2 style={sectionTitle}>Código QR</h2>
      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: colors.text, marginBottom: "1.5rem" }}>
        <input type="checkbox" checked={printQr} onChange={(e) => setPrintQr(e.target.checked)} disabled={!loaded} />
        Imprimir el código QR en la etiqueta
      </label>

      <h2 style={sectionTitle}>Campos que se imprimen</h2>
      <p style={mutedText}>Orden de arriba hacia abajo tal como aparece en la etiqueta. Los campos vacíos para un registro no se imprimen igual (excepto nombre, empresa y expo).</p>

      <div style={{ marginBottom: "1rem" }}>
        {fields.length === 0 && <p style={{ fontSize: "0.85rem", color: colors.textDim }}>No hay campos seleccionados.</p>}
        {fields.map((field, i) => (
          <div
            key={field}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              marginBottom: "0.4rem",
              background: colors.bgAlt,
            }}
          >
            <span style={{ flex: 1, fontSize: "0.9rem", color: colors.text }}>{FIELD_LABELS[field]}</span>
            <button type="button" onClick={() => moveUp(i)} disabled={i === 0} style={buttonStyle({ variant: "ghost", disabled: i === 0 })}>
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveDown(i)}
              disabled={i === fields.length - 1}
              style={buttonStyle({ variant: "ghost", disabled: i === fields.length - 1 })}
            >
              ↓
            </button>
            <button type="button" onClick={() => hide(field)} style={buttonStyle({ variant: "danger" })}>
              Quitar
            </button>
          </div>
        ))}
      </div>

      {hiddenFields.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ ...mutedText, margin: "0 0 0.5rem" }}>Campos ocultos:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {hiddenFields.map((field) => (
              <button key={field} type="button" onClick={() => show(field)} style={buttonStyle({ variant: "ghost" })}>
                + {FIELD_LABELS[field]}
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={handleSave} disabled={saving || !loaded} style={buttonStyle({ disabled: saving || !loaded })}>
        {saving ? "Guardando…" : "Guardar"}
      </button>
      {saveError && <p style={errorText}>{saveError}</p>}
      {saveSuccess && <p style={successText}>{saveSuccess}</p>}
    </section>
  );
}
