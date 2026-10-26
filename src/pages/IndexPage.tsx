import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useIndexDetail } from "../lib/api";
import {
  RANGE_OPTIONS,
  buildDrawdown,
  periodReturn,
  type PeriodKey,
  type RangeKey,
  type ReturnMode,
} from "../lib/chart";
import {
  formatCoverage,
  formatDate,
  formatLevel,
  formatPct,
  pctTone,
} from "../lib/format";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { ErrorPanel, LoadingPanel } from "../components/AsyncState";
import { DrawdownChart, IndexChart } from "../components/charts";
import ConstituentTable from "../components/ConstituentTable";
import Stat from "../components/Stat";

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "SI", label: "Since inception" },
  { key: "1D", label: "1D" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "6M", label: "6M" },
  { key: "YTD", label: "YTD" },
  { key: "1Y", label: "1Y" },
];

function Badge({ children, tone }: { children: ReactNode; tone?: "amber" | "muted" }) {
  return (
    <span
      className={`border px-1.5 py-1 font-mono text-[8px] uppercase tracking-[0.08em] ${
        tone === "amber"
          ? "border-amber/40 bg-amber-soft text-amber"
          : "border-line text-muted"
      }`}
    >
      {children}
    </span>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-1.5 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
        {label}
      </span>
      <span className="font-mono text-[10px] text-ink">{value}</span>
    </div>
  );
}

export default function IndexPage() {
  const { slug } = useParams<{ slug: string }>();
  const { detail, loading, error } = useIndexDetail(slug);
  useDocumentTitle(detail?.name);

  const [range, setRange] = useState<RangeKey>("6M");
  const [mode, setMode] = useState<ReturnMode>("total");
  const [logScale, setLogScale] = useState(false);
  const [benchmarkOverride, setBenchmarkOverride] = useState<string | null>(null);

  const periods = useMemo(() => {
    if (!detail) return [];
    return PERIODS.map((period) => ({
      ...period,
      ...periodReturn(detail, mode, period.key),
    }));
  }, [detail, mode]);

  const ddRange = useMemo(() => {
    if (!detail) return null;
    const points = buildDrawdown(detail, range, mode);
    const values = points
      .map((point) => point.drawdown)
      .filter((value): value is number => value != null);
    return values.length ? Math.min(...values) : null;
  }, [detail, range, mode]);

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingPanel className="h-36" />
        <LoadingPanel className="h-28" />
        <LoadingPanel className="h-[500px]" />
        <LoadingPanel className="h-72" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted hover:text-amber"
        >
          <ArrowLeft size={11} />
          Index board
        </Link>
        <ErrorPanel
          message={error ?? `No index found for “${slug}”.`}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const benchmark =
    benchmarkOverride && detail.benchmarkSymbols.includes(benchmarkOverride)
      ? benchmarkOverride
      : detail.benchmark;
  const preEvent = detail.stats.preEvent;
  const maxDdStat =
    detail.stats.maxDrawdownSinceInception ?? detail.stats.maxDrawdown;
  const maxDdLabel =
    detail.stats.maxDrawdownSinceInception != null
      ? "Max DD · live"
      : "Max DD · backfill";

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted hover:text-amber"
        >
          <ArrowLeft size={11} />
          Index board
        </Link>
      </div>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="kicker kicker-amber">
              Index #{String(detail.order).padStart(2, "0")}
            </span>
            <Badge tone={detail.meta.liveDays > 0 ? "amber" : "muted"}>
              {detail.meta.liveDays > 0
                ? `Live ${detail.meta.liveDays}d`
                : "Base only"}
            </Badge>
            <Badge>Data {formatDate(detail.meta.asOf, "short")}</Badge>
            {detail.meta.missingCount > 0 && (
              <Badge tone="amber">{detail.meta.missingCount} missing</Badge>
            )}
          </div>
          <h1 className="mt-2 font-mono text-[30px] font-medium leading-[1.02] tracking-[-0.05em] text-ink sm:text-[40px] xl:text-[48px]">
            {detail.name}
          </h1>
          <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-muted">
            {detail.note || "No note set for this basket."}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge>Created {formatDate(detail.created, "short")}</Badge>
            <Badge>Base {formatDate(detail.baseDate, "short")}</Badge>
            <Badge>Backfill {formatDate(detail.backfillStart, "short")}</Badge>
            <Badge>
              Coverage {formatCoverage(detail.meta.pricedCount, detail.meta.constituentCount)}
            </Badge>
            <Badge>Benchmark {detail.benchmark}</Badge>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4 lg:grid-cols-2">
          <div className="bg-panel px-4 py-3">
            <div className="kicker">Last level</div>
            <div className="mt-1 font-mono text-[22px] leading-none text-ink">
              {formatLevel(detail.levels[detail.levels.length - 1])}
            </div>
          </div>
          <div className="bg-panel px-4 py-3">
            <div className="kicker">Coverage</div>
            <div className="mt-1 font-mono text-[22px] leading-none text-ink">
              {Math.round((detail.meta.pricedCount / detail.meta.constituentCount) * 100)}%
            </div>
          </div>
          <div className="bg-panel px-4 py-3">
            <div className="kicker">Base date</div>
            <div className="mt-1 font-mono text-[12px] leading-none text-ink">
              {formatDate(detail.baseDate, "medium")}
            </div>
          </div>
          <div className="bg-panel px-4 py-3">
            <div className="kicker">Coverage start</div>
            <div className="mt-1 font-mono text-[12px] leading-none text-ink">
              {formatDate(detail.coverageStart, "medium")}
            </div>
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="grid grid-cols-2 border-b border-line sm:grid-cols-4 xl:grid-cols-8">
          {periods.map((period) => (
            <div key={period.key} className="stat-cell">
              <Stat
                label={period.label}
                value={formatPct(period.value, 2)}
                tone={pctTone(period.value)}
                simulated={period.simulated}
                sub={
                  period.startDate
                    ? `from ${formatDate(period.startDate, "short")}`
                    : undefined
                }
                title={period.startDate ? `From ${formatDate(period.startDate, "long")}` : undefined}
              />
            </div>
          ))}
          <div className="stat-cell">
            <Stat
              label={maxDdLabel}
              value={formatPct(maxDdStat, 1)}
              tone="down"
              simulated={detail.stats.maxDrawdownSinceInception == null}
              sub="peak to trough"
            />
          </div>
        </div>
      </section>

      <section className="panel min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-3 py-3 sm:px-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="kicker kicker-amber">Performance</span>
              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-dim">
                base 100 · {formatDate(detail.baseDate, "short")}
              </span>
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
              {detail.benchmark} normalized to the same base date
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="segmented">
              {(["total", "price"] as ReturnMode[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className="range-button"
                  data-active={mode === value}
                >
                  {value}
                </button>
              ))}
            </div>
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
            <button
              type="button"
              onClick={() => setLogScale((current) => !current)}
              className="range-button border border-line"
              data-active={logScale}
              title="Toggle logarithmic scale"
            >
              Log
            </button>
            <label className="flex items-center gap-1.5 border border-line px-2 py-1">
              <span className="kicker">Vs</span>
              <select
                value={benchmark}
                onChange={(event) => setBenchmarkOverride(event.target.value)}
                className="bg-panel font-mono text-[9px] uppercase tracking-[0.06em] text-ink outline-none"
                aria-label="Benchmark"
              >
                {detail.benchmarkSymbols.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="px-2 pb-2 pt-5 sm:px-3">
          <IndexChart
            detail={detail}
            range={range}
            mode={mode}
            benchmark={benchmark}
            logScale={logScale}
            heightClass="h-[320px] sm:h-[440px] xl:h-[500px]"
          />
        </div>
        <div className="border-t border-line px-3 py-2 font-mono text-[8px] uppercase tracking-[0.06em] text-dim sm:px-4">
          Dashed line is the same basket simulated before inception. The benchmark
          is normalized to the base date; the index itself is base 100 at inception.
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="panel min-w-0 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5 sm:px-4">
            <div className="flex items-center gap-2">
              <span className="kicker kicker-amber">Drawdown</span>
              <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-dim">
                {mode} · {range}
              </span>
            </div>
            <span className="font-mono text-[11px] text-down">
              {formatPct(ddRange, 2)}
            </span>
          </div>
          <div className="px-2 pb-2 pt-4 sm:px-3">
            <DrawdownChart detail={detail} range={range} mode={mode} />
          </div>
          <div className="border-t border-line px-3 py-2 font-mono text-[8px] uppercase tracking-[0.06em] text-dim sm:px-4">
            Peak-to-trough within the selected range. Not annualized.
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
          {preEvent && (
            <section className="panel">
              <div className="border-b border-line px-3 py-2.5 sm:px-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="kicker kicker-amber">Before the event</span>
                  <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-dim">
                    {formatDate(preEvent.date, "medium")}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted">{preEvent.label}</div>
              </div>
              <div className="grid grid-cols-2 gap-y-4 px-3 py-4 sm:grid-cols-4 sm:px-4">
                <div>
                  <div className="kicker">1M</div>
                  <div className={`mt-1 font-mono text-[15px] ${pctTone(preEvent.oneMonth) === "up" ? "text-up" : pctTone(preEvent.oneMonth) === "down" ? "text-down" : "text-ink"}`}>
                    {formatPct(preEvent.oneMonth, 2)}
                  </div>
                </div>
                <div>
                  <div className="kicker">3M</div>
                  <div className={`mt-1 font-mono text-[15px] ${pctTone(preEvent.threeMonth) === "up" ? "text-up" : pctTone(preEvent.threeMonth) === "down" ? "text-down" : "text-ink"}`}>
                    {formatPct(preEvent.threeMonth, 2)}
                  </div>
                </div>
                <div>
                  <div className="kicker">6M</div>
                  <div className={`mt-1 font-mono text-[15px] ${pctTone(preEvent.sixMonth) === "up" ? "text-up" : pctTone(preEvent.sixMonth) === "down" ? "text-down" : "text-ink"}`}>
                    {formatPct(preEvent.sixMonth, 2)}
                  </div>
                </div>
                <div>
                  <div className="kicker">Max DD</div>
                  <div className="mt-1 font-mono text-[15px] text-down">
                    {formatPct(preEvent.maxDrawdown, 2)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 font-mono text-[8px] uppercase tracking-[0.06em] text-dim sm:px-4">
                <span>
                  Coverage {preEvent.coverage}/{detail.meta.constituentCount}
                </span>
                {preEvent.simulated && <span className="text-amber">Simulated backfill</span>}
              </div>
            </section>
          )}

          <section className="panel">
            <div className="border-b border-line px-3 py-2.5 sm:px-4">
              <span className="kicker kicker-amber">Index profile</span>
            </div>
            <div className="px-3 py-2 sm:px-4">
              <ProfileRow label="Created" value={formatDate(detail.created, "medium")} />
              <ProfileRow label="Base date" value={formatDate(detail.baseDate, "medium")} />
              <ProfileRow label="Backfill from" value={formatDate(detail.backfillStart, "medium")} />
              <ProfileRow label="Credible from" value={formatDate(detail.coverageStart, "medium")} />
              <ProfileRow
                label="Constituents"
                value={`${detail.meta.pricedCount}/${detail.meta.constituentCount} priced`}
              />
              <ProfileRow label="Benchmarks" value={detail.benchmarkSymbols.join(" · ")} />
              <ProfileRow label="Source" value={detail.meta.source} />
              <ProfileRow label="Last run" value={formatDate(detail.meta.asOf, "medium")} />
            </div>
            <div className="border-t border-line px-3 py-2 sm:px-4">
              <a
                href="https://github.com/JorgeQuijano/situation-index/tree/main/data/indexes"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.06em] text-dim hover:text-amber"
              >
                Edit basket config
                <ArrowUpRight size={10} />
              </a>
            </div>
          </section>
        </div>
      </div>

      <ConstituentTable detail={detail} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 font-mono text-[8px] uppercase tracking-[0.06em] text-dim">
        <span>
          Equal weight · daily rebalance · USD · base 100 · {detail.benchmark}{" "}
          benchmark
        </span>
        <Link to="/methodology" className="hover:text-amber">
          Methodology →
        </Link>
      </div>
    </div>
  );
}
