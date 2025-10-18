import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  cycleTheme: () => {},
  themes: ["light", "dark"],
});

const THEME_STORAGE_KEY = "srbuj-theme";
const DEFAULT_THEME = "light";
const THEMES = [DEFAULT_THEME, "dark"];

const applyThemeToDocument = (theme) => {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }
};

const readStoredTheme = () => {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (THEMES.includes(stored)) return stored;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : DEFAULT_THEME;
  } catch (error) {
    console.warn("No se pudo leer el tema almacenado", error);
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : DEFAULT_THEME;
  }
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch (error) {
        console.warn("No se pudo guardar el tema seleccionado", error);
      }
    }
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => (prev === DEFAULT_THEME ? "dark" : DEFAULT_THEME));
  }, []);

  const setTheme = useCallback((nextTheme) => {
    if (THEMES.includes(nextTheme)) {
      setThemeState(nextTheme);
    }
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, cycleTheme, themes: THEMES }),
    [theme, setTheme, cycleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
