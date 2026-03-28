import React, { useState, useEffect, useRef } from "react";
import { getNcLog, onNcLogChange, clearNcLog } from "../../utils/ncDebugLog";

/**
 * Live Debug-Panel für Nextcloud-Operationen.
 * Zeigt alle ncLog()-Einträge in einem scrollbaren Fenster.
 */
const NcDebugPanel = () => {
  const [logs, setLogs] = useState(getNcLog);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    return onNcLogChange((newLogs) => {
      setLogs(newLogs);
      // Auto-expand wenn erste Logs reinkommen
      if (newLogs.length > 0) setExpanded(true);
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0 && !expanded) return null;

  return (
    <div className="mt-3 border border-orange-300 dark:border-orange-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-orange-50 dark:bg-orange-900/30 text-xs font-bold text-orange-700 dark:text-orange-300"
      >
        <span>🔧 Nextcloud Debug ({logs.length})</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <>
          <div
            ref={scrollRef}
            className="max-h-[250px] overflow-y-auto bg-zinc-900 p-2 font-mono text-[10px] leading-tight text-green-400"
          >
            {logs.length === 0 ? (
              <span className="text-zinc-500">Warte auf Nextcloud-Operationen...</span>
            ) : (
              logs.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-all py-0.5">
                  {line}
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end px-2 py-1 bg-zinc-800">
            <button
              onClick={clearNcLog}
              className="text-[10px] text-zinc-400 hover:text-red-400"
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default NcDebugPanel;
