import { registerPlugin } from "@capacitor/core";

export interface InstallSourceResult {
  /** Package name that initiated the install, or null if unknown / sideloaded. */
  installer: string | null;
}

export interface InstallSourcePlugin {
  get(): Promise<InstallSourceResult>;
}

/**
 * InstallSource — reports which app store / installer placed this APK
 * on the device. Used by the GitHub-update check to skip Play Store
 * installs (auto-updates handle them) and run only on sideloads.
 */
export const InstallSource = registerPlugin<InstallSourcePlugin>("InstallSource");

/** Known package names that should NOT trigger the GitHub update check. */
export const STORE_INSTALLERS = new Set<string>([
  "com.android.vending", // Google Play Store
  "com.amazon.venezia", // Amazon Appstore
  "com.huawei.appmarket", // Huawei AppGallery
]);
