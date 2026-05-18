import { registerPlugin } from "@capacitor/core";

export interface DynamicColorPalette {
  supported: boolean;
  surfaceLight?: string;
  surfaceContainerLight?: string;
  surfaceDark?: string;
  surfaceContainerDark?: string;
  outlineLight?: string;
  outlineDark?: string;
  accentContainerLight?: string;
  accentContainerDark?: string;
}

export interface DynamicColorsPlugin {
  getPalette(): Promise<DynamicColorPalette>;
}

export const DynamicColors = registerPlugin<DynamicColorsPlugin>("DynamicColors");
