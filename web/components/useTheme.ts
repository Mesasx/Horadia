"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";
const KEY = "horadia.theme";

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>("system");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY) as ThemeChoice | null;
      if (stored) {
        setThemeState(stored);
        apply(stored);
      }
    } catch {
      /* no-op */
    }
  }, []);

  const setTheme = useCallback((choice: ThemeChoice) => {
    setThemeState(choice);
    apply(choice);
    try {
      localStorage.setItem(KEY, choice);
    } catch {
      /* no-op */
    }
  }, []);

  return { theme, setTheme };
}
