import React, { useState, useEffect } from "react";
import { X, Check, Calendar, Save, AlertTriangle } from "lucide-react";
import { WORK_MODELS } from "../hooks/constants";

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (preset: any) => void;
  currentModelId?: string;
}

const PresetModal: React.FC<PresetModalProps> = ({ isOpen, onClose, onSelect, currentModelId }) => {
  const [selectedId, setSelectedId] = useState<string>(currentModelId || 'custom');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(currentModelId || 'custom');
    }
  }, [isOpen, currentModelId]);

  if (!isOpen) return null;

  const handleSave = () => {
    const selected = WORK_MODELS.find(m => m.id === selectedId);
    if (selected) {
      onSelect({
        name: selected.label,
        workDays: selected.days,
        monthlyTargetMinutes: 160 * 60, // 160 Stunden standard
      });
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Calendar size={22} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-zinc-800 dark:text-white">
                  Arbeitsmodell wählen
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Vorlage für Ihre Arbeitswoche
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors"
              aria-label="Schließen"
            >
              <X size={20} className="text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          <div className="space-y-3">
            {WORK_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedId(model.id)}
                className={`w-full p-4 rounded-xl text-left transition-colors ${
                  selectedId === model.id
                    ? "bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800"
                    : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{model.label}</div>
                    <div className="text-sm text-zinc-500 mt-1">
                      {model.days.map(day => ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][day]).join(", ")}
                    </div>
                  </div>
                  {selectedId === model.id && (
                    <Check size={20} className="text-emerald-500" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle size={16} />
              <span className="font-medium">Hinweis</span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Das gewählte Modell wird auf Ihre aktuelle Konfiguration angewendet. Ihre bestehenden Einträge bleiben erhalten.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-700">
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Anwenden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresetModal;