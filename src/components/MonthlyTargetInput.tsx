import React from "react";
import { useTranslation } from "react-i18next";

interface Props {
  idPrefix: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
}

const minuteOptions = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));

const MonthlyTargetInput: React.FC<Props> = ({
  idPrefix,
  value,
  onChange,
  onBlur,
  invalid = false,
  describedBy,
}) => {
  const { t } = useTranslation();
  const [hours = "", minutes = "00"] = value.split(":");

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
      <div>
        <label htmlFor={`${idPrefix}-hours`} className="block text-xs font-medium text-zinc-500 mb-1">
          {t("common.hours")}
        </label>
        <input
          id={`${idPrefix}-hours`}
          type="number"
          inputMode="numeric"
          min="0"
          max="744"
          value={hours}
          onChange={(event) => onChange(`${event.target.value}:${minutes}`)}
          onBlur={onBlur}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="w-full p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none font-bold text-zinc-900 dark:text-white"
        />
      </div>
      <span className="pb-3 font-bold text-zinc-500" aria-hidden="true">:</span>
      <div>
        <label htmlFor={`${idPrefix}-minutes`} className="block text-xs font-medium text-zinc-500 mb-1">
          {t("common.minutes")}
        </label>
        <select
          id={`${idPrefix}-minutes`}
          value={minutes}
          onChange={(event) => onChange(`${hours}:${event.target.value}`)}
          onBlur={onBlur}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="w-full p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 focus:border-emerald-500 outline-none font-bold text-zinc-900 dark:text-white"
        >
          {minuteOptions.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
        </select>
      </div>
    </div>
  );
};

export default MonthlyTargetInput;
