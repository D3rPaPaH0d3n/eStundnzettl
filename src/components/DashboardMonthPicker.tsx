import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Material3DatePicker } from "../plugins/Material3DatePickerPlugin";

interface Props {
  selectedDate: Date;
  onSelectMonth: (date: Date) => void;
  onClose: () => void;
}

export default function DashboardMonthPicker({ selectedDate, onSelectMonth, onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    const value = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-01`;

    Material3DatePicker.pickMonth({
      value,
      title: t("dashboard.monthPickerAria", { value: selectedDate.toLocaleDateString() }),
      confirmText: "OK",
      dismissText: "Abbrechen",
    })
      .then((result) => {
        if (cancelled || result.cancelled || !result.value) return;
        const next = new Date(`${result.value}T00:00:00`);
        next.setDate(1);
        onSelectMonth(next);
      })
      .finally(() => {
        if (!cancelled) onClose();
      });

    return () => {
      cancelled = true;
    };
  }, [onClose, onSelectMonth, selectedDate, t]);

  return null;
}
