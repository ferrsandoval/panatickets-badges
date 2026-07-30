"use client";

import { useMemo, useState } from "react";

type ProjectOption = {
  key: string;
  label: string;
};

type ManualUserEntryProps = {
  projects: readonly ProjectOption[];
  defaultProjectKey?: string;
  buttonLabel?: string;
  onSaved?: () => void | Promise<void>;
};

export function ManualUserEntry({
  projects,
  defaultProjectKey,
  buttonLabel = "Ingresar manualmente",
  onSaved,
}: ManualUserEntryProps) {
  const initialProject = useMemo(
    () => defaultProjectKey && projects.some((project) => project.key === defaultProjectKey)
      ? defaultProjectKey
      : projects[0]?.key ?? "",
    [defaultProjectKey, projects]
  );

  const [open, setOpen] = useState(false);
  const [project, setProject] = useState(initialProject);
  const [name, setName] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [pais, setPais] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setProject(initialProject);
    setName("");
    setEmpresa("");
    setPais("");
    setError(null);
    setSuccess(null);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/qr-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          name,
          empresa,
          pais,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data?.detail ?? data?.error ?? response.statusText) || "No se pudo guardar");
      }

      setSuccess("Usuario cargado correctamente.");
      if (onSaved) {
        await onSaved();
      }
      setTimeout(() => {
        closeModal();
      }, 700);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
        style={{
          padding: "0.55rem 0.85rem",
          borderRadius: 8,
          border: "1px solid #22c55e",
          color: "#dcfce7",
          background: "rgba(34, 197, 94, 0.18)",
          fontSize: "0.9rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {buttonLabel}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 1000,
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 16,
              padding: "1.25rem",
              boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem", color: "#e2e8f0" }}>Ingresar usuario manual</h2>
                <p style={{ margin: "0.35rem 0 0", color: "#94a3b8", fontSize: "0.9rem" }}>
                  Selecciona la base y guarda el usuario en QR lookup para poder imprimirlo después.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "1.4rem",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gap: "0.9rem" }}>
              <label style={{ display: "grid", gap: "0.3rem", color: "#cbd5e1", fontSize: "0.9rem" }}>
                Base de datos
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.75rem",
                    fontSize: "0.95rem",
                    background: "#1e293b",
                    color: "#e2e8f0",
                    border: "1px solid #475569",
                    borderRadius: 8,
                  }}
                >
                  {projects.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: "0.3rem", color: "#cbd5e1", fontSize: "0.9rem" }}>
                Nombre
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={80}
                  placeholder="Ej. Juan Pérez"
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.75rem",
                    fontSize: "0.95rem",
                    background: "#1e293b",
                    color: "#e2e8f0",
                    border: "1px solid #475569",
                    borderRadius: 8,
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "0.3rem", color: "#cbd5e1", fontSize: "0.9rem" }}>
                Empresa
                <input
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  maxLength={80}
                  placeholder="Ej. Empresa SA"
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.75rem",
                    fontSize: "0.95rem",
                    background: "#1e293b",
                    color: "#e2e8f0",
                    border: "1px solid #475569",
                    borderRadius: 8,
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "0.3rem", color: "#cbd5e1", fontSize: "0.9rem" }}>
                País
                <input
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  required
                  maxLength={80}
                  placeholder="Ej. PANAMA"
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.75rem",
                    fontSize: "0.95rem",
                    background: "#1e293b",
                    color: "#e2e8f0",
                    border: "1px solid #475569",
                    borderRadius: 8,
                  }}
                />
              </label>
            </div>

            {error && <p style={{ margin: "0.9rem 0 0", color: "#fca5a5", fontSize: "0.9rem" }}>{error}</p>}
            {success && <p style={{ margin: "0.9rem 0 0", color: "#86efac", fontSize: "0.9rem" }}>{success}</p>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                style={{
                  padding: "0.65rem 0.95rem",
                  borderRadius: 8,
                  border: "1px solid #475569",
                  background: "#1e293b",
                  color: "#e2e8f0",
                  cursor: saving ? "default" : "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "0.65rem 0.95rem",
                  borderRadius: 8,
                  border: "none",
                  background: "#22c55e",
                  color: "#052e16",
                  fontWeight: 700,
                  cursor: saving ? "default" : "pointer",
                }}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
