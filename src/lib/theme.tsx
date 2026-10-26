import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ResolvedTheme, ThemeChoice } from "./types";

type ThemeContextValue = {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
  setChoice: (choice: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "si-theme";

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readChoice(): ThemeChoice {
  try {
    const forced = new URLSearchParams(window.location.search).get("theme");
    if (forced === "terminal" || forced === "paper") return forced;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "terminal" || stored === "paper" || stored === "system") {
      return stored;
    }
  } catch {
    // Ignore storage failures.
  }
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches);
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
    } else {
      media.addListener(handleChange);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", handleChange);
      } else {
        media.removeListener(handleChange);
      }
    };
  }, []);

  const resolved: ResolvedTheme =
    choice === "system" ? (systemDark ? "terminal" : "paper") : choice;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme =
      resolved === "terminal" ? "dark" : "light";
  }, [resolved]);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const value = useMemo(
    () => ({ choice, resolved, setChoice }),
    [choice, resolved, setChoice],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}

export function useChartColors() {
  const { resolved } = useTheme();
  return useMemo(
    () =>
      resolved === "terminal"
        ? {
            grid: "#1a1e22",
            axis: "#6f7882",
            tooltipBg: "#0b0d0f",
            tooltipBorder: "#3a4148",
            benchmark: "#6f93b8",
            amber: "#ffb000",
            up: "#21d07a",
            down: "#ff5b5b",
            muted: "#8b949e",
            text: "#e8e6e3",
            panel: "#0d0f11",
            line: "#20252a",
          }
        : {
            grid: "#e3dbcb",
            axis: "#7a7264",
            tooltipBg: "#fffdf7",
            tooltipBorder: "#c9bfab",
            benchmark: "#3b6d8f",
            amber: "#a35f00",
            up: "#087f4a",
            down: "#b42318",
            muted: "#6e675b",
            text: "#171512",
            panel: "#fbf8f0",
            line: "#d8d0bf",
          },
    [resolved],
  );
}

export function indexColorForTheme(color: string, theme: ResolvedTheme) {
  if (theme === "terminal") return color;
  const map: Record<string, string> = {
    "#ffb000": "#a35f00",
    "#2dd4bf": "#087f8f",
    "#c084fc": "#7c3aed",
    "#34d399": "#047857",
    "#60a5fa": "#2563a8",
    "#fb923c": "#b45309",
    "#f472b6": "#9d2f6b",
    "#facc15": "#8a6d00",
    "#a3e635": "#4d7c0f",
    "#38bdf8": "#0369a1",
    "#e5e7eb": "#4b5563",
    "#93c5fd": "#2563a8",
    "#fca5a5": "#b42318",
    "#86efac": "#047857",
    "#fde68a": "#8a6d00",
  };
  return map[color.toLowerCase()] ?? color;
}
