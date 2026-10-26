import { Link } from "react-router-dom";
import { useManifest } from "../lib/api";
import { formatLevel, formatPct, pctClass } from "../lib/format";

export default function TickerTape() {
  const { manifest, loading } = useManifest();

  return (
    <div className="border-b border-line bg-panel-2">
      <div className="tape-scroll mx-auto flex max-w-[1600px] items-stretch overflow-x-auto">
        <div className="flex shrink-0 items-center gap-2 border-r border-line px-3 py-1.5 sm:px-5">
          <span className="live-dot" />
          <span className="kicker kicker-amber">Tape</span>
        </div>
        {loading &&
          [0, 1, 2].map((item) => (
            <div
              key={item}
              className="flex shrink-0 items-center gap-3 border-r border-line px-3 py-1.5"
            >
              <span className="skeleton block h-2.5 w-20" />
              <span className="skeleton block h-2.5 w-10" />
            </div>
          ))}
        {manifest?.indexes.map((index) => (
          <Link
            key={index.slug}
            to={`/index/${index.slug}`}
            title={index.note}
            className="group flex shrink-0 items-center gap-2.5 border-r border-line px-3 py-1.5 transition-colors hover:bg-amber-soft sm:px-4"
          >
            <span className="max-w-[130px] truncate font-mono text-[9px] uppercase tracking-[0.08em] text-muted group-hover:text-amber sm:max-w-none">
              {index.name}
            </span>
            <span className="font-mono text-[10px] tabular text-ink">
              {formatLevel(index.latest.total.level)}
            </span>
            <span
              className={`font-mono text-[9px] tabular ${pctClass(index.latest.total.dayPct)}`}
            >
              {formatPct(index.latest.total.dayPct, 2)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
