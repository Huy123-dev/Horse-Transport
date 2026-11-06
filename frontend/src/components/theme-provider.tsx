"use client";

import { createContext, useContext, useEffect, useCallback } from "react";

type Theme = "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * EQUIDELI Design System — Enforced Dark Mode Only
 * Luxury Equestrian / Thoroughbred Racing Theme
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("equideli-theme", "dark");
    }
  }, []);

  // Safe no-ops that guarantee Dark Mode is maintained permanently
  const toggleTheme = useCallback(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("equideli-theme", "dark");
    }
  }, []);

  const setTheme = useCallback((_t: Theme) => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("equideli-theme", "dark");
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "dark", toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
