import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrismaForProject } from "@/lib/prisma";
import { createMatchKey, toProjectKey } from "@/lib/scan-stats-cross";

const PROJECTS = [
  { key: "expo_logistica_2026", label: "EXPO LOGISTICA 2026" },
  { key: "expo_turismo_2026", label: "EXPO TURISMO 2026" },
  { key: "expo_comer_2026", label: "EXPOCOMER 2026" },
  { key: "expo_tech_2026", label: "EXPO TECH 2026" },
  { key: "expo_electronica_2026", label: "EXPO ELECTRÓNICA 2026" },
  { key: "expo_logistica_expositores_2026", label: "EXPO LOGISTICA EXPOSITORES 2026" },
  { key: "expo_turismo_expositores_2026", label: "EXPO TURISMO EXPOSITORES 2026" },
  { key: "expo_comer_expositores_2026", label: "EXPOCOMER EXPOSITORES 2026" },
  { key: "expo_tech_expositores_2026", label: "EXPO TECH EXPOSITORES 2026" },
  { key: "expo_electronica_expositores_2026", label: "EXPO ELECTRÓNICA EXPOSITORES 2026" },
];

export type CrossStatsRow = {
  projectKey: string;
  projectLabel: string;
  scansInCsv: number;
  matchedInPrintJob: number;
};

/**
 * GET /api/admin/scan-stats-cross
 * Cruza scan_records (CSV) con PrintJob de cada expo.
 * Para cada expo: cuántos escaneos del CSV tienen un PrintJob en esa expo (match por nombre+empresa+email o can_ID=scanId).
 */
export async function GET() {
  try {
    const scans = await prisma.scanRecord.findMany({
      select: {
        canId: true,
        expo: true,
        personaNombre: true,
        personaCompania: true,
        personaEmail: true,
      },
    });

    if (scans.length === 0) {
      return NextResponse.json({
        totalScans: 0,
        byExpo: PROJECTS.map((p) => ({
          projectKey: p.key,
          projectLabel: p.label,
          scansInCsv: 0,
          matchedInPrintJob: 0,
        })),
      });
    }

    const scansByExpo: Record<string, typeof scans> = {};
    for (const scan of scans) {
      const key = toProjectKey(scan.expo) ?? "_otras";
      if (!scansByExpo[key]) scansByExpo[key] = [];
      scansByExpo[key].push(scan);
    }

    const byExpo: CrossStatsRow[] = [];

    for (const { key, label } of PROJECTS) {
      let matchedCount = 0;
      try {
        const projectPrisma = getPrismaForProject(key);
        const printJobs = await projectPrisma.printJob.findMany({
          select: {
            scanId: true,
            name: true,
            empresa: true,
            email: true,
          },
        });

        const printJobKeys = new Set(
          printJobs.map((j) => createMatchKey(j.name, j.empresa, j.email))
        );
        const printJobByScanId = new Map(
          printJobs.filter((j) => j.scanId).map((j) => [j.scanId!, j])
        );

        const scansForThisExpo = scansByExpo[key] ?? [];

        for (const scan of scansForThisExpo) {
          const matchByScanId =
            scan.canId && printJobByScanId.has(scan.canId);
          const matchKey = createMatchKey(
            scan.personaNombre,
            scan.personaCompania,
            scan.personaEmail
          );
          const matchByFields =
            matchKey !== "||" && printJobKeys.has(matchKey);
          if (matchByScanId || matchByFields) {
            matchedCount++;
          }
        }
      } catch {
        matchedCount = 0;
      }

      const scansInCsv = scansByExpo[key]?.length ?? 0;
      byExpo.push({
        projectKey: key,
        projectLabel: label,
        scansInCsv,
        matchedInPrintJob: matchedCount,
      });
    }

    const otras = scansByExpo["_otras"]?.length ?? 0;
    if (otras > 0) {
      byExpo.push({
        projectKey: "_otras",
        projectLabel: "Otras / Expo no reconocida",
        scansInCsv: otras,
        matchedInPrintJob: 0,
      });
    }

    return NextResponse.json({
      totalScans: scans.length,
      byExpo,
    });
  } catch (e) {
    console.error("scan-stats-cross error", e);
    return NextResponse.json(
      { error: "Error al cruzar datos", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
