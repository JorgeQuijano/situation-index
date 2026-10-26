import { Monitor, SquareTerminal, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";
import type { ThemeChoice } from "../lib/types";
import { classNames } from "../lib/format";

const OPTIONS: Array<{
  value: ThemeChoice;
  label: string;
  icon: typeof Monitor;
}> = [
  { value: "system", label: "System", icon: Monitor },
  { value: "terminal", label: "Terminal", icon: SquareTerminal },
  { value: "paper", label: "Paper", icon: Sun },
];

export default function ThemeSelector() {
  const { choice, setChoice } = useTheme();

  return (
    <div
      className="flex items-center gap-0.5 border border-line bg-panel p-0.5"
      role="group"
      aria-label="Color theme"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = choice === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={`${option.label} theme`}
            aria-pressed={active}
            title={`${option.label} theme`}
            onClick={() => setChoice(option.value)}
            className={classNames(
              "flex h-6 items-center gap-1.5 px-1 font-mono text-[9px] uppercase tracking-[0.08em] transition-colors sm:px-1.5",
              active
                ? "bg-amber-soft text-amber"
                : "text-muted hover:bg-panel-2 hover:text-ink",
            )}
          >
            <Icon size={12} strokeWidth={1.8} />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
