import React, { useMemo, useRef, useState, ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Image as ImageIcon, Paperclip, Plus, Trash2, X, LucideIcon } from "lucide-react";
import toast from "react-hot-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card } from "../utils";
import { TimeEntry } from "../types";

import type { Attachment as SharedAttachment } from "../types";
type Attachment = SharedAttachment;

interface AttachmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  entry: TimeEntry | { id: number }; // Accept partial entry
  attachments?: Attachment[];
  addAttachment: (entryId: number, file: File, label: string) => Promise<Attachment>;
  removeAttachment: (attachmentId: number) => Promise<void>;
  getLabelSuggestions: (input: string) => string[];
  formatFileSize: (bytes: number) => string;
}

const getIcon = (mimeType: string): LucideIcon => {
  if (mimeType?.startsWith("image/")) return ImageIcon;
  return FileText;
};

const stopClick = (e: React.MouseEvent) => e.stopPropagation();

const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  isOpen,
  onClose,
  entry,
  attachments = [],
  addAttachment,
  removeAttachment,
  getLabelSuggestions,
  formatFileSize,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const suggestions = useMemo(() => getLabelSuggestions(label), [getLabelSuggestions, label]);

  const resetForm = () => {
    setSelectedFile(null);
    setLabel("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!label.trim()) {
      const fileBaseName = file.name.replace(/\.[^.]+$/, "");
      setLabel(fileBaseName);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) {
      toast.error("Bitte wähle eine Datei aus");
      Haptics.impact({ style: ImpactStyle.Medium });
      return;
    }

    setIsSaving(true);
    try {
      await addAttachment(entry.id, selectedFile, label.trim() || selectedFile.name);
      toast.success("Anhang hinzugefügt");
      Haptics.impact({ style: ImpactStyle.Light });
      resetForm();
    } catch (error) {
      console.error("Failed to add attachment:", error);
      toast.error("Fehler beim Hinzufügen");
      Haptics.impact({ style: ImpactStyle.Medium });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (attachmentId: number) => {
    try {
      await removeAttachment(attachmentId);
      toast.success("Anhang entfernt");
      Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.error("Failed to remove attachment:", error);
      toast.error("Fehler beim Entfernen");
      Haptics.impact({ style: ImpactStyle.Medium });
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setLabel(suggestion);
    Haptics.impact({ style: ImpactStyle.Light });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={stopClick}
            className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                    <Paperclip size={22} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-zinc-800 dark:text-white">
                      Anhänge verwalten
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {'date' in entry ? new Date((entry as any).date).toLocaleDateString("de-DE") : 'Eintrag'} · {'startTime' in entry ? (entry as any).startTime : ''}–{'endTime' in entry ? (entry as any).endTime : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors"
                  aria-label="Schließen"
                >
                  <X size={20} className="text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Existing Attachments */}
              {attachments.length > 0 ? (
                <div className="space-y-3 mb-6">
                  <h3 className="font-medium text-zinc-700 dark:text-zinc-300">
                    Vorhandene Anhänge ({attachments.length})
                  </h3>
                  {attachments.map((attachment) => {
                    const Icon = getIcon(attachment.mimeType);
                    return (
                      <Card key={attachment.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg">
                              <Icon size={18} className="text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {attachment.filename}
                              </div>
                              <div className="text-sm text-zinc-500">
                                {formatFileSize(attachment.size)}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemove(parseInt(attachment.id))}
                            className="p-2 text-zinc-500 hover:text-red-600 transition-colors"
                            aria-label="Entfernen"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <Paperclip size={48} className="mx-auto mb-3 opacity-50" />
                  <p>Noch keine Anhänge für diesen Eintrag</p>
                </div>
              )}

              {/* Add New Attachment */}
              <div className="space-y-4">
                <h3 className="font-medium text-zinc-700 dark:text-zinc-300">
                  Neuen Anhang hinzufügen
                </h3>

                {/* File Picker */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePickFile}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl hover:border-emerald-500 transition-colors text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Plus size={24} className="text-zinc-400" />
                      <div>
                        <div className="font-medium">
                          {selectedFile ? selectedFile.name : "Datei auswählen"}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {selectedFile
                            ? `${formatFileSize(selectedFile.size)} · ${selectedFile.type}`
                            : "Bild, PDF, Dokument…"}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Label Input */}
                {selectedFile && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Beschreibung (optional)
                    </label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="z.B. Rechnung, Notiz, Screenshot…"
                      className="w-full p-3 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg outline-none focus:border-emerald-500 transition-colors"
                    />

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-700 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-zinc-100 dark:border-zinc-700">
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={!selectedFile || isSaving}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? "Wird gespeichert…" : "Hinzufügen"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AttachmentManager;