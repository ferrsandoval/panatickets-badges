import type { CSSProperties } from "react";

export const colors = {
  bg: "#0f172a",
  bgAlt: "#1e293b",
  bgDeep: "#020617",
  border: "#334155",
  borderLight: "#475569",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  accent: "#38bdf8",
  accentBg: "#0ea5e9",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
  dangerBg: "#b91c1c",
} as const;

export const card: CSSProperties = {
  marginBottom: "1.5rem",
  padding: "1rem",
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  background: colors.bg,
};

export const sectionTitle: CSSProperties = { margin: "0 0 0.5rem", fontSize: "1.1rem" };
export const mutedText: CSSProperties = { margin: "0 0 1rem", fontSize: "0.85rem", color: colors.textMuted };

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.6rem",
  background: colors.bgAlt,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: 6,
  color: colors.text,
  fontSize: "0.9rem",
};

export const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  color: colors.textMuted,
  marginBottom: "0.25rem",
};

export function buttonStyle(opts: { disabled?: boolean; variant?: "primary" | "danger" | "ghost" } = {}): CSSProperties {
  const { disabled, variant = "primary" } = opts;
  if (variant === "ghost") {
    return {
      padding: "0.35rem 0.65rem",
      background: "transparent",
      color: disabled ? colors.textDim : colors.accent,
      border: `1px solid ${disabled ? colors.border : colors.accent}`,
      borderRadius: 6,
      fontSize: "0.8rem",
      cursor: disabled ? "not-allowed" : "pointer",
    };
  }
  const bg = disabled ? "#475569" : variant === "danger" ? colors.dangerBg : colors.accentBg;
  return {
    padding: "0.5rem 1rem",
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: "0.9rem",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
  };
}

export const errorText: CSSProperties = { margin: "0.75rem 0 0", color: colors.danger, fontSize: "0.85rem" };
export const successText: CSSProperties = { margin: "0.75rem 0 0", color: colors.success, fontSize: "0.85rem" };

export const errorBox: CSSProperties = {
  marginBottom: "1rem",
  padding: "1rem",
  background: "rgba(248, 113, 113, 0.1)",
  border: `1px solid ${colors.danger}`,
  borderRadius: 8,
  color: "#fca5a5",
};

export const warningBox: CSSProperties = {
  marginBottom: "1rem",
  padding: "1rem",
  background: "rgba(251, 191, 36, 0.15)",
  border: `1px solid ${colors.warning}`,
  borderRadius: 8,
  color: colors.warning,
};
