import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Material3DatePicker } from "../plugins/Material3DatePickerPlugin";

interface Props {
  selectedDate: Date;
  onSelectMonth: (date: Date) => void;
  onClose: () => void;
}

export default function DashboardMonthPicker({ selectedDate, onSelectMonth, onClose }: Props) {
  const { t } = useTranslation();
  const initialValue = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}`;
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackValue, setFallbackValue] = useState(initialValue);

  useEffect(() => {
    let cancelled = false;
    const value = `${initialValue}-01`;

    Material3DatePicker.pickMonth({
      value,
      title: t("dashboard.monthPickerAria", { value: selectedDate.toLocaleDateString() }),
      confirmText: "OK",
      dismissText: "Abbrechen",
    })
      .then((result) => {
        if (cancelled) return;
        if (!result.cancelled && result.value) {
          const next = new Date(`${result.value}T00:00:00`);
          next.setDate(1);
          onSelectMonth(next);
        }
        onClose();
      })
      .catch(() => {
        if (cancelled) return;
        setFallbackOpen(true);
        toast.error(t("dashboard.monthPickerFallback", { defaultValue: "Monatsauswahl konnte nicht geöffnet werden." }));
      });

    return () => {
      cancelled = true;
    };
  }, [initialValue, onClose, onSelectMonth, selectedDate, t]);

  const applyFallback = () => {
    if (!/^\d{4}-\d{2}$/.test(fallbackValue)) return;
    const next = new Date(`${fallbackValue}-01T00:00:00`);
    next.setDate(1);
    onSelectMonth(next);
    onClose();
  };

  if (!fallbackOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-800">
        <label className="mb-2 block text-sm font-bold text-zinc-700 dark:text-zinc-200">
          {t("dashboard.monthPickerAria", { value: selectedDate.toLocaleDateString() })}
        </label>
        <input
          type="month"
          value={fallbackValue}
          onChange={(event) => setFallbackValue(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white p-3 font-bold text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-300">
            {t("common.cancel")}
          </button>
          <button type="button" onClick={applyFallback} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
            {t("common.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
