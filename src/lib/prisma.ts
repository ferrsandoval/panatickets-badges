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
export function getPrismaForProject(project: string | null | undefined): PrismaClient {
  const name = project?.trim();
  if (!name) return prisma;

  const cache = (globalForPrisma.prismaByProject ??= {});
  const cacheKey = name;
  if (cache[cacheKey]) return cache[cacheKey];

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
  const url = matchedEnvVar ? process.env[matchedEnvVar] : undefined;

  if (!url) {
    throw new Error(
      `No se encontró una variable de entorno válida para el proyecto "${name}". ` +
        `Probé: ${envCandidates.join(", ")}.`
    );
  }

  const client = new PrismaClient({
    datasourceUrl: url,
    log: prismaLogLevels,
  });

  cache[cacheKey] = client;
  globalForPrisma.prismaByProject = cache;

  return client;
}
