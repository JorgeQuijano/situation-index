import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { Constituent, IndexDetail, IndexSummary } from "../lib/types";
import {
  formatPrice,
  formatPct,
  pctClass,
} from "../lib/format";
import Delta from "./Delta";

function MoverRow({ row }: { row: Constituent }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_72px_62px] items-center gap-2 px-3 py-1.5">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-ink">{row.ticker}</span>
          {row.missing && <span className="text-[8px] text-down">NO DATA</span>}
        </div>
        <div className="truncate text-[8px] text-muted">{row.name}</div>
      </div>
      <div className="text-right font-mono text-[9px] tabular text-muted">
        {formatPrice(row.price, row.currency)}
      </div>
      <div className="text-right">
        <Delta value={row.dayPct} showArrow={false} className="text-[9px]" />
      </div>
    </div>
  );
}

export default function TopMovers({
  index,
  detail,
  loading,
}: {
  index: IndexSummary | null;
  detail: IndexDetail | null;
  loading: boolean;
}) {
  const rows = detail?.constituents.filter((row) => !row.missing) ?? [];
  const sorted = [...rows].sort(
    (a, b) => (b.dayPct ?? Number.NEGATIVE_INFINITY) - (a.dayPct ?? Number.NEGATIVE_INFINITY),
  );
  const leaders = sorted.slice(0, 3);
  const laggards = sorted.slice(-3).reverse();

  return (
    <section className="panel">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="kicker kicker-amber">Selected / movers</span>
          <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-dim">
            1D
          </span>
        </div>
        {index && (
          <Link
            to={`/index/${index.slug}`}
            className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.08em] text-muted hover:text-amber"
          >
            Open
            <ArrowUpRight size={9} />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_72px_62px] border-b border-line bg-panel-2 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
        <span>Mover</span>
        <span className="text-right">Last</span>
        <span className="text-right">1D</span>
      </div>

      {loading && (
        <div className="space-y-2 p-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="skeleton h-6 w-full" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="divide-y divide-line">
          {leaders.map((row) => (
            <MoverRow key={row.symbol} row={row} />
          ))}
          <div className="flex items-center justify-between bg-panel-2 px-3 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
            <span>Laggards</span>
            <span>{index?.name}</span>
          </div>
          {laggards.map((row) => (
            <MoverRow key={row.symbol} row={row} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line px-3 py-2 font-mono text-[8px] uppercase tracking-[0.06em] text-dim">
        <span>
          {detail
            ? `${detail.meta.pricedCount}/${detail.meta.constituentCount} priced`
            : "Loading basket"}
        </span>
        <span className={pctClass(index?.latest.total.dayPct)}>
          {formatPct(index?.latest.total.dayPct, 2)} index
        </span>
      </div>
    </section>
  );
}
