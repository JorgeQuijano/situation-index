import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useIndexDetail, useManifest } from "../lib/api";
import {
  formatCoverage,
  formatDate,
  formatPct,
  pctTone,
} from "../lib/format";
import type { RangeKey, ReturnMode } from "../lib/chart";
import { RANGE_OPTIONS, periodReturn } from "../lib/chart";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { ErrorPanel, LoadingPanel } from "../components/AsyncState";
import { IndexChart } from "../components/charts";
import IndexBoard from "../components/IndexBoard";
import IndexCard from "../components/IndexCard";
import Stat from "../components/Stat";
import TopMovers from "../components/TopMovers";

function StatCell({ children }: { children: ReactNode }) {
  return <div className="stat-cell">{children}</div>;
}

export default function Home() {
  useDocumentTitle();
  const { manifest, loading, error, reload } = useManifest();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("6M");
  const [mode, setMode] = useState<ReturnMode>("total");

  useEffect(() => {
    if (!selectedSlug && manifest?.indexes.length) {
      setSelectedSlug(manifest.indexes[0].slug);
    }
  }, [manifest, selectedSlug]);

  const selectedSummary =
    manifest?.indexes.find((index) => index.slug === selectedSlug) ??
    manifest?.indexes[0] ??
    null;
  const effectiveSlug = selectedSummary?.slug ?? null;
  const { detail, loading: detailLoading, error: detailError } =
    useIndexDetail(effectiveSlug);

  const totalNames = useMemo(
    () =>
      manifest?.indexes.reduce(
        (sum, index) => sum + index.constituentCount,
        0,
      ) ?? 0,
    [manifest],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingPanel className="h-40" label="Loading index board" />
        <div className="grid gap-4 xl:grid-cols-12">
          <LoadingPanel className="h-[520px] xl:col-span-8" />
          <LoadingPanel className="h-[520px] xl:col-span-4" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LoadingPanel className="h-64" />
          <LoadingPanel className="h-64" />
          <LoadingPanel className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <ErrorPanel
        message={error ?? "The data manifest could not be loaded."}
        onRetry={reload}
      />
    );
  }

  const latest = selectedSummary?.latest.total;
  const maxDrawdown = detail?.stats.maxDrawdown ?? null;
  const maxDrawdownIsSim = (selectedSummary?.liveDays ?? 0) < 252;

  return (
    <div className="space-y-5 sm:space-y-7">
      <section className="hero-glow -mx-4 border-b border-line px-4 pb-5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="kicker kicker-amber">
              Personal market terminal · {manifest.indexes.length} baskets
            </div>
            <h1 className="display mt-2 text-[32px] leading-[0.95] text-ink sm:text-[44px] lg:text-[52px]">
              SITUATION
              <span className="text-amber">INDEX</span>
            </h1>
            <p className="mt-3 max-w-2xl text-[12px] leading-relaxed text-muted sm:text-[13px]">
              Equal-weight baskets built around a market narrative. The live
              line starts when the basket was created; the dashed line is the
              same basket backfilled for context. No forecasts, no commentary —
              just the data and the note.
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-px border border-line bg-line">
            <div className="bg-panel px-4 py-3">
              <div className="kicker">As of</div>
              <div className="mt-1 font-mono text-[13px] text-ink">
                {formatDate(manifest.asOf, "medium")}
              </div>
            </div>
            <div className="bg-panel px-4 py-3">
              <div className="kicker">Baskets</div>
              <div className="mt-1 font-mono text-[13px] text-ink">
                {String(manifest.indexes.length).padStart(2, "0")}
              </div>
            </div>
            <div className="bg-panel px-4 py-3">
              <div className="kicker">Names</div>
              <div className="mt-1 font-mono text-[13px] text-ink">
                {totalNames}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-12 xl:gap-5">
        <section className="panel min-w-0 xl:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-3 py-3 sm:px-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2"
                  style={{ background: selectedSummary?.color }}
                />
                <span className="kicker kicker-amber">Featured basket</span>
                <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-dim">
                  {selectedSummary?.status === "base"
                    ? "base"
                    : `live ${selectedSummary?.liveDays ?? 0}d`}
                </span>
              </div>
              <h2 className="mt-1 truncate font-mono text-[18px] font-medium tracking-[-0.03em] text-ink sm:text-[22px]">
                {selectedSummary?.name}
              </h2>
              <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted">
                {selectedSummary?.note}
              </p>
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
                {RANGE_OPTIONS.slice(1).map((option) => (
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
              <Link
                to={`/index/${selectedSummary?.slug}`}
                className="flex items-center gap-1 border border-line px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted hover:border-amber hover:text-amber"
              >
                Open
                <ArrowUpRight size={10} />
              </Link>
            </div>
          </div>

          <div className="px-3 pb-3 pt-4 sm:px-4">
            {detailLoading && <LoadingPanel className="h-[320px] sm:h-[400px]" label="Loading chart" />}
            {detailError && (
              <ErrorPanel message={detailError} onRetry={reload} />
            )}
            {detail && (
              <IndexChart
                detail={detail}
                range={range}
                mode={mode}
                benchmark={detail.benchmark}
                heightClass="h-[300px] sm:h-[390px]"
              />
            )}
          </div>

          <div className="grid grid-cols-2 border-t border-line sm:grid-cols-3 xl:grid-cols-6">
            <StatCell>
              <Stat
                label="Since inception"
                value={formatPct(latest?.sincePct, 2)}
                tone={pctTone(latest?.sincePct)}
                sub={`base ${formatDate(selectedSummary?.baseDate, "short")}`}
              />
            </StatCell>
            <StatCell>
              <Stat
                label="1D"
                value={formatPct(latest?.dayPct, 2)}
                tone={pctTone(latest?.dayPct)}
                sub="last close"
              />
            </StatCell>
            <StatCell>
              <Stat
                label="YTD"
                value={formatPct(latest?.ytdPct, 2)}
                tone={pctTone(latest?.ytdPct)}
                simulated={latest?.simulatedYtd}
              />
            </StatCell>
            <StatCell>
              <Stat
                label="1Y"
                value={formatPct(latest?.oneYearPct, 2)}
                tone={pctTone(latest?.oneYearPct)}
                simulated={(selectedSummary?.liveDays ?? 0) < 252}
              />
            </StatCell>
            <StatCell>
              <Stat
                label="Max DD"
                value={formatPct(maxDrawdown, 1)}
                tone="down"
                sub="backfill"
                simulated={maxDrawdownIsSim}
              />
            </StatCell>
            <StatCell>
              <Stat
                label="Coverage"
                value={formatCoverage(
                  selectedSummary?.pricedCount ?? 0,
                  selectedSummary?.constituentCount ?? 0,
                )}
                sub="names priced"
              />
            </StatCell>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-4">
          <IndexBoard
            indexes={manifest.indexes}
            selectedSlug={selectedSummary?.slug}
            onSelect={setSelectedSlug}
          />
          <TopMovers
            index={selectedSummary}
            detail={detail}
            loading={detailLoading}
          />
        </div>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="kicker kicker-amber">All baskets</div>
            <h2 className="mt-1 font-mono text-[16px] font-medium uppercase tracking-[0.1em] text-ink">
              The index board
            </h2>
          </div>
          <Link
            to="/compare"
            className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted hover:text-amber"
          >
            Compare all
            <ArrowRight size={11} />
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {manifest.indexes.map((index) => (
            <IndexCard key={index.slug} index={index} />
          ))}
        </div>
      </section>

      <section className="panel grid gap-0 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
        {[
          {
            n: "01",
            title: "Define the basket",
            body: "A name, a one-line note, a handful of tickers. No essay required. The config is the whole interface.",
          },
          {
            n: "02",
            title: "Daily close update",
            body: "A GitHub Action fetches EOD prices after the US close, recalculates every basket, commits the JSON and deploys the page.",
          },
          {
            n: "03",
            title: "Live vs simulated",
            body: "The solid line starts at inception. The dashed line is the same basket backfilled for context, clearly marked and coverage-gated.",
          },
        ].map((item) => (
          <div key={item.n} className="p-4 sm:p-5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] text-amber">{item.n}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink">
                {item.title}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">{item.body}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
        <span>
          Data {formatDate(manifest.asOf, "medium")} · source Yahoo Finance
        </span>
        <Link to="/methodology" className="hover:text-amber">
          Method + caveats →
        </Link>
      </div>
    </div>
  );
}
