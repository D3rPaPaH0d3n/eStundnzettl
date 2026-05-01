/**
 * PdfBlobPreview — Canvas-basierte PDF-Vorschau mit Zoom.
 *
 * Hintergrund: `<PDFViewer>` aus `@react-pdf/renderer` setzt eine
 * iframe mit `blob:`-Source. Die Capacitor-Android-WebView (auch
 * aktuelle Chrome-Builds in dieser Umgebung) blockiert/strippt
 * `blob:`-iframe-Sources zuverlaessig — die iframe bleibt schwarz.
 *
 * Dieser Renderer umgeht das Problem komplett, indem er das PDF mit
 * pdfjs-dist seitenweise auf `<canvas>`-Elemente zeichnet. Das
 * funktioniert in jedem WebView, weil keine iframe und keine
 * Plugin-Pfade benoetigt werden.
 *
 * Zoom: Pinch-to-Zoom (Mobile), Ctrl/Cmd + Mausrad (Desktop) und drei
 * Buttons (+/Reset/-) als Fallback. Skalierung wird ueber die Breite
 * des inneren Containers umgesetzt — kein CSS-Transform, damit der
 * Scrollbar korrekt mitwaechst und horizontaler Scroll funktioniert.
 *
 * Tradeoff: das Resultat ist ein Bild-Render; Text ist im UI nicht
 * mehr selektierbar. Die EXPORTIERTE PDF bleibt jedoch durchsuchbar
 * (das ist nur die In-App-Vorschau).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import { Loader, AlertTriangle, Plus, Minus, Maximize2 } from "lucide-react";
import { logger } from "../utils/logger";

const log = logger.scope("PdfBlobPreview");

// Worker einmalig konfigurieren. In Vite gibt `?url` die gehashte
// Asset-URL zurueck; pdfjs erstellt den Worker daraus selbststaendig.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

interface Props {
  blob: Blob | null;
  /** pdfjs-Render-Skala (1 = nativ). Hoeher = schaerfer aber mehr CPU/Memory. */
  renderScale?: number;
}

const PdfBlobPreview: React.FC<Props> = ({ blob, renderScale = 1.5 }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [userScale, setUserScale] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // ── PDF rendern ──────────────────────────────────────────────────
  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    setIsRendering(true);
    setError(null);

    (async () => {
      try {
        const buf = await blob.arrayBuffer();
        const doc = await pdfjsLib.getDocument({
          data: new Uint8Array(buf),
        }).promise;

        if (cancelled) {
          doc.destroy();
          return;
        }

        const container = contentRef.current;
        if (!container) {
          doc.destroy();
          return;
        }

        // Vor dem Re-Render alles abraeumen
        container.innerHTML = "";

        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) break;

          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: renderScale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.style.marginBottom = "12px";
          canvas.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.4)";
          canvas.style.background = "white";
          canvas.style.borderRadius = "4px";
          container.appendChild(canvas);

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          await page.render({
            canvasContext: ctx,
            viewport,
            canvas,
          }).promise;

          page.cleanup();
        }

        if (!cancelled) setPageCount(doc.numPages);
        doc.destroy();
      } catch (err) {
        if (!cancelled) {
          log.error("PDF-Vorschau fehlgeschlagen:", err);
          setError(String((err as Error)?.message || err));
        }
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blob, renderScale]);

  // ── Zoom-Aktionen ────────────────────────────────────────────────
  const zoomIn = useCallback(
    () => setUserScale((s) => clamp(s + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX)),
    [],
  );
  const zoomOut = useCallback(
    () => setUserScale((s) => clamp(s - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX)),
    [],
  );
  const resetZoom = useCallback(() => setUserScale(1), []);

  // ── Pinch-to-Zoom (Mobile) + Ctrl/Cmd-Wheel-Zoom (Desktop) ───────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let pinch: { startDist: number; startScale: number } | null = null;
    const distance = (a: Touch, b: Touch) => {
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinch = {
          startDist: distance(e.touches[0], e.touches[1]),
          // Wir lesen den aktuellen Scale aus dem Container, nicht aus dem
          // React-State, damit der Handler nicht jedes Mal neu bindet.
          startScale:
            parseFloat(contentRef.current?.dataset.userScale || "1") || 1,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        const ratio = distance(e.touches[0], e.touches[1]) / pinch.startDist;
        setUserScale(clamp(pinch.startScale * ratio, ZOOM_MIN, ZOOM_MAX));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
    };

    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const step = -Math.sign(e.deltaY) * ZOOM_STEP;
      setUserScale((s) => clamp(s + step, ZOOM_MIN, ZOOM_MAX));
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  // userScale via Data-Attribut spiegeln (fuer den Pinch-Handler oben).
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.dataset.userScale = String(userScale);
    }
  }, [userScale]);

  const zoomPercent = Math.round(userScale * 100);

  return (
    <div className="relative h-full">
      {/* Zoom-Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-stretch gap-1 bg-zinc-900/85 backdrop-blur-sm rounded-lg p-1 border border-zinc-700 shadow-lg select-none">
        <button
          type="button"
          onClick={zoomIn}
          disabled={userScale >= ZOOM_MAX - 0.0001}
          aria-label="Zoom in"
          className="p-1.5 rounded hover:bg-zinc-700/70 active:bg-zinc-700 text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          onClick={resetZoom}
          aria-label="Zoom zuruecksetzen"
          className="px-1.5 py-1 rounded hover:bg-zinc-700/70 active:bg-zinc-700 text-zinc-100 text-[10px] font-bold tabular-nums flex items-center justify-center gap-1"
          title="Auf 100% zuruecksetzen"
        >
          {userScale === 1 ? <Maximize2 size={14} /> : <span>{zoomPercent}%</span>}
        </button>
        <button
          type="button"
          onClick={zoomOut}
          disabled={userScale <= ZOOM_MIN + 0.0001}
          aria-label="Zoom out"
          className="p-1.5 rounded hover:bg-zinc-700/70 active:bg-zinc-700 text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Minus size={16} />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="h-full overflow-auto bg-zinc-800/50 p-3"
        // pan-x/pan-y reserviert den Single-Finger-Scroll fuer den Browser
        // und schaltet den nativen Pinch-Zoom ab, damit unser Handler greift.
        style={{ touchAction: "pan-x pan-y" }}
      >
        <div
          ref={contentRef}
          style={{
            width: `${userScale * 100}%`,
            transition: "width 80ms ease-out",
          }}
        />
      </div>

      {isRendering && pageCount === 0 && !error ? (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-400 pointer-events-none">
          <Loader className="animate-spin" size={28} />
        </div>
      ) : null}
      {error ? (
        <div className="flex flex-col items-center justify-center text-center text-zinc-400 p-6">
          <AlertTriangle size={32} className="text-amber-500 mb-3" />
          <p className="text-sm max-w-xs">
            Vorschau konnte nicht geladen werden: {error}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default PdfBlobPreview;
