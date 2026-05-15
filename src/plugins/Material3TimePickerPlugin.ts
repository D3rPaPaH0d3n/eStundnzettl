import { registerPlugin } from "@capacitor/core";

export interface Material3TimePickerOptions {
  /** Current value in HH:mm format. */
  value: string;
  title?: string;
  confirmText?: string;
  dismissText?: string;
  is24Hour?: boolean;
  accent?: "green" | "orange";
  themeMode?: "light" | "dark" | "system";
}

export interface Material3TimePickerResult {
  value?: string;
  hour?: number;
  minute?: number;
  cancelled?: boolean;
}

export interface Material3TimePickerPlugin {
  pickTime(options: Material3TimePickerOptions): Promise<Material3TimePickerResult>;
}

export const Material3TimePicker = registerPlugin<Material3TimePickerPlugin>("Material3TimePicker");
