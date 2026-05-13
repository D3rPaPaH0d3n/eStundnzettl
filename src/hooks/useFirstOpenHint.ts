import { useCallback, useState } from "react";

export function useFirstOpenHint(storageKey: string) {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== "true";
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // localStorage can be unavailable in private/restricted contexts.
    }
  }, [storageKey]);

  return { visible, dismiss };
}
