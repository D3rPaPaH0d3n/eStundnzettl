import { getIntlLocale } from "../../utils/formatLocale";

/**
 * useEntryFormDateLabels — reine Ableitung der Datums-Labels aus `formDate`.
 *
 * Kapselt die `Intl.DateTimeFormat`-Berechnungen für das Entry-Formular:
 * - `formattedFormDate` — Kurzform (Wochentag, Datum) für das Datumsfeld.
 * - `dateHeaderTitle` — großgeschriebener langer Wochentag für den Header.
 * - `dateHeaderSubtitle` — Tag/Monat/Jahr für die Header-Unterzeile.
 *
 * Hält keinen State; die Logik ist verbatim aus EntryForm übernommen.
 *
 * @param formDate — Datum im Format `YYYY-MM-DD`
 */
export function useEntryFormDateLabels(formDate: string) {
  const date = new Date(`${formDate}T00:00:00`);
  const formattedFormDate = new Intl.DateTimeFormat(getIntlLocale(), {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const dateHeaderWeekday = new Intl.DateTimeFormat(getIntlLocale(), {
    weekday: "long",
  }).format(date);
  const dateHeaderTitle = dateHeaderWeekday.charAt(0).toUpperCase() + dateHeaderWeekday.slice(1);
  const dateHeaderSubtitle = new Intl.DateTimeFormat(getIntlLocale(), {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

  return { formattedFormDate, dateHeaderTitle, dateHeaderSubtitle };
}
