/**
 * Mapeo Expo (CSV) -> project key.
 * Orden: expositores primero (más específico), luego invitados.
 */
function normalizeForMatch(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function toProjectKey(expoRaw: string | null | undefined): string | null {
  if (!expoRaw || !expoRaw.trim()) return null;
  const n = normalizeForMatch(expoRaw).replace(/\s+/g, " ");
  if (n.includes("logistica") && n.includes("expositores")) return "expo_logistica_expositores_2026";
  if (n.includes("turismo") && n.includes("expositores")) return "expo_turismo_expositores_2026";
  if (n.includes("comer") && n.includes("expositores")) return "expo_comer_expositores_2026";
  if (n.includes("tech") && n.includes("expositores")) return "expo_tech_expositores_2026";
  if (n.includes("electronica") && n.includes("expositores")) return "expo_electronica_expositores_2026";
  if (n.includes("logistica")) return "expo_logistica_2026";
  if (n.includes("turismo")) return "expo_turismo_2026";
  if (n.includes("comer") || n.includes("expocomer")) return "expo_comer_2026";
  if (n.includes("tech")) return "expo_tech_2026";
  if (n.includes("electronica")) return "expo_electronica_2026";
  return null;
}

export function createMatchKey(
  name: string | null | undefined,
  empresa: string | null | undefined,
  email: string | null | undefined
): string {
  const n = normalizeForMatch(name);
  const e = normalizeForMatch(empresa);
  const em = normalizeForMatch(email);
  return `${n}|${e}|${em}`;
}
