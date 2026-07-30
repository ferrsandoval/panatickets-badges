"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

type PrintJob = {
  id: string;
  name: string;
  createdAt: string;
  printedAt: string | null;
};

// Prueba de venta a cliente: un solo proyecto (boletos), sin selector de expos.
const PROJECTS = [{ key: "expo_logistica_2026", label: "Boletos" }] as const;

const POINTS = [
  { key: "punto1", label: "Punto 1" },
  { key: "punto2", label: "Punto 2" },
  { key: "punto3", label: "Punto 3" },
  { key: "punto4", label: "Punto 4" },
] as const;

type JobsByProject = Record<string, PrintJob[]>;
type QueuedPrintJob = PrintJob & { projectKey: string; projectLabel: string };

export default function PrintQueuePage() {
  return (
    <Suspense fallback={<p style={{ margin: "2rem auto", maxWidth: 1200 }}>Cargando…</p>}>
      <PrintQueueContent />
    </Suspense>
  );
}

function PrintQueueContent() {
  const searchParams = useSearchParams();
  const [jobsByProject, setJobsByProject] = useState<JobsByProject>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPrinting, setCurrentlyPrinting] = useState<string | null>(null);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const isPrintingRef = useRef(false);
  const currentJobRef = useRef<QueuedPrintJob | null>(null);
  const markPrintedTimeoutRef = useRef<number | null>(null);

  const projectLabelByKey = useMemo(
    () => Object.fromEntries(PROJECTS.map((project) => [project.key, project.label])),
    []
  );
  const currentPoint = searchParams.get("point")?.trim() || null;
  const currentPointLabel =
    POINTS.find((point) => point.key === currentPoint)?.label ?? currentPoint;

  const fetchJobs = async () => {
    setLoading((prev) => prev && Object.keys(jobsByProject).length === 0);
    setError(null);
    try {
      const results = await Promise.all(
        PROJECTS.map(async ({ key }) => {
          const url = new URL("/api/print-jobs", window.location.origin);
          url.searchParams.set("printed", "false");
          url.searchParams.set("project", key);
          if (currentPoint) {
            url.searchParams.set("point", currentPoint);
          }
          const res = await fetch(url.toString());
          if (!res.ok) throw new Error(res.statusText);
          const data = (await res.json()) as PrintJob[];
          return [key, data] as const;
        })
      );
      setJobsByProject(Object.fromEntries(results));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchJobs();
    const t = setInterval(fetchJobs, 5000);
    return () => {
      clearInterval(t);
      if (markPrintedTimeoutRef.current) {
        window.clearTimeout(markPrintedTimeoutRef.current);
      }
    };
  }, [currentPoint]);

  const markPrinted = async (projectKey: string, id: string) => {
    try {
      const url = new URL(`/api/print-jobs/${id}`, window.location.origin);
      url.searchParams.set("project", projectKey);
      if (currentPoint) {
        url.searchParams.set("point", currentPoint);
      }
      const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printed: true }),
      });
      if (!res.ok) throw new Error(res.statusText);
      setJobsByProject((prev) => ({
        ...prev,
        [projectKey]: (prev[projectKey] ?? []).filter((j) => j.id !== id),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al marcar");
    }
  };

  useEffect(() => {
    if (!currentPoint) return;
    if (isPrintingRef.current) return;

    const nextJob = Object.entries(jobsByProject)
      .flatMap(([projectKey, jobs]) =>
        (jobs ?? []).map((job) => ({
          ...job,
          projectKey,
          projectLabel: projectLabelByKey[projectKey] ?? projectKey,
        }))
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

    if (!nextJob || !printFrameRef.current) return;

    isPrintingRef.current = true;
    currentJobRef.current = nextJob;
    setCurrentlyPrinting(`${nextJob.projectLabel}: ${nextJob.name}`);
    const labelUrl = new URL(`/label/${nextJob.id}`, window.location.origin);
    labelUrl.searchParams.set("project", nextJob.projectKey);
    labelUrl.searchParams.set("autoprint", "1");
    labelUrl.searchParams.set("t", String(Date.now()));
    if (currentPoint) {
      labelUrl.searchParams.set("point", currentPoint);
    }
    printFrameRef.current.src = labelUrl.toString();
  }, [currentPoint, jobsByProject, projectLabelByKey]);

  const handlePrintFrameLoad = () => {
    const currentJob = currentJobRef.current;
    if (!currentJob) return;

    markPrintedTimeoutRef.current = window.setTimeout(async () => {
      await markPrinted(currentJob.projectKey, currentJob.id);
      currentJobRef.current = null;
      isPrintingRef.current = false;
      setCurrentlyPrinting(null);
      if (printFrameRef.current) {
        printFrameRef.current.src = "about:blank";
      }
      await fetchJobs();
    }, 1200);
  };

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto" }}>
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.5rem",
          padding: "1rem 1.25rem",
          border: "1px solid #334155",
          borderRadius: 16,
          background:
            "linear-gradient(135deg, rgba(2,6,23,0.96) 0%, rgba(15,23,42,0.96) 60%, rgba(8,47,73,0.96) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0 }}>
          <img
            src="/logo-panatickets.png"
            alt="PanaTickets"
            style={{ width: 132, height: 132, objectFit: "contain", flexShrink: 0 }}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#38bdf8",
              }}
            >
              PanaTickets
            </p>
            <h1
              style={{
                margin: "0.15rem 0 0.35rem",
                fontSize: "1.8rem",
                lineHeight: 1.1,
              }}
            >
              {currentPointLabel ?? "Centro de impresion"}
            </h1>
            <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.95rem" }}>
              Operacion de acreditacion en tiempo real
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {currentPoint && (
            <div
              style={{
                padding: "0.55rem 0.85rem",
                borderRadius: 999,
                border: "1px solid #0ea5e9",
                color: "#e0f2fe",
                background: "rgba(8, 47, 73, 0.55)",
                fontSize: "0.9rem",
                whiteSpace: "nowrap",
              }}
            >
              {currentPointLabel}
            </div>
          )}
          <Link
            href="/databases"
            style={{
              padding: "0.55rem 0.85rem",
              borderRadius: 8,
              border: "1px solid #0ea5e9",
              color: "#38bdf8",
              fontSize: "0.9rem",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Ver impresos / reimprimir
          </Link>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        {POINTS.map((point) => (
          <Link
            key={point.key}
            href={`/${point.key}`}
            style={{
              display: "block",
              border: "1px solid #334155",
              borderRadius: 8,
              padding: "0.85rem 1rem",
              background: currentPoint === point.key ? "#082f49" : "#020617",
              color: "#e2e8f0",
              textDecoration: "none",
            }}
          >
            {point.label}
          </Link>
        ))}
      </section>

      {error && (
        <p style={{ color: "#f87171", marginBottom: "1rem" }}>{error}</p>
      )}

      {currentlyPrinting && (
        <p style={{ color: "#38bdf8", marginBottom: "1rem" }}>
          Imprimiendo: {currentlyPrinting}
        </p>
      )}

      {loading && Object.values(jobsByProject).every((list) => (list ?? []).length === 0) ? (
        <p>Cargando…</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {PROJECTS.map(({ key, label }) => {
            const jobs = jobsByProject[key] ?? [];
            return (
              <section
                key={key}
                style={{
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "0.75rem",
                  background: "#020617",
                }}
              >
                <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{label}</h2>
                {jobs.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: "0.875rem" }}>No hay etiquetas pendientes.</p>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "0.875rem" }}>
                    {jobs.map((job) => (
                      <li
                        key={job.id}
                        style={{
                          borderBottom: "1px solid #1e293b",
                          padding: "0.5rem 0.4rem",
                          color: currentJobRef.current?.id === job.id ? "#38bdf8" : "#e2e8f0",
                        }}
                      >
                        {job.name}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
      <iframe
        ref={printFrameRef}
        title="print-frame"
        onLoad={handlePrintFrameLoad}
        style={{
          position: "fixed",
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: "none",
          border: 0,
          bottom: 0,
          right: 0,
        }}
      />
    </main>
  );
}
