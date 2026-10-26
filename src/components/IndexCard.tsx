import { Link } from "react-router-dom";
import type { IndexSummary } from "../lib/types";
import {
  classNames,
  formatCoverage,
  formatDate,
  formatLevel,
  formatPct,
  pctClass,
  pctTone,
} from "../lib/format";
import Delta from "./Delta";
import Sparkline from "./Sparkline";

function SmallMetric({
  label,
  value,
  simulated,
}: {
  label: string;
  value: number | null;
  simulated?: boolean;
}) {
  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-1">
        <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-dim">
          {label}
        </span>
        {simulated && <span className="sim-badge">sim</span>}
      </div>
      <div className={classNames("mt-0.5 font-mono text-[11px] tabular", pctClass(value))}>
        {formatPct(value, 2)}
      </div>
    </div>
  );
}

export default function IndexCard({ index }: { index: IndexSummary }) {
  const since = index.latest.total.sincePct;
  const sinceTone = pctTone(since);
  const sparkTone =
    index.spark.length > 1
      ? pctTone(index.spark[index.spark.length - 1] - index.spark[0])
      : "flat";
  const oneYearSim = index.liveDays < 252;
  const coverageIsFull = index.coveragePct >= 0.999;
  const statusLabel = index.status === "base" ? "BASE" : `LIVE ${index.liveDays}D`;

  return (
    <Link
      to={`/index/${index.slug}`}
      title={index.note}
      className="group panel relative block overflow-hidden p-4 transition-colors hover:border-amber"
      style={{ borderTopColor: index.color, borderTopWidth: 2 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="kicker kicker-amber">
              #{String(index.order).padStart(2, "0")}
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim">
              {statusLabel}
            </span>
            {index.missingCount > 0 && (
              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-down">
                {index.missingCount} missing
              </span>
            )}
          </div>
          <h3 className="mt-1 truncate font-mono text-[15px] font-medium tracking-[-0.02em] text-ink group-hover:text-amber">
            {index.name}
          </h3>
        </div>
        <div className="shrink-0 text-right">
          <div className="kicker">Since inception</div>
          <div
            className={classNames(
              "mt-1 font-mono text-[24px] font-medium leading-none tracking-[-0.05em] tabular",
              sinceTone === "up"
                ? "text-up"
                : sinceTone === "down"
                  ? "text-down"
                  : "text-ink",
            )}
          >
            {formatPct(since, 2)}
          </div>
          <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.08em] text-dim">
            Base {formatDate(index.baseDate, "short")}
          </div>
        </div>
      </div>

      <p className="note-clamp mt-2 min-h-[28px] text-[11px] leading-relaxed text-muted">
        {index.note || "No note set."}
      </p>

      <div className="mt-3 flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <Sparkline
            values={index.spark}
            tone={sparkTone}
            className="h-10 w-full"
            height={36}
          />
          <div className="mt-1 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.08em] text-dim">
            <span>60 sessions</span>
            <span>{formatLevel(index.latest.total.level)}</span>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-3">
          <SmallMetric label="1D" value={index.latest.total.dayPct} />
          <SmallMetric
            label="YTD"
            value={index.latest.total.ytdPct}
            simulated={index.latest.total.simulatedYtd}
          />
          <SmallMetric
            label="1Y"
            value={index.latest.total.oneYearPct}
            simulated={oneYearSim}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-2 font-mono text-[8px] uppercase tracking-[0.08em]">
        <span className={coverageIsFull ? "text-muted" : "text-amber"}>
          {formatCoverage(index.pricedCount, index.constituentCount)} priced
        </span>
        <span className="text-dim">{index.benchmark} benchmark</span>
        <span className="text-amber opacity-0 transition-opacity group-hover:opacity-100">
          Open →
        </span>
      </div>
    </Link>
  );
}
