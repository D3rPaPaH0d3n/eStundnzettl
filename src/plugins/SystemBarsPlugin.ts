import { registerPlugin } from "@capacitor/core";

export interface SystemBarsPlugin {
  setTheme(options: { dark: boolean }): Promise<{ dark: boolean }>;
}

export const SystemBars = registerPlugin<SystemBarsPlugin>("SystemBars");
