import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useIndexDetails, useManifest } from "../lib/api";
import {
  RANGE_OPTIONS,
  buildCompareData,
  periodReturn,
  rangeLabel,
  type RangeKey,
} from "../lib/chart";
import {
  classNames,
  formatCoverage,
  formatDate,
  formatPct,
  pctClass,
} from "../lib/format";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { ErrorPanel, LoadingPanel } from "../components/AsyncState";
import { CompareChart } from "../components/charts";

function rangeReturnFor(
  data: Array<Record<string, number | string | null>>,
  slug: string,
) {
  const values = data
    .map((row) => row[slug])
    .filter((value): value is number => typeof value === "number");
  if (values.length < 2) return null;
  return values[values.length - 1] / values[0] - 1;
}

export default function Compare() {
  useDocumentTitle("Compare");
  const { manifest, loading: manifestLoading, error: manifestError, reload } =
    useManifest();
  const slugs = manifest?.indexes.map((index) => index.slug) ?? null;
  const { details, loading: detailsLoading, error: detailsError } =
    useIndexDetails(slugs);
  const [selected, setSelected] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [range, setRange] = useState<RangeKey>("6M");
  const [normalization, setNormalization] = useState<"range" | "inception">(
    "range",
  );

  useEffect(() => {
    if (!initialized && manifest?.indexes.length) {
      setSelected(manifest.indexes.map((index) => index.slug));
      setInitialized(true);
    }
  }, [manifest, initialized]);

  const allDetails = useMemo(() => Object.values(details), [details]);
  const bundle = useMemo(
    () => buildCompareData(allDetails, selected, range, normalization),
    [allDetails, selected, range, normalization],
  );

  const loading = manifestLoading || detailsLoading;
  const error = manifestError || detailsError;

  const toggle = (slug: string) => {
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingPanel className="h-28" />
        <LoadingPanel className="h-20" />
        <LoadingPanel className="h-[460px]" />
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <ErrorPanel
        message={error ?? "The comparison data could not be loaded."}
        onRetry={reload}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted hover:text-amber"
        >
          <ArrowLeft size={11} />
          Index board
        </Link>
      </div>

      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="kicker kicker-amber">Cross-index view</div>
          <h1 className="display mt-2 text-[34px] leading-none text-ink sm:text-[46px]">
            COMPARE
          </h1>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
            Overlay the baskets against each other. Rebase at the range start
            for a clean relative performance view, or keep each index at its own
            inception base of 100.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
          <span>{selected.length} selected</span>
          <span>Data {formatDate(manifest.asOf, "short")}</span>
          <span>{rangeLabel(range)}</span>
        </div>
      </header>

      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="segmented">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRange(option.key)}
                  className="range-button"
                  data-active={range === option.key}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="segmented">
              <button
                type="button"
                onClick={() => setNormalization("range")}
                className="range-button"
                data-active={normalization === "range"}
              >
                Range start
              </button>
              <button
                type="button"
                onClick={() => setNormalization("inception")}
                className="range-button"
                data-active={normalization === "inception"}
              >
                Inception
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(manifest.indexes.map((index) => index.slug))}
              className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted hover:text-amber"
            >
              All
            </button>
            <span className="text-dim">/</span>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted hover:text-amber"
            >
              None
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-line px-3 py-3 sm:px-4">
          {manifest.indexes.map((index) => (
            <button
              key={index.slug}
              type="button"
              onClick={() => toggle(index.slug)}
              className="chip"
              data-active={selected.includes(index.slug)}
              aria-pressed={selected.includes(index.slug)}
            >
              <span
                className="inline-block h-1.5 w-1.5"
                style={{ background: index.color }}
              />
              {index.name}
            </button>
          ))}
        </div>

        <div className="px-2 pb-2 pt-5 sm:px-3">
          <CompareChart
            bundle={bundle}
            showYear={range === "MAX" || range === "1Y"}
          />
        </div>
        <div className="border-t border-line px-3 py-2 font-mono text-[8px] uppercase tracking-[0.06em] text-dim sm:px-4">
          {normalization === "range"
            ? "Each line is rebased to 100 at its first available observation in the selected range."
            : "Each line uses the index level; 100 is the index's own inception base. Backfilled history before inception is simulated."}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-3 py-2.5 sm:px-4">
          <span className="kicker kicker-amber">Comparison table</span>
          <Link
            to="/methodology"
            className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.08em] text-muted hover:text-amber"
          >
            Method
            <ArrowUpRight size={10} />
          </Link>
        </div>
        <div className="table-wrap">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>Index</th>
                <th>{rangeLabel(range)} return</th>
                <th>Since inception</th>
                <th>Max DD</th>
                <th>Ann. vol</th>
                <th>Coverage</th>
                <th>Live</th>
              </tr>
            </thead>
            <tbody>
              {selected.map((slug) => {
                const detail = details[slug];
                if (!detail) return null;
                const rangeReturn = rangeReturnFor(bundle.data, slug);
                const since = periodReturn(detail, "total", "SI").value;
                const dd =
                  detail.stats.maxDrawdownSinceInception ??
                  detail.stats.maxDrawdown;
                return (
                  <tr key={slug}>
                    <td>
                      <Link
                        to={`/index/${slug}`}
                        className="flex items-center gap-2 hover:text-amber"
                      >
                        <span
                          className="inline-block h-1.5 w-1.5"
                          style={{ background: detail.color }}
                        />
                        <span className="font-medium text-ink">{detail.name}</span>
                      </Link>
                    </td>
                    <td className={classNames("tabular", pctClass(rangeReturn))}>
                      {formatPct(rangeReturn, 2)}
                    </td>
                    <td className={classNames("tabular", pctClass(since))}>
                      {formatPct(since, 2)}
                    </td>
                    <td className="text-down">{formatPct(dd, 2)}</td>
                    <td>{formatPct(detail.stats.volatility, 2, false)}</td>
                    <td>{formatCoverage(detail.meta.pricedCount, detail.meta.constituentCount)}</td>
                    <td>{detail.meta.liveDays}d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {selected.length === 0 && (
          <div className="px-4 py-8 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            Select at least one basket to compare.
          </div>
        )}
        <div className="border-t border-line px-3 py-2 font-mono text-[8px] uppercase tracking-[0.06em] text-dim sm:px-4">
          Total return · equal weight · USD. Max DD uses live history when
          available, otherwise the backfilled series.
        </div>
      </section>
    </div>
  );
}
