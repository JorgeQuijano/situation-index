import type { ReactNode } from "react";
import { classNames } from "../lib/format";

export default function Stat({
  label,
  value,
  sub,
  tone,
  simulated,
  title,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "up" | "down" | "flat";
  simulated?: boolean;
  title?: string;
  className?: string;
}) {
  const toneClass =
    tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-ink";
  return (
    <div className={classNames("min-w-0", className)} title={title}>
      <div className="flex items-center gap-1.5">
        <span className="kicker truncate">{label}</span>
        {simulated && <span className="sim-badge">sim</span>}
      </div>
      <div
        className={classNames(
          "mt-1.5 truncate font-mono text-[17px] font-medium leading-none tracking-[-0.03em] tabular sm:text-[19px]",
          toneClass,
        )}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.05em] text-dim">
          {sub}
        </div>
      )}
    </div>
  );
}
