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
  const envVar = `DATABASE_URL_${normalized}`;
  const url = process.env[envVar];

  if (!url) {
    throw new Error(
      `No se encontró la variable de entorno ${envVar} para el proyecto "${name}". ` +
        `Define ${envVar} con la cadena de conexión de esa base de datos.`
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
