import React from "react";
import { Sun } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Card } from "../../utils";

import type { Theme } from "../../types";

interface Props {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeSettings: React.FC<Props> = ({ theme, setTheme }) => {
  const handleThemeChange = (newTheme: Theme) => {
    Haptics.impact({ style: ImpactStyle.Light });
    setTheme(newTheme);
  };

  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-bold text-zinc-700 dark:text-white flex items-center gap-2">
        <Sun size={18} className="text-emerald-400" />
        <span>Design / Theme</span>
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {["light", "dark", "system"].map((mode) => (
          <button
            key={mode}
            onClick={() => handleThemeChange(mode as Theme)}
            className={`py-2 px-2 rounded-xl text-sm font-bold border transition-colors capitalize 
              ${
                theme === mode
                  ? "border-emerald-500 bg-emerald-50 dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400"
                  : "border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
              }`}
          >
            {mode === "system"
              ? "System"
              : mode === "light"
              ? "Hell"
              : "Dunkel"}
          </button>
        ))}
      </div>
    </Card>
  );
};

export default ThemeSettings;
