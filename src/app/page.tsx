"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PrintJob = {
  id: string;
  name: string;
  createdAt: string;
  printedAt: string | null;
};

type EchoDebugPayload = {
  ok: boolean;
  message: string;
  receivedAt: string | null;
  bodyKeys: string[];
  bodySample: Record<string, string>;
};

const PROJECTS = [
  { key: "expo_logistica_2026", label: "EXPO LOGISTICA 2026" },
  { key: "expo_turismo_2026", label: "EXPO TURISMO 2026" },
  { key: "expo_comer_2026", label: "EXPO COMER 2026" },
  { key: "expo_tech_2026", label: "EXPO TECH 2026" },
  { key: "expo_electronica_2026", label: "EXPO ELECTRÓNICA 2026" },
] as const;

type JobsByProject = Record<string, PrintJob[]>;
type QueuedPrintJob = PrintJob & { projectKey: string; projectLabel: string };

export default function PrintQueuePage() {
  const [jobsByProject, setJobsByProject] = useState<JobsByProject>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPrinting, setCurrentlyPrinting] = useState<string | null>(null);
  const [echoDebug, setEchoDebug] = useState<EchoDebugPayload | null>(null);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const isPrintingRef = useRef(false);
  const currentJobRef = useRef<QueuedPrintJob | null>(null);
  const markPrintedTimeoutRef = useRef<number | null>(null);

  const projectLabelByKey = useMemo(
    () => Object.fromEntries(PROJECTS.map((project) => [project.key, project.label])),
    []
  );

  const fetchJobs = async () => {
    setLoading((prev) => prev && Object.keys(jobsByProject).length === 0);
    setError(null);
    try {
      const results = await Promise.all(
        PROJECTS.map(async ({ key }) => {
          const url = new URL("/api/print-jobs", window.location.origin);
          url.searchParams.set("printed", "false");
          url.searchParams.set("project", key);
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

  const fetchEchoDebug = async () => {
    try {
      const res = await fetch("/api/webhook/codereadr/echo", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as EchoDebugPayload;
      setEchoDebug(data);
    } catch {
      // El debug es opcional; no interrumpir la cola si falla.
    }
  };

  useEffect(() => {
    void fetchJobs();
    void fetchEchoDebug();
    const t = setInterval(fetchJobs, 5000);
    const echoTimer = setInterval(fetchEchoDebug, 3000);
    return () => {
      clearInterval(t);
      clearInterval(echoTimer);
      if (markPrintedTimeoutRef.current) {
        window.clearTimeout(markPrintedTimeoutRef.current);
      }
    };
  }, []);

  const markPrinted = async (projectKey: string, id: string) => {
    try {
      const url = new URL(`/api/print-jobs/${id}`, window.location.origin);
      url.searchParams.set("project", projectKey);
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
    printFrameRef.current.src = `/label/${nextJob.id}?project=${encodeURIComponent(nextJob.projectKey)}&autoprint=1&t=${Date.now()}`;
  }, [jobsByProject, projectLabelByKey]);

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
      <h1 style={{ marginBottom: "0.5rem" }}>Colas de impresión – Expos 2026</h1>
      <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
        Todas las expos se muestran en esta pantalla. Cada etiqueta pendiente se imprime automáticamente en Chrome
        con `--kiosk-printing`.
      </p>

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
      <section
        style={{
          marginTop: "2rem",
          padding: "1rem",
          border: "1px solid #334155",
          borderRadius: 8,
          background: "#020617",
        }}
      >
        <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Echo de CodeREADr</h2>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: "0.85rem",
            color: "#cbd5e1",
          }}
        >
          {JSON.stringify(echoDebug ?? { ok: true, message: "Cargando echo..." }, null, 2)}
        </pre>
      </section>
    </main>
  );
}
