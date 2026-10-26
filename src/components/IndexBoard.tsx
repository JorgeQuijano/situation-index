import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { IndexSummary } from "../lib/types";
import {
  classNames,
  formatLevel,
  formatPct,
  pctClass,
} from "../lib/format";
import Delta from "./Delta";

export default function IndexBoard({
  indexes,
  selectedSlug,
  onSelect,
}: {
  indexes: IndexSummary[];
  selectedSlug?: string;
  onSelect?: (slug: string) => void;
}) {
  return (
    <section className="panel flex flex-col">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="kicker kicker-amber">Index board</span>
          <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-dim">
            {indexes.length} baskets
          </span>
        </div>
        <Link
          to="/compare"
          className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted hover:text-amber"
        >
          Compare
          <ArrowUpRight size={10} />
        </Link>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_64px_62px_62px] border-b border-line bg-panel-2 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
        <span>Index</span>
        <span className="text-right">Last</span>
        <span className="text-right">1D</span>
        <span className="text-right">SI</span>
      </div>

      <div className="max-h-[340px] divide-y divide-line overflow-y-auto">
        {indexes.map((index) => {
          const selected = selectedSlug === index.slug;
          const content = (
            <>
              <span className="min-w-0">
                <span className="block truncate font-mono text-[10px] font-medium text-ink">
                  {index.name}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.06em] text-dim">
                  <span
                    className="inline-block h-1.5 w-1.5"
                    style={{ background: index.color }}
                  />
                  {index.status === "base" ? "Base" : `Live ${index.liveDays}d`}
                  {index.missingCount > 0 && (
                    <span className="text-down">· {index.missingCount} missing</span>
                  )}
                </span>
              </span>
              <span className="text-right font-mono text-[10px] tabular text-ink">
                {formatLevel(index.latest.total.level)}
              </span>
              <span className="text-right font-mono text-[10px] tabular">
                <Delta value={index.latest.total.dayPct} showArrow={false} />
              </span>
              <span
                className={classNames(
                  "text-right font-mono text-[10px] tabular",
                  pctClass(index.latest.total.sincePct),
                )}
              >
                {formatPct(index.latest.total.sincePct, 2)}
              </span>
            </>
          );

          const className = classNames(
            "grid w-full grid-cols-[minmax(0,1fr)_64px_62px_62px] items-center gap-0 px-3 py-2.5 text-left transition-colors hover:bg-panel-2",
            selected && "border-l-2 border-amber bg-amber-soft pl-[10px]",
          );

          if (onSelect) {
            return (
              <button
                key={index.slug}
                type="button"
                onClick={() => onSelect(index.slug)}
                aria-pressed={selected}
                className={className}
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={index.slug} to={`/index/${index.slug}`} className={className}>
              {content}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-line px-3 py-2 font-mono text-[8px] uppercase tracking-[0.08em] text-dim">
        {indexes.length > 6
          ? `${indexes.length} baskets · scroll board to select`
          : "Selected basket drives the featured chart"}
      </div>
    </section>
  );
}
