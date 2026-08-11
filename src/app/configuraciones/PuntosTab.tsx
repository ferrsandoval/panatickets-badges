"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonStyle, card, colors, errorText, inputStyle, labelStyle, mutedText, sectionTitle, warningBox } from "./styles";

type PrintPoint = { key: string; label: string; authorizedUserIds: string[]; sortOrder: number };

const EMPTY_FORM = { key: "", label: "", userIdsText: "", sortOrder: "0" };

export function PuntosTab({ project, adminToken }: { project: string; adminToken: string }) {
  const [points, setPoints] = useState<PrintPoint[]>([]);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const fetchPoints = useCallback(() => {
    setLoading(true);
    setListError(null);
    const url = new URL("/api/admin/print-points", window.location.origin);
    url.searchParams.set("project", project);
    fetch(url.toString())
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((data: { points: PrintPoint[]; usingDefaults: boolean }) => {
        setPoints(data.points);
        setUsingDefaults(data.usingDefaults);
      })
      .catch((e) => setListError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [project]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const startNew = () => {
    setEditingKey(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
  };

  const startEdit = (point: PrintPoint) => {
    setEditingKey(point.key);
    setForm({
      key: point.key,
      label: point.label,
      userIdsText: point.authorizedUserIds.join("\n"),
      sortOrder: String(point.sortOrder),
    });
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    if (!adminToken.trim()) {
      setSaveError("Introduce el token de administrador arriba.");
      return;
    }
    if (!form.key.trim() || !form.label.trim()) {
      setSaveError("La clave y la etiqueta son obligatorias.");
      return;
    }
    setSaving(true);
    try {
      const url = new URL("/api/admin/print-points", window.location.origin);
      url.searchParams.set("project", project);
      url.searchParams.set("token", adminToken.trim());
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: form.key.trim(),
          label: form.label.trim(),
          authorizedUserIds: form.userIdsText.split("\n").map((v) => v.trim()).filter(Boolean),
          sortOrder: Number(form.sortOrder) || 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? data.error ?? res.statusText);
      startNew();
      fetchPoints();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!adminToken.trim()) {
      setSaveError("Introduce el token de administrador arriba.");
      return;
    }
    if (!confirm(`¿Borrar el punto "${key}"? Los dispositivos con este punto dejarán de estar autorizados.`)) return;
    setDeletingKey(key);
    try {
      const url = new URL("/api/admin/print-points", window.location.origin);
      url.searchParams.set("project", project);
      url.searchParams.set("token", adminToken.trim());
      url.searchParams.set("key", key);
      const res = await fetch(url.toString(), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? data.error ?? res.statusText);
      if (editingKey === key) startNew();
      fetchPoints();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <>
      {usingDefaults && (
        <section style={warningBox}>
          <strong>Sin provisionar.</strong> Esta expo todavía no tiene la tabla de puntos de impresión (o está vacía). Mientras
          tanto, el webhook usa el mapa fijo de User ID → punto que ya existe en el código. En cuanto agregues el primer punto
          aquí, ese mapa deja de usarse para esta expo.
        </section>
      )}

      <section style={card}>
        <h2 style={sectionTitle}>{editingKey ? `Editar punto "${editingKey}"` : "Agregar punto de impresión"}</h2>
        <p style={mutedText}>
          Cada dispositivo CodeREADr envía su &quot;User ID&quot;. Un punto puede tener varios User ID autorizados (uno por
          línea).
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 140px", minWidth: 0 }}>
            <label style={labelStyle}>Clave (key)</label>
            <input
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              placeholder="punto5"
              disabled={editingKey !== null}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: "1 1 160px", minWidth: 0 }}>
            <label style={labelStyle}>Etiqueta</label>
            <input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Punto 5"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: "1 1 90px", minWidth: 0 }}>
            <label style={labelStyle}>Orden</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <label style={labelStyle}>User ID autorizados (uno por línea)</label>
            <textarea
              value={form.userIdsText}
              onChange={(e) => setForm((f) => ({ ...f, userIdsText: e.target.value }))}
              placeholder={"567189\n566374"}
              rows={2}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace" }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", paddingBottom: "0.1rem" }}>
            <button type="submit" disabled={saving} style={buttonStyle({ disabled: saving })}>
              {saving ? "Guardando…" : editingKey ? "Guardar cambios" : "Agregar"}
            </button>
            {editingKey && (
              <button type="button" onClick={startNew} style={buttonStyle({ variant: "ghost" })}>
                Cancelar
              </button>
            )}
          </div>
        </form>
        {saveError && <p style={errorText}>{saveError}</p>}
      </section>

      <section style={{ ...card, overflow: "hidden", padding: 0 }}>
        <h2 style={{ ...sectionTitle, padding: "1rem", margin: 0, borderBottom: `1px solid ${colors.border}` }}>
          Puntos configurados
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead style={{ background: colors.bgAlt }}>
              <tr style={{ color: colors.textMuted }}>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Clave</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Etiqueta</th>
                <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>User ID autorizados</th>
                <th style={{ textAlign: "right", padding: "0.6rem 0.75rem" }}>Orden</th>
                <th style={{ textAlign: "right", padding: "0.6rem 0.75rem" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "1.5rem", color: colors.textDim }}>
                    Cargando…
                  </td>
                </tr>
              ) : listError ? (
                <tr>
                  <td colSpan={5} style={{ padding: "1.5rem", color: colors.danger }}>
                    {listError}
                  </td>
                </tr>
              ) : points.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "1.5rem", color: colors.textDim }}>
                    No hay puntos configurados. Se usa el mapa fijo del código como respaldo.
                  </td>
                </tr>
              ) : (
                points.map((p) => (
                  <tr key={p.key} style={{ borderTop: `1px solid ${colors.bgAlt}` }}>
                    <td style={{ padding: "0.6rem 0.75rem", color: colors.text, fontFamily: "monospace" }}>{p.key}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: colors.text }}>{p.label}</td>
                    <td style={{ padding: "0.6rem 0.75rem", color: colors.textMuted, fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {p.authorizedUserIds.length > 0 ? p.authorizedUserIds.join(", ") : "—"}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: colors.textMuted, textAlign: "right" }}>{p.sortOrder}</td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", whiteSpace: "nowrap" }}>
                      <button type="button" onClick={() => startEdit(p)} style={{ ...buttonStyle({ variant: "ghost" }), marginRight: "0.4rem" }}>
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.key)}
                        disabled={deletingKey === p.key}
                        style={buttonStyle({ variant: "danger", disabled: deletingKey === p.key })}
                      >
                        {deletingKey === p.key ? "Borrando…" : "Borrar"}
                      </button>
                    </td>
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
