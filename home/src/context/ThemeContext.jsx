import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  cycleTheme: () => {},
  themes: ["light", "dark", "black"],
});

const THEME_STORAGE_KEY = "srbuj-theme";
const THEME_SEQUENCE = ["light", "dark", "black"];

const applyThemeToDocument = (mode) => {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = mode;
    document.body.dataset.theme = mode;
  }
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && THEME_SEQUENCE.includes(stored)) {
      return stored;
    }
    return "light";
  });

  useEffect(() => {
    applyThemeToDocument(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  const setTheme = (mode) => {
    if (!THEME_SEQUENCE.includes(mode)) return;
    setThemeState(mode);
  };

  const cycleTheme = () => {
    const currentIndex = THEME_SEQUENCE.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_SEQUENCE.length;
    setThemeState(THEME_SEQUENCE[nextIndex]);
  };

  useEffect(() => {
    applyThemeToDocument(theme);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, cycleTheme, themes: THEME_SEQUENCE }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
