/**
 * PdfBlobPreview — Canvas-basierte PDF-Vorschau.
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
 * Tradeoff: das Resultat ist ein Bild-Render; Text ist im UI nicht
 * mehr selektierbar. Die EXPORTIERTE PDF bleibt jedoch durchsuchbar
 * (das ist nur die In-App-Vorschau).
 */
import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import { Loader, AlertTriangle } from "lucide-react";
import { logger } from "../utils/logger";

const log = logger.scope("PdfBlobPreview");

// Worker einmalig konfigurieren. In Vite gibt `?url` die gehashte
// Asset-URL zurueck; pdfjs erstellt den Worker daraus selbststaendig.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface Props {
  blob: Blob | null;
  /** Render-Skala (1 = nativ). Hoehere Werte = schaerfer, mehr CPU/Memory. */
  scale?: number;
}

const PdfBlobPreview: React.FC<Props> = ({ blob, scale = 1.5 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

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
          // pdfjs ohne Standard-Fonts laeuft fuer unsere selbst-gebauten
          // (mit Roboto eingebettet) PDFs problemlos. Falls in Zukunft
          // externe PDFs angezeigt werden, hier `standardFontDataUrl`
          // ergaenzen.
        }).promise;

        if (cancelled) {
          doc.destroy();
          return;
        }

        const container = containerRef.current;
        if (!container) {
          doc.destroy();
          return;
        }

        // Vor dem Re-Render alles abraeumen
        container.innerHTML = "";

        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) break;

          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale });
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
  }, [blob, scale]);

  return (
    <div className="relative h-full overflow-y-auto bg-zinc-800/50 p-3">
      <div ref={containerRef} />
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
