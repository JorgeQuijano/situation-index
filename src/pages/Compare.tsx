import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useBenchmarkFile, useIndexDetails, useManifest } from "../lib/api";
import {
  RANGE_OPTIONS,
  buildCompareData,
  periodReturn,
  rangeLabel,
  type CompareInput,
  type RangeKey,
} from "../lib/chart";
import {
  classNames,
  formatCoverage,
  formatDate,
  formatPct,
  pctClass,
} from "../lib/format";
import { indexColorForTheme, useTheme } from "../lib/theme";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { ErrorPanel, LoadingPanel } from "../components/AsyncState";
import { CompareChart } from "../components/charts";

function rangeReturnFor(
  data: Array<Record<string, number | string | null>>,
  id: string,
) {
  const values = data
    .map((row) => row[id])
    .filter((value): value is number => typeof value === "number");
  if (values.length < 2) return null;
  return values[values.length - 1] / values[0] - 1;
}

function seriesStats(values: number[]) {
  if (values.length < 2) {
    return { returnPct: null, maxDrawdown: null, volatility: null };
  }
  let peak = values[0];
  let maxDrawdown = 0;
  const returns: number[] = [];
  for (let i = 1; i < values.length; i += 1) {
    const value = values[i];
    returns.push(value / values[i - 1] - 1);
    peak = Math.max(peak, value);
    maxDrawdown = Math.min(maxDrawdown, value / peak - 1);
  }
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    Math.max(returns.length - 1, 1);
  return {
    returnPct: values[values.length - 1] / values[0] - 1,
    maxDrawdown,
    volatility: Math.sqrt(variance) * Math.sqrt(252),
  };
}

export default function Compare() {
  useDocumentTitle("Compare");
  const { resolved } = useTheme();
  const { manifest, loading: manifestLoading, error: manifestError } =
    useManifest();
  const slugs = manifest?.indexes.map((index) => index.slug) ?? null;
  const { details, loading: detailsLoading, error: detailsError } =
    useIndexDetails(slugs);
  const {
    data: benchmarkFile,
    loading: benchmarksLoading,
    error: benchmarksError,
  } = useBenchmarkFile();

  const [selected, setSelected] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<string[]>([]);
  const [benchmarksInitialized, setBenchmarksInitialized] = useState(false);
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

  useEffect(() => {
    if (!benchmarksInitialized && benchmarkFile) {
      const defaults = benchmarkFile.benchmarks
        .filter((benchmark) => ["SPY", "QQQ"].includes(benchmark.symbol))
        .map((benchmark) => benchmark.symbol);
      setSelectedBenchmarks(defaults);
      setBenchmarksInitialized(true);
    }
  }, [benchmarkFile, benchmarksInitialized]);

  const allDetails = useMemo(() => Object.values(details), [details]);
  const inputs = useMemo<CompareInput[]>(() => {
    const indexInputs: CompareInput[] = allDetails.map((detail) => ({
      id: detail.slug,
      name: detail.name,
      color: detail.color,
      dates: detail.dates,
      levels: detail.levels,
      coverageStart: detail.coverageStart,
      kind: "index",
    }));
    if (!benchmarkFile) return indexInputs;
    return [
      ...indexInputs,
      ...benchmarkFile.benchmarks.map((benchmark) => ({
        id: `bench:${benchmark.symbol}`,
        name: benchmark.name,
        color: benchmark.color,
        dates: benchmarkFile.dates,
        levels: benchmark.levels,
        coverageStart: benchmarkFile.dates[0],
        kind: "benchmark" as const,
        dashed: true,
      })),
    ];
  }, [allDetails, benchmarkFile]);

  const selectedIds = useMemo(
    () => [
      ...selected,
      ...selectedBenchmarks.map((symbol) => `bench:${symbol}`),
    ],
    [selected, selectedBenchmarks],
  );

  const bundle = useMemo(
    () =>
      buildCompareData(
        inputs,
        selectedIds,
        range,
        normalization,
        manifest?.asOf ?? "",
      ),
    [inputs, selectedIds, range, normalization, manifest?.asOf],
  );

  const loading = manifestLoading || detailsLoading || benchmarksLoading;
  const error = manifestError || detailsError || benchmarksError;

  const toggle = (slug: string) => {
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  };

  const toggleBenchmark = (symbol: string) => {
    setSelectedBenchmarks((current) =>
      current.includes(symbol)
        ? current.filter((item) => item !== symbol)
        : [...current, symbol],
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingPanel className="h-28" />
        <LoadingPanel className="h-24" />
        <LoadingPanel className="h-[460px]" />
      </div>
    );
  }

  if (error || !manifest || !benchmarkFile) {
    return (
      <ErrorPanel
        message={error ?? "The comparison data could not be loaded."}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const benchmarkRows =
    benchmarkFile?.benchmarks.filter((benchmark) =>
      selectedBenchmarks.includes(benchmark.symbol),
    ) ?? [];

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
            Overlay the baskets against each other and against major market
            proxies. Benchmarks are dashed so they stay distinct from the
            baskets. Rebase at the range start for a clean relative view, or
            keep each basket at its own inception base of 100.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
          <span>
            {selected.length} indexes · {selectedBenchmarks.length} benchmarks
          </span>
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
            <span className="kicker hidden sm:inline">Indexes</span>
            <button
              type="button"
              onClick={() =>
                setSelected(manifest.indexes.map((index) => index.slug))
              }
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

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
          <span className="kicker w-14 shrink-0">Baskets</span>
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

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
          <span className="kicker w-14 shrink-0">Benchmarks</span>
          {benchmarkFile.benchmarks.map((benchmark) => (
            <button
              key={benchmark.symbol}
              type="button"
              onClick={() => toggleBenchmark(benchmark.symbol)}
              className="chip"
              data-active={selectedBenchmarks.includes(benchmark.symbol)}
              aria-pressed={selectedBenchmarks.includes(benchmark.symbol)}
              title={`${benchmark.name} · ${benchmark.symbol} ETF proxy`}
            >
              <span
                className="inline-block h-0 w-3 border-t border-dashed"
                style={{
                  borderColor: indexColorForTheme(benchmark.color, resolved),
                }}
              />
              {benchmark.name}
              <span className="text-dim">{benchmark.symbol}</span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSelectedBenchmarks(
                  benchmarkFile.benchmarks.map((benchmark) => benchmark.symbol),
                )
              }
              className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted hover:text-amber"
            >
              All
            </button>
            <span className="text-dim">/</span>
            <button
              type="button"
              onClick={() => setSelectedBenchmarks([])}
              className="font-mono text-[8px] uppercase tracking-[0.08em] text-muted hover:text-amber"
            >
              None
            </button>
          </div>
        </div>

        <div className="px-2 pb-2 pt-5 sm:px-3">
          <CompareChart
            bundle={bundle}
            showYear={range === "MAX" || range === "1Y"}
          />
        </div>
        <div className="border-t border-line px-3 py-2 font-mono text-[8px] uppercase tracking-[0.06em] text-dim sm:px-4">
          {normalization === "range"
            ? "Each line is rebased to 100 at its first available observation in the selected range. Benchmarks are dashed."
            : "Baskets use their own inception base of 100. Benchmarks are dashed and rebased at the range start. Backfilled history is simulated."}
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
                    <td>
                      {formatCoverage(
                        detail.meta.pricedCount,
                        detail.meta.constituentCount,
                      )}
                    </td>
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

      {benchmarkRows.length > 0 && (
        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2.5 sm:px-4">
            <div className="flex items-center gap-2">
              <span className="kicker kicker-amber">Market benchmarks</span>
              <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-dim">
                ETF proxies · total return
              </span>
            </div>
            <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-dim">
              Dashed on chart
            </span>
          </div>
          <div className="table-wrap">
            <table className="data-table min-w-[560px]">
              <thead>
                <tr>
                  <th>Benchmark</th>
                  <th>{rangeLabel(range)} return</th>
                  <th>Max DD</th>
                  <th>Ann. vol</th>
                </tr>
              </thead>
              <tbody>
                {benchmarkRows.map((benchmark) => {
                  const id = `bench:${benchmark.symbol}`;
                  const values = bundle.data
                    .map((row) => row[id])
                    .filter((value): value is number => typeof value === "number");
                  const stats = seriesStats(values);
                  return (
                    <tr key={benchmark.symbol}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-0 w-4 border-t border-dashed"
                            style={{
                              borderColor: indexColorForTheme(
                                benchmark.color,
                                resolved,
                              ),
                            }}
                          />
                          <span className="font-medium text-ink">
                            {benchmark.name}
                          </span>
                          <span className="text-[8px] text-dim">
                            {benchmark.symbol}
                          </span>
                        </div>
                      </td>
                      <td className={classNames("tabular", pctClass(stats.returnPct))}>
                        {formatPct(stats.returnPct, 2)}
                      </td>
                      <td className="text-down">
                        {formatPct(stats.maxDrawdown, 2)}
                      </td>
                      <td>{formatPct(stats.volatility, 2, false)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-3 py-2 font-mono text-[8px] uppercase tracking-[0.06em] text-dim sm:px-4">
            ETF proxies: SPY, QQQ, DIA, IWM and ACWI. Benchmarks are always
            rebased at the selected range start, including in inception mode.
          </div>
        </section>
      )}
    </div>
  );
}
