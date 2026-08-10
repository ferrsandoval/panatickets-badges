"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

type PrintJob = {
  id: string;
  name: string;
  createdAt: string;
  printedAt: string | null;
};

const POINTS = [
  { key: "punto1", label: "Punto 1" },
  { key: "punto2", label: "Punto 2" },
  { key: "punto3", label: "Punto 3" },
  { key: "punto4", label: "Punto 4" },
] as const;

export default function PrintQueuePage() {
  return (
    <Suspense fallback={<p style={{ margin: "2rem auto", maxWidth: 1200 }}>Cargando…</p>}>
      <PrintQueueContent />
    </Suspense>
  );
}

function PrintQueueContent() {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPrinting, setCurrentlyPrinting] = useState<string | null>(null);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const isPrintingRef = useRef(false);
  const currentJobRef = useRef<PrintJob | null>(null);
  const markPrintedTimeoutRef = useRef<number | null>(null);

  const currentPoint = searchParams.get("point")?.trim() || null;
  const currentPointLabel =
    POINTS.find((point) => point.key === currentPoint)?.label ?? currentPoint;

  const fetchJobs = async () => {
    setLoading((prev) => prev && jobs.length === 0);
    setError(null);
    try {
      const url = new URL("/api/print-jobs", window.location.origin);
      url.searchParams.set("printed", "false");
      if (currentPoint) {
        url.searchParams.set("point", currentPoint);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(res.statusText);
      const data = (await res.json()) as PrintJob[];
      setJobs(data);
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

  const markPrinted = async (id: string) => {
    try {
      const url = new URL(`/api/print-jobs/${id}`, window.location.origin);
      if (currentPoint) {
        url.searchParams.set("point", currentPoint);
      }
      const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printed: true }),
      });
      if (!res.ok) throw new Error(res.statusText);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al marcar");
    }
  };

  // Cierra el job actual: marca impreso, limpia el iframe y refresca la cola.
  // Se llama al confirmar por postMessage que window.print() ya se disparó
  // (camino normal), o por el temporizador de respaldo si esa confirmación
  // nunca llega (fallo de red, job no encontrado, etc.) para no atascar la cola.
  const finishPrinting = async (job: PrintJob) => {
    if (currentJobRef.current?.id !== job.id) return;
    if (markPrintedTimeoutRef.current) {
      window.clearTimeout(markPrintedTimeoutRef.current);
      markPrintedTimeoutRef.current = null;
    }
    currentJobRef.current = null;
    await markPrinted(job.id);
    isPrintingRef.current = false;
    setCurrentlyPrinting(null);
    if (printFrameRef.current) {
      printFrameRef.current.src = "about:blank";
    }
    await fetchJobs();
  };

  useEffect(() => {
    function handlePrintConfirmation(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; id?: string } | null;
      if (!data || data.type !== "panatickets:printed" || !data.id) return;
      const currentJob = currentJobRef.current;
      if (!currentJob || currentJob.id !== data.id) return;
      void finishPrinting(currentJob);
    }
    window.addEventListener("message", handlePrintConfirmation);
    return () => window.removeEventListener("message", handlePrintConfirmation);
  }, []);

  useEffect(() => {
    if (!currentPoint) return;
    if (isPrintingRef.current) return;

    const nextJob = [...jobs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];

    if (!nextJob || !printFrameRef.current) return;

    isPrintingRef.current = true;
    currentJobRef.current = nextJob;
    setCurrentlyPrinting(nextJob.name);
    const labelUrl = new URL(`/label/${nextJob.id}`, window.location.origin);
    labelUrl.searchParams.set("autoprint", "1");
    labelUrl.searchParams.set("t", String(Date.now()));
    if (currentPoint) {
      labelUrl.searchParams.set("point", currentPoint);
    }
    printFrameRef.current.src = labelUrl.toString();
  }, [currentPoint, jobs]);

  const handlePrintFrameLoad = () => {
    const currentJob = currentJobRef.current;
    if (!currentJob) return;

    // Red de seguridad: normalmente la etiqueta confirma por postMessage en
    // cuanto dispara window.print(). Si esa confirmación no llega (job no
    // encontrado, error de red, JS bloqueado), este temporizador evita que
    // la cola se quede atascada esperando para siempre.
    markPrintedTimeoutRef.current = window.setTimeout(() => {
      void finishPrinting(currentJob);
    }, 8000);
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

      {loading && jobs.length === 0 ? (
        <p>Cargando…</p>
      ) : (
        <section
          style={{
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "0.75rem",
            background: "#020617",
          }}
        >
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
