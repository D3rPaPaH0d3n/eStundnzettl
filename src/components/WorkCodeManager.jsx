// ============================================================
// WorkCodeManager.jsx - Verwaltung der Tätigkeitscodes
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Pencil, 
  Trash2, 
  Download, 
  AlertTriangle,
  Check,
  ChevronDown,
  ListChecks
} from 'lucide-react';
import { useWorkCodes } from '../hooks/useWorkCodes';
import { ANIMATION } from '../hooks/constants';

// -------------------------------------------------------
// Hauptkomponente
// -------------------------------------------------------
export const WorkCodeManager = ({ isOpen, onClose }) => {
  const {
    workCodes,
    isLoading,
    hasAnyCodes,
    addCode,
    updateCode,
    deleteCode,
    loadPreset,
    availablePresets,
    clearAllCodes,
  } = useWorkCodes();

  // Local State
  const [newCodeLabel, setNewCodeLabel] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showPresetConfirm, setShowPresetConfirm] = useState(null);

  // -------------------------------------------------------
  // Handlers
  // -------------------------------------------------------
  const handleAddCode = () => {
    if (addCode(newCodeLabel)) {
      setNewCodeLabel('');
    }
  };

  const handleStartEdit = (code) => {
    setEditingId(code.id);
    setEditingLabel(code.label);
  };

  const handleSaveEdit = () => {
    if (updateCode(editingId, editingLabel)) {
      setEditingId(null);
      setEditingLabel('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingLabel('');
  };

  const handleLoadPreset = (presetId) => {
    if (hasAnyCodes) {
      setShowPresetConfirm(presetId);
    } else {
      loadPreset(presetId);
    }
    setShowPresetDropdown(false);
  };

  const confirmLoadPreset = () => {
    if (showPresetConfirm) {
      loadPreset(showPresetConfirm);
      setShowPresetConfirm(null);
    }
  };

  const handleDeleteAll = () => {
    clearAllCodes();
    setShowDeleteAllConfirm(false);
  };

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: ANIMATION.DURATION }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: ANIMATION.DURATION }}
          className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-3">
              <ListChecks className="w-6 h-6 text-sky-500" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Tätigkeitscodes
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preset Dropdown */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
            <div className="relative">
              <button
                onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-sky-500" />
                  Preset laden
                </span>
                <ChevronDown className={`w-5 h-5 transition-transform ${showPresetDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showPresetDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-700 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-600 overflow-hidden z-10"
                  >
                    {availablePresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleLoadPreset(preset.id)}
                        className="w-full px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors"
                      >
                        <div className="font-medium text-zinc-900 dark:text-white">
                          {preset.name}
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                          {preset.description} ({preset.codes.length} Codes)
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Code Liste */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="text-center text-zinc-500 py-8">Laden...</div>
            ) : !hasAnyCodes ? (
              <div className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Keine Codes vorhanden.</p>
                <p className="text-sm mt-1">Lade ein Preset oder erstelle eigene Codes.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {workCodes.map((code) => (
                  <div
                    key={code.id}
                    className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-xl"
                  >
                    {editingId === code.id ? (
                      // Edit Mode
                      <>
                        <input
                          type="text"
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-zinc-600 border border-zinc-300 dark:border-zinc-500 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      // Display Mode
                      <>
                        <span className="flex-1 text-zinc-700 dark:text-zinc-200">
                          {code.label}
                        </span>
                        <button
                          onClick={() => handleStartEdit(code)}
                          className="p-2 text-zinc-500 hover:text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCode(code.id)}
                          className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Neuer Code Input */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCodeLabel}
                onChange={(e) => setNewCodeLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCode();
                }}
                placeholder="Neuen Code hinzufügen..."
                className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-700 border-0 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                onClick={handleAddCode}
                disabled={!newCodeLabel.trim()}
                className="px-4 py-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Alle löschen Button */}
            {hasAnyCodes && (
              <button
                onClick={() => setShowDeleteAllConfirm(true)}
                className="w-full mt-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                Alle Codes löschen
              </button>
            )}
          </div>
        </motion.div>

        {/* Confirm Modal: Preset laden */}
        <AnimatePresence>
          {showPresetConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 z-60"
              onClick={() => setShowPresetConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white dark:bg-zinc-800 rounded-2xl p-6 m-4 max-w-sm shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 text-amber-500 mb-4">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="font-bold text-lg">Achtung!</h3>
                </div>
                <p className="text-zinc-600 dark:text-zinc-300 mb-6">
                  Das Laden eines Presets ersetzt alle deine aktuellen Codes. Fortfahren?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPresetConfirm(null)}
                    className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={confirmLoadPreset}
                    className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors"
                  >
                    Ja, ersetzen
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm Modal: Alle löschen */}
        <AnimatePresence>
          {showDeleteAllConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 z-60"
              onClick={() => setShowDeleteAllConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white dark:bg-zinc-800 rounded-2xl p-6 m-4 max-w-sm shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 text-red-500 mb-4">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="font-bold text-lg">Alle löschen?</h3>
                </div>
                <p className="text-zinc-600 dark:text-zinc-300 mb-6">
                  Möchtest du wirklich alle Tätigkeitscodes löschen? Dies kann nicht rückgängig gemacht werden.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteAllConfirm(false)}
                    className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleDeleteAll}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                  >
                    Ja, löschen
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default WorkCodeManager;