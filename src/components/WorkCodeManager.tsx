// @ts-nocheck
// ============================================================
// WorkCodeManager.tsx - Verwaltung der Tätigkeitscodes
// ============================================================

import React, { useState } from 'react';
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
import { WorkCode } from '../types';

// -------------------------------------------------------
// Hauptkomponente
// -------------------------------------------------------
interface WorkCodeManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkCodeManager: React.FC<WorkCodeManagerProps> = ({ isOpen, onClose }) => {
  const {
    workCodes,
    isLoading,
    hasAnyCodes,
    addCode,
    updateCode,
    deleteCode,
    exportCodes,
    importCodes,
    resetToDemo
  } = useWorkCodes();

  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [showDemoWarning, setShowDemoWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState<number | null>(null);

  const handleAdd = () => {
    if (!newCode.trim()) return;
    addCode({
      code: newCode.trim(),
      description: newDescription.trim() || newCode.trim()
    });
    setNewCode('');
    setNewDescription('');
  };

  const handleStartEdit = (code: WorkCode) => {
    setEditingId(code.id);
    setEditCode(code.code);
    setEditDescription(code.description);
  };

  const handleSaveEdit = () => {
    if (editingId === null || !editCode.trim()) return;
    updateCode(editingId, {
      code: editCode.trim(),
      description: editDescription.trim() || editCode.trim()
    });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = (id: number) => {
    setShowDeleteWarning(id);
  };

  const handleConfirmDelete = () => {
    if (showDeleteWarning !== null) {
      deleteCode(showDeleteWarning);
      setShowDeleteWarning(null);
    }
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importJson);
      if (Array.isArray(parsed)) {
        importCodes(parsed);
        setImportJson('');
        setShowImport(false);
      } else {
        alert('Ungültiges JSON-Format: Muss ein Array sein.');
      }
    } catch (e) {
      alert('Ungültiges JSON: ' + e.message);
    }
  };

  const handleResetToDemo = () => {
    resetToDemo();
    setShowDemoWarning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-emerald-500 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListChecks size={24} className="text-white" />
            <h3 className="font-bold text-lg">Tätigkeiten verwalten</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-emerald-600 rounded-full transition-colors"
            aria-label="Schließen"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
              <p className="mt-2 text-zinc-500">Lade Tätigkeiten...</p>
            </div>
          ) : (
            <>
              {/* Neue Tätigkeit */}
              <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                <h4 className="font-medium mb-3">Neue Tätigkeit hinzufügen</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Code (z.B. DEV)"
                    className="w-full p-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
                  />
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Beschreibung (z.B. Softwareentwicklung)"
                    className="w-full p-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    onClick={handleAdd}
                    disabled={!newCode.trim()}
                    className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Hinzufügen
                  </button>
                </div>
              </div>

              {/* Liste */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">
                  Vorhandene Tätigkeiten ({workCodes.length})
                </h4>
                <AnimatePresence>
                  {workCodes.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-8 text-zinc-500"
                    >
                      <ListChecks size={48} className="mx-auto mb-3 text-zinc-300" />
                      <p>Noch keine Tätigkeiten angelegt.</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-2">
                      {workCodes.map((code) => (
                        <motion.div
                          key={code.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={ANIMATION.FAST}
                          className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                        >
                          {editingId === code.id ? (
                            <div className="space-y-3">
                              <input
                                type="text"
                                value={editCode}
                                onChange={(e) => setEditCode(e.target.value)}
                                className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500"
                              />
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveEdit}
                                  className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Check size={16} />
                                  Speichern
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                                >
                                  Abbrechen
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-bold text-lg">{code.code}</div>
                                <div className="text-sm text-zinc-500">{code.description}</div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleStartEdit(code)}
                                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                  aria-label="Bearbeiten"
                                >
                                  <Pencil size={16} className="text-zinc-500" />
                                </button>
                                <button
                                  onClick={() => handleDelete(code.id)}
                                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                  aria-label="Löschen"
                                >
                                  <Trash2 size={16} className="text-red-500" />
                                </button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Import/Export */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowImport(!showImport)}
                  className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-between"
                >
                  <span>Import / Export</span>
                  <ChevronDown size={18} className={`transition-transform ${showImport ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showImport && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl space-y-3">
                        <div>
                          <div className="font-medium mb-2">Export</div>
                          <button
                            onClick={exportCodes}
                            className="w-full py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <Download size={16} />
                            Als JSON exportieren
                          </button>
                        </div>

                        <div>
                          <div className="font-medium mb-2">Import</div>
                          <textarea
                            value={importJson}
                            onChange={(e) => setImportJson(e.target.value)}
                            placeholder='[{"code": "DEV", "description": "Softwareentwicklung"}, ...]'
                            className="w-full p-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors font-mono text-sm h-32"
                          />
                          <button
                            onClick={handleImport}
                            disabled={!importJson.trim()}
                            className="w-full mt-2 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Importieren
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Demo-Daten */}
                <button
                  onClick={() => setShowDemoWarning(true)}
                  className="w-full p-3 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-200 dark:hover:bg-amber-900/30 transition-colors"
                >
                  Demo-Daten laden
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
          >
            Schließen
          </button>
        </div>

        {/* Warnungs-Modals */}
        <AnimatePresence>
          {showDeleteWarning !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[101]"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-zinc-800 rounded-2xl p-5 max-w-sm w-full"
              >
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle size={24} className="text-red-500" />
                  <h4 className="font-bold text-lg">Tätigkeit löschen?</h4>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 mb-6">
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle Einträge mit dieser Tätigkeit bleiben erhalten, zeigen aber einen leeren Code.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteWarning(null)}
                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    Löschen
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showDemoWarning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[101]"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-zinc-800 rounded-2xl p-5 max-w-sm w-full"
              >
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle size={24} className="text-amber-500" />
                  <h4 className="font-bold text-lg">Demo-Daten laden?</h4>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 mb-6">
                  Dies ersetzt alle vorhandenen Tätigkeiten durch Demo-Daten. Ihre Einträge bleiben erhalten.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDemoWarning(false)}
                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleResetToDemo}
                    className="flex-1 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
                  >
                    Demo laden
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};