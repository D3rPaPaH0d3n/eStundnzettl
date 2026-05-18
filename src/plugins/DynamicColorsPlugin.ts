import { registerPlugin } from "@capacitor/core";

export interface DynamicColorPalette {
  supported: boolean;
  accentLight?: string;
  accentDark?: string;
  accentContainerLight?: string;
  accentContainerDark?: string;
}

export interface DynamicColorsPlugin {
  getPalette(): Promise<DynamicColorPalette>;
}

export const DynamicColors = registerPlugin<DynamicColorsPlugin>("DynamicColors");
