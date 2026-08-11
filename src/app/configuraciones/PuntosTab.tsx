"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buttonStyle, card, colors, errorText, inputStyle, mutedText, sectionTitle, warningBox } from "./styles";

type PrintPoint = { key: string; label: string; authorizedUserIds: string[]; sortOrder: number };

export function PuntosTab({ project, adminPassword }: { project: string; adminPassword: string }) {
  const [points, setPoints] = useState<PrintPoint[]>([]);
  const [provisioned, setProvisioned] = useState(true);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newIdText, setNewIdText] = useState<Record<string, string>>({});
  const dragRef = useRef<{ userId: string; fromKey: string } | null>(null);

  const fetchPoints = useCallback(() => {
    setLoading(true);
    setListError(null);
    const url = new URL("/api/admin/print-points", window.location.origin);
    url.searchParams.set("project", project);
    fetch(url.toString())
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((data: { points: PrintPoint[]; provisioned: boolean }) => {
        setPoints(data.points);
        setProvisioned(data.provisioned);
      })
      .catch((e) => setListError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [project]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  const savePoint = async (point: PrintPoint) => {
    const url = new URL("/api/admin/print-points", window.location.origin);
    url.searchParams.set("project", project);
    url.searchParams.set("token", adminPassword.trim());
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: point.key,
        label: point.label,
        authorizedUserIds: point.authorizedUserIds,
        sortOrder: point.sortOrder,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail ?? data.error ?? res.statusText);
  };

  const requireToken = (): boolean => {
    if (adminPassword.trim()) return true;
    setActionError("Introduce la contraseña de administrador arriba.");
    return false;
  };

  const moveUserId = async (userId: string, fromKey: string, toKey: string) => {
    if (fromKey === toKey || !requireToken()) return;
    const fromPoint = points.find((p) => p.key === fromKey);
    const toPoint = points.find((p) => p.key === toKey);
    if (!fromPoint || !toPoint) return;
    setActionError(null);
    setBusy(true);
    try {
      await savePoint({ ...fromPoint, authorizedUserIds: fromPoint.authorizedUserIds.filter((id) => id !== userId) });
      await savePoint({ ...toPoint, authorizedUserIds: [...toPoint.authorizedUserIds, userId] });
      fetchPoints();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleAddId = async (pointKey: string) => {
    const id = (newIdText[pointKey] ?? "").trim();
    if (!id || !requireToken()) return;
    setActionError(null);
    setBusy(true);
    try {
      // Un User ID solo debería estar asignado a un punto: si ya está en otro,
      // se mueve en vez de quedar duplicado (ambiguo para el webhook).
      const existingElsewhere = points.find((p) => p.key !== pointKey && p.authorizedUserIds.includes(id));
      if (existingElsewhere) {
        await savePoint({ ...existingElsewhere, authorizedUserIds: existingElsewhere.authorizedUserIds.filter((v) => v !== id) });
      }
      const target = points.find((p) => p.key === pointKey);
      if (target && !target.authorizedUserIds.includes(id)) {
        await savePoint({ ...target, authorizedUserIds: [...target.authorizedUserIds, id] });
      }
      setNewIdText((prev) => ({ ...prev, [pointKey]: "" }));
      fetchPoints();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveId = async (pointKey: string, userId: string) => {
    if (!requireToken()) return;
    const point = points.find((p) => p.key === pointKey);
    if (!point) return;
    setActionError(null);
    setBusy(true);
    try {
      await savePoint({ ...point, authorizedUserIds: point.authorizedUserIds.filter((v) => v !== userId) });
      fetchPoints();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={card}>
      <h2 style={sectionTitle}>Puntos de impresión</h2>
      <p style={mutedText}>
        Arrastra un User ID de CodeREADr entre puntos para reasignarlo de dispositivo, o agrégalo directo en el punto que
        corresponda.
      </p>

      {!provisioned && (
        <div style={{ ...warningBox, marginBottom: "1rem" }}>
          Esta expo todavía no guardó cambios aquí — se muestra la asignación actual. En cuanto agregues o muevas un User ID
          se guarda en la base de datos.
        </div>
      )}

      {listError && <p style={errorText}>{listError}</p>}
      {actionError && <p style={errorText}>{actionError}</p>}

      {loading ? (
        <p style={{ color: colors.textDim, fontSize: "0.9rem" }}>Cargando…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
          {points.map((point) => (
            <div
              key={point.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const drag = dragRef.current;
                dragRef.current = null;
                if (drag) moveUserId(drag.userId, drag.fromKey, point.key);
              }}
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: "0.75rem",
                background: colors.bgAlt,
                minHeight: 150,
              }}
            >
              <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem", color: colors.text }}>{point.label}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.6rem", minHeight: "1.6rem" }}>
                {point.authorizedUserIds.length === 0 && (
                  <span style={{ fontSize: "0.8rem", color: colors.textDim }}>Sin dispositivos</span>
                )}
                {point.authorizedUserIds.map((userId) => (
                  <span
                    key={userId}
                    draggable
                    onDragStart={() => {
                      dragRef.current = { userId, fromKey: point.key };
                    }}
                    title="Arrastra para mover a otro punto"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.25rem 0.5rem",
                      borderRadius: 999,
                      border: `1px solid ${colors.borderLight}`,
                      background: colors.bgDeep,
                      color: colors.text,
                      fontSize: "0.8rem",
                      fontFamily: "monospace",
                      cursor: "grab",
                    }}
                  >
                    {userId}
                    <button
                      type="button"
                      onClick={() => handleRemoveId(point.key, userId)}
                      disabled={busy}
                      aria-label={`Quitar ${userId} de ${point.label}`}
                      style={{
                        background: "none",
                        border: "none",
                        color: colors.danger,
                        cursor: busy ? "not-allowed" : "pointer",
                        padding: 0,
                        fontSize: "0.9rem",
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddId(point.key);
                }}
                style={{ display: "flex", gap: "0.4rem" }}
              >
                <input
                  value={newIdText[point.key] ?? ""}
                  onChange={(e) => setNewIdText((prev) => ({ ...prev, [point.key]: e.target.value }))}
                  placeholder="Nuevo User ID"
                  style={{ ...inputStyle, padding: "0.35rem 0.5rem", fontSize: "0.8rem" }}
                />
                <button type="submit" disabled={busy} style={buttonStyle({ variant: "ghost", disabled: busy })}>
                  Agregar
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
