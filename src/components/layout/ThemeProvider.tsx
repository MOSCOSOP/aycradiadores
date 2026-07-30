"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ThemeContextValue = {
  dark: boolean;
  locked: boolean;
  toggleDark: () => void;
  toggleLock: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  dark: false,
  locked: false,
  toggleDark: () => {},
  toggleLock: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedDark = localStorage.getItem("ify-theme") === "dark";
    const savedLock = localStorage.getItem("ify-nav-locked") === "1";
    setDark(savedDark);
    setLocked(savedLock);
    document.documentElement.classList.toggle("ify-dark", savedDark);
    document.documentElement.classList.toggle("ify-nav-locked", savedLock);
    setReady(true);
  }, []);

  const toggleDark = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem("ify-theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("ify-dark", next);
      return next;
    });
  }, []);

  const toggleLock = useCallback(() => {
    setLocked((prev) => {
      const next = !prev;
      localStorage.setItem("ify-nav-locked", next ? "1" : "0");
      document.documentElement.classList.toggle("ify-nav-locked", next);
      return next;
    });
  }, []);

  if (!ready) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ dark, locked, toggleDark, toggleLock }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
