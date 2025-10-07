import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  cycleTheme: () => {},
  themes: ["light"],
});

const THEME_STORAGE_KEY = "srbuj-theme";
const DEFAULT_THEME = "light";

const applyThemeToDocument = () => {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = DEFAULT_THEME;
    document.body.dataset.theme = DEFAULT_THEME;
  }
};

const ensureLightTheme = () => {
  applyThemeToDocument();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME);
  }
};

export function ThemeProvider({ children }) {
  useEffect(() => {
    ensureLightTheme();
  }, []);

  const setTheme = useCallback(() => {
    ensureLightTheme();
  }, []);

  const cycleTheme = useCallback(() => {
    ensureLightTheme();
  }, []);

  const value = useMemo(
    () => ({ theme: DEFAULT_THEME, setTheme, cycleTheme, themes: [DEFAULT_THEME] }),
    [setTheme, cycleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
