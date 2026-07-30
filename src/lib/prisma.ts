import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaByProject?: Record<string, PrismaClient>;
};

const prismaLogLevels: Array<"query" | "error" | "warn"> =
  process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogLevels,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Obtiene un PrismaClient para un "proyecto" concreto, usando una variable de entorno
 * del tipo DATABASE_URL_<NOMBRE_PROYECTO_NORMALIZADO>.
 *
 * - Si no se pasa proyecto, usa la conexión por defecto (`DATABASE_URL`).
 * - Si se pasa `project=feria_panama`, se buscará `DATABASE_URL_FERIA_PANAMA`.
 */
/**
 * Devuelve la URL con ?schema=<schema>, reemplazando el que hubiera.
 * Varias expos comparten una instancia Postgres separándose por schema.
 */
function withSchema(url: string, schema: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("schema", schema);
    return parsed.toString();
  } catch {
    const stripped = url
      .replace(/([?&])schema=[^&]*&?/g, "$1")
      .replace(/[?&]$/, "");
    return `${stripped}${stripped.includes("?") ? "&" : "?"}schema=${encodeURIComponent(schema)}`;
  }
}

/**
 * Resuelve la URL de conexión de un proyecto a partir de sus variables de entorno.
 * Añade connect_timeout si falta. Lanza si no hay ninguna variable definida.
 */
export function resolveDatabaseUrlForProject(project: string): string {
  const name = project.trim();
  const normalized = name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const baseEnvVar = `DATABASE_URL_${normalized}`;
  const envCandidates = [
    baseEnvVar,
    `${baseEnvVar}_DATABASE_URL`,
    `${baseEnvVar}_POSTGRES_URL`,
    `${baseEnvVar}_PRISMA_DATABASE_URL`,
  ];
  const matchedEnvVar = envCandidates.find((envVar) => {
    const value = process.env[envVar];
    return typeof value === "string" && value.trim().length > 0;
  });
  let url = matchedEnvVar ? process.env[matchedEnvVar] : undefined;

  // Fallback: si la expo no tiene variable propia, usar la instancia compartida
  // (DATABASE_URL) con un schema por expo. Permite desplegar con una sola base.
  // Una variable específica de expo siempre tiene prioridad sobre este fallback.
  if (!url) {
    const shared = process.env.DATABASE_URL?.trim();
    if (shared) url = withSchema(shared, name);
  }

  if (!url) {
    throw new Error(
      `No se encontró una variable de entorno válida para el proyecto "${name}". ` +
        `Probé: ${envCandidates.join(", ")}, DATABASE_URL.`
    );
  }

  // Añadir connect_timeout si no está (ayuda con Prisma Postgres / serverless)
  if (url.includes("connect_timeout")) return url;
  return url.includes("?") ? `${url}&connect_timeout=15` : `${url}?connect_timeout=15`;
}

/**
 * Devuelve el schema declarado en la URL (?schema=...), o null si usa el por defecto (public).
 * Varias expos pueden compartir una misma instancia Postgres con un schema por expo.
 */
export function getSchemaFromDatabaseUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get("schema")?.trim() || null;
  } catch {
    const match = url.match(/[?&]schema=([^&]+)/);
    if (!match) return null;
    try {
      return decodeURIComponent(match[1]).trim() || null;
    } catch {
      return match[1].trim() || null;
    }
  }
}

export function getPrismaForProject(project: string | null | undefined): PrismaClient {
  const name = project?.trim();
  if (!name) return prisma;

  const cache = (globalForPrisma.prismaByProject ??= {});
  const cacheKey = name;
  if (cache[cacheKey]) return cache[cacheKey];

  const url = resolveDatabaseUrlForProject(name);

  const client = new PrismaClient({
    datasourceUrl: url,
    log: prismaLogLevels,
  });

  cache[cacheKey] = client;
  globalForPrisma.prismaByProject = cache;

  return client;
}
