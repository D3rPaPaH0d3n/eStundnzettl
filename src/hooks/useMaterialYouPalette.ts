import { useEffect } from "react";
import { DynamicColors, type DynamicColorPalette } from "../plugins/DynamicColorsPlugin";
import type { SettingsStorageStatus } from "./useSettings";

const MATERIAL_YOU_CLASS = "material-you";
const MATERIAL_YOU_VARIABLES = [
  "--my-accent-light",
  "--my-accent-dark",
  "--my-accent-container-light",
  "--my-accent-container-dark",
] as const;

interface UseMaterialYouPaletteOptions {
  enabled: boolean;
  settingsStorageStatus: SettingsStorageStatus;
}

function clearMaterialYou(root: HTMLElement) {
  root.classList.remove(MATERIAL_YOU_CLASS);
  MATERIAL_YOU_VARIABLES.forEach((name) => root.style.removeProperty(name));
}

function applyMaterialYou(root: HTMLElement, palette: DynamicColorPalette) {
  const setColor = (name: (typeof MATERIAL_YOU_VARIABLES)[number], value?: string) => {
    if (value) root.style.setProperty(name, value);
  };

  setColor("--my-accent-light", palette.accentLight);
  setColor("--my-accent-dark", palette.accentDark);
  setColor("--my-accent-container-light", palette.accentContainerLight);
  setColor("--my-accent-container-dark", palette.accentContainerDark);
  root.classList.add(MATERIAL_YOU_CLASS);
}

export function useMaterialYouPalette({ enabled, settingsStorageStatus }: UseMaterialYouPaletteOptions) {
  useEffect(() => {
    let cancelled = false;
    const root = document.documentElement;

    if (settingsStorageStatus === "loading") {
      return;
    }

    if (!enabled) {
      clearMaterialYou(root);
      return;
    }

    DynamicColors.getPalette()
      .then((palette) => {
        if (cancelled) return;

        if (!palette.supported) {
          clearMaterialYou(root);
          return;
        }

        applyMaterialYou(root, palette);
      })
      .catch(() => {
        if (!cancelled) clearMaterialYou(root);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, settingsStorageStatus]);
}
