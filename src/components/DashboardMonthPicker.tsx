import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { de, enUS } from "date-fns/locale";
import { getDatePickerLocale } from "../utils/formatLocale";

registerLocale("de", de);
registerLocale("en", enUS);

interface Props {
  selectedDate: Date;
  onSelectMonth: (date: Date) => void;
  onClose: () => void;
}

export default function DashboardMonthPicker({ selectedDate, onSelectMonth, onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/45" onClick={onClose}>
      <div
        className="rounded-2xl bg-white dark:bg-zinc-900 p-3 shadow-2xl border border-zinc-200 dark:border-zinc-700"
        onClick={(event) => event.stopPropagation()}
      >
        <DatePicker
          selected={selectedDate}
          onChange={(date: Date | null) => {
            if (!date) return;
            const next = new Date(date);
            next.setDate(1);
            onSelectMonth(next);
            onClose();
          }}
          dateFormat="MMMM yyyy"
          showMonthYearPicker
          locale={getDatePickerLocale()}
          inline
          ariaLabelledBy="dashboard-month-picker-title"
        />
        <button
          id="dashboard-month-picker-title"
          type="button"
          className="sr-only"
          onClick={onClose}
        >
          {t("dashboard.monthPickerAria", { value: selectedDate.toLocaleDateString() })}
        </button>
      </div>
    </div>
  );
}
