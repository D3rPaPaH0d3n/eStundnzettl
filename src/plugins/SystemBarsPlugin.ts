import { registerPlugin } from "@capacitor/core";

export interface SystemBarsPlugin {
  setTheme(options: {
    dark: boolean;
    statusBarDark?: boolean;
    navigationBarDark?: boolean;
  }): Promise<{
    dark: boolean;
    statusBarDark: boolean;
    navigationBarDark: boolean;
  }>;
}

export const SystemBars = registerPlugin<SystemBarsPlugin>("SystemBars");
