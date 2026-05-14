import { registerPlugin } from "@capacitor/core";

export interface Material3DatePickerOptions {
  /** Current value in YYYY-MM-DD format. */
  value: string;
  mode?: "date" | "month";
  title?: string;
  confirmText?: string;
  dismissText?: string;
}

export interface Material3DatePickerResult {
  value?: string;
  year?: number;
  month?: number;
  day?: number;
  cancelled?: boolean;
}

export interface Material3DatePickerPlugin {
  pickDate(options: Material3DatePickerOptions): Promise<Material3DatePickerResult>;
  pickMonth(options: Material3DatePickerOptions): Promise<Material3DatePickerResult>;
}

export const Material3DatePicker = registerPlugin<Material3DatePickerPlugin>("Material3DatePicker");
