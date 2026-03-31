import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Image as ImageIcon, Paperclip, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card } from "../utils";

const getIcon = (mimeType) => {
  if (mimeType?.startsWith("image/")) return ImageIcon;
  return FileText;
};

const stopClick = (e) => e.stopPropagation();

const AttachmentManager = ({
  isOpen,
  onClose,
  entry,
  attachments = [],
  addAttachment,
  removeAttachment,
  getLabelSuggestions,
  formatFileSize,
}) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
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

  const handlePickFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!label.trim()) {
      const fileBaseName = file.name.replace(/\.[^.]+$/, "");
      setLabel(fileBaseName);
    }
  };

  const handleAdd = async () => {
    if (!entry?.id) {
      toast.error("Eintrag fehlt.");
      return;
    }

    if (!selectedFile) {
      toast.error("Bitte zuerst ein Dokument auswählen.");
      return;
    }

    if (!label.trim()) {
      toast.error("Bitte eine Bezeichnung eingeben.");
      return;
    }

    setIsSaving(true);
    try {
      await addAttachment({
        entryId: entry.id,
        file: selectedFile,
        label,
      });
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      toast.success("Dokument hinzugefügt");
      resetForm();
    } catch (error) {
      toast.error(error.message || "Dokument konnte nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (attachmentId) => {
    try {
      await removeAttachment(attachmentId);
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      toast.success("Dokument gelöscht");
    } catch {
      toast.error("Dokument konnte nicht gelöscht werden.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && entry && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="w-full sm:max-w-lg bg-zinc-50 dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
            onClick={stopClick}
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
              <div>
                <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-lg">
                  <Paperclip size={18} className="text-emerald-500" />
                  <span>Dokumente</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {new Date(entry.date).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                </p>
              </div>
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                <X size={20} className="text-zinc-500" />
              </button>
            </div>

            <div
              className="p-4 overflow-y-auto space-y-4 bg-zinc-50 dark:bg-zinc-900"
              style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            >
              <Card>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Dokument</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={handlePickFile}
                      className="mt-1 block w-full text-sm text-zinc-600 dark:text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-emerald-700"
                    />
                    {selectedFile && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                        {selectedFile.name} • {formatFileSize(selectedFile.size)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Bezeichnung</label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="z. B. Krankenstandsbestätigung"
                      className="mt-1 w-full p-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none dark:text-white focus:border-emerald-500 transition-colors"
                    />
                    {suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setLabel(suggestion)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={isSaving}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    {isSaving ? "Speichere..." : "Dokument hinzufügen"}
                  </button>
                </div>
              </Card>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase">Vorhandene Dokumente</h3>
                {attachments.length === 0 ? (
                  <Card>
                    <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
                      Noch keine Dokumente für diesen Eintrag vorhanden.
                    </div>
                  </Card>
                ) : (
                  attachments.map((attachment) => {
                    const Icon = getIcon(attachment.mimeType);
                    return (
                      <Card key={attachment.id}>
                        <div className="p-4 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                              <Icon size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-zinc-900 dark:text-white truncate">{attachment.label}</div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-1">{attachment.fileName}</div>
                              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">{formatFileSize(attachment.fileSize)}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDelete(attachment.id)}
                            className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
            <div
              className="shrink-0 bg-zinc-50 dark:bg-zinc-900 sm:hidden"
              style={{ height: "env(safe-area-inset-bottom)" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AttachmentManager;
