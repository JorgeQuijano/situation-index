import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Code2,
} from "lucide-react";
import { useManifest } from "../lib/api";
import {
  formatCoverage,
  formatDate,
  formatDateTime,
} from "../lib/format";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { ErrorPanel, LoadingPanel } from "../components/AsyncState";

const YAML_EXAMPLE = `name: New Situation
slug: new-situation
created: 2026-10-26
inception: 2026-10-26
event_date: 2026-10-01        # optional
event_label: What happened   # optional
backfill_start: 2024-10-26
min_coverage: 0.6
benchmark: SPY
color: "#60a5fa"
note: One line reminder of the situation.
constituents:
  - { symbol: AAPL, name: Apple }
  - { symbol: MSFT, name: Microsoft }`;

export default function Methodology() {
  useDocumentTitle("Methodology");
  const { manifest, loading, error, reload } = useManifest();

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingPanel className="h-36" />
        <LoadingPanel className="h-[500px]" />
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <ErrorPanel
        message={error ?? "The methodology data could not be loaded."}
        onRetry={reload}
      />
    );
  }

  const health = manifest.health;
  const healthy = health.failures.length === 0 && health.warnings.length === 0;

  return (
    <div className="space-y-5">
      <header>
        <div className="kicker kicker-amber">Reference</div>
        <h1 className="display mt-2 text-[34px] leading-none text-ink sm:text-[46px]">
          METHODOLOGY
        </h1>
        <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-muted">
          How the baskets are calculated, what the dates mean, where the data
          comes from, and what the backfill can and cannot tell you.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="panel p-4 sm:p-5">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.1em] text-amber">
              The index
            </h2>
            <div className="prose-terminal mt-3">
              <p>
                Each basket is an <strong>equal-weight, daily rebalanced</strong>{" "}
                index. At the base date it is set to <strong>100</strong>. Every
                trading day the index return is the simple average of its
                constituents&apos; daily returns, and the index level compounds
                from there.
              </p>
              <pre className="code-block">
{`r(t) = average( P(i,t) / P(i,t-1) - 1 )
I(t) = I(t-1) × (1 + r(t))

P = adjusted close in USD for total return
P = close in USD for price return`}
              </pre>
              <p>
                <strong>Total return</strong> uses Yahoo&apos;s adjusted close,
                so dividends and splits are included. <strong>Price return</strong>{" "}
                uses close, so dividends are excluded. Both are stored; the
                toggle in the chart and stats switches between them. Dividends
                matter most for Brazil; the difference is small for the
                photonics and neocloud baskets.
              </p>
              <p>
                Foreign listings are converted to USD using the daily EUR/USD,
                GBP/USD and SEK/USD rates. <code>IQE.L</code> quotes in pence,
                so its price is divided by 100 before the GBP conversion.
              </p>
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.1em] text-amber">
              Dates that matter
            </h2>
            <div className="mt-3 space-y-2">
              {[
                [
                  "created",
                  "When you added the basket to the tracker. Usually the date the source list was published.",
                ],
                [
                  "inception / base",
                  "The first trading session used as the base of 100. If the created date is a weekend or holiday, the next session is used.",
                ],
                [
                  "event_date",
                  "Optional marker for the situation that prompted the basket. It is only a chart annotation and a pre-event stats cutoff.",
                ],
                [
                  "backfill_start",
                  "How far back the simulated series runs. The default is five years before inception.",
                ],
                [
                  "coverage_start",
                  "The first date where at least 60% of the basket has data for ten consecutive sessions. The MAX chart starts here.",
                ],
              ].map(([label, body]) => (
                <div
                  key={label}
                  className="grid gap-1 border-b border-line pb-2 last:border-0 sm:grid-cols-[130px_1fr] sm:gap-3"
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-amber">
                    {label}
                  </span>
                  <span className="text-[11px] leading-relaxed text-muted">
                    {body}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.1em] text-amber">
              Live vs simulated
            </h2>
            <div className="prose-terminal mt-3">
              <p>
                The <strong>solid line</strong> starts at the base date. The{" "}
                <strong>dashed line</strong> before it is the same basket
                simulated using today&apos;s constituents. It is useful context
                for the question “was this already happening before the event?”
                but it is <strong>not a live track record</strong>.
              </p>
              <p>
                The early backfill can also be based on a small subset of the
                basket. A 2021 photonics index has almost the full list; a
                2024 neocloud index has a much thinner set of names. The chart
                starts at <code>coverage_start</code> and the coverage figure is
                shown on every index page. Do not read a low-coverage backfill
                as if it were the full basket.
              </p>
              <p>
                There is <strong>selection bias</strong>: the list was chosen
                after the situation became visible. The backfill cannot prove
                that you would have picked these names in advance. It can only
                show how this particular basket behaved.
              </p>
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.1em] text-amber">
              Data pipeline
            </h2>
            <div className="prose-terminal mt-3">
              <p>
                A GitHub Actions workflow fetches <strong>daily EOD bars</strong>{" "}
                from Yahoo Finance after the US close, recalculates every
                basket, writes compact JSON into <code>public/data</code>,
                commits the change and deploys the static site to GitHub Pages.
                No server, no database process and no API key in the browser.
              </p>
              <p>
                The updater fetches the full history each run rather than
                appending a close. That handles splits, dividend adjustments and
                late corrections cleanly. A missing ticker is kept in the table
                and flagged; it is excluded from the index until data returns.
                The page never silently replaces a failed fetch with zero.
              </p>
              <p>
                The current source is Yahoo&apos;s chart endpoint. It is free
                and gives adjusted closes and foreign suffixes, but it is
                unofficial. The fetcher already retries both Yahoo hosts and
                the provider layer is isolated, so a Tiingo or other fallback
                can be added without changing the index math.
              </p>
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.1em] text-amber">
              Ticker mapping
            </h2>
            <div className="prose-terminal mt-3">
              <p>
                The display ticker is the one from the source list. The provider
                symbol can differ. Current mappings:
              </p>
              <div className="grid gap-x-6 gap-y-1 font-mono text-[10px] sm:grid-cols-2">
                {[
                  ["CSN", "SID"],
                  ["INTER", "INTR"],
                  ["EMBR", "EMBJ"],
                  ["TSEM", "Tower Semiconductor"],
                  ["SIVE", "SIVE.ST"],
                  ["IQE", "IQE.L"],
                  ["SOI", "SOI.PA"],
                  ["ALRIB", "ALRIB.PA"],
                  ["AIXA", "AIXA.DE"],
                  ["XFAB", "XFAB.PA"],
                ].map(([display, symbol]) => (
                  <div
                    key={display}
                    className="flex items-center justify-between border-b border-line py-1"
                  >
                    <span className="text-amber">{display}</span>
                    <span className="text-muted">{symbol}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.1em] text-amber">
              Add a basket
            </h2>
            <div className="prose-terminal mt-3">
              <p>
                Add one YAML file in <code>data/indexes/</code>. The filename is
                not important; the <code>slug</code> is the URL. Commit the file
                and the next workflow run will backfill it and deploy the page.
                No code changes.
              </p>
              <pre className="code-block">{YAML_EXAMPLE}</pre>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  href="https://github.com/JorgeQuijano/situation-index/new/main/data/indexes"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 border border-amber bg-amber-soft px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-amber hover:bg-amber hover:text-black"
                >
                  <Code2 size={11} />
                  New basket file
                  <ArrowUpRight size={10} />
                </a>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 border border-line px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted hover:border-amber hover:text-amber"
                >
                  Back to the board
                </Link>
              </div>
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.1em] text-amber">
              Limitations
            </h2>
            <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted">
              {[
                "Backfilled history is simulated with today's list and is not a live track record.",
                "Coverage can be incomplete in the early backfill; the chart starts at the credible coverage date but the table still shows the full universe.",
                "There is no transaction cost, slippage, borrow, tax or rebalancing friction. The index is a signal, not an investable product.",
                "Yahoo Finance is an unofficial data source; prices can be delayed, revised or briefly unavailable.",
                "Foreign prices are converted to USD, so the index includes currency moves. That is intentional for a USD-based tracker.",
                "A delisted or acquired name is kept with its last data and flagged stale; it is not silently removed from history.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-[3px] text-amber">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="panel">
            <div className="border-b border-line px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="kicker kicker-amber">Data health</span>
                <span
                  className="status-dot"
                  data-tone={healthy ? "ok" : health.failures.length ? "bad" : "warn"}
                />
              </div>
            </div>
            <div className="px-3 py-3">
              <div className="space-y-1.5">
                {[
                  ["Last run", formatDateTime(health.lastRun)],
                  ["As of", formatDate(manifest.asOf, "medium")],
                  ["Source", health.source],
                  ["Indexes", String(health.indexCount)],
                  ["Instruments", String(health.symbolCount)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-dim">
                      {label}
                    </span>
                    <span className="text-right font-mono text-[9px] text-ink">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-line pt-2">
                {healthy ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-up">
                    <CheckCircle2 size={12} />
                    All instruments reported.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {health.failures.map((failure) => (
                      <div
                        key={`f-${failure.symbol}`}
                        className="flex items-start gap-1.5 text-[10px] text-down"
                      >
                        <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                        <span>
                          {failure.symbol}: {failure.message}
                        </span>
                      </div>
                    ))}
                    {health.warnings.map((warning) => (
                      <div
                        key={warning}
                        className="flex items-start gap-1.5 text-[10px] text-amber"
                      >
                        <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="border-b border-line px-3 py-2.5">
              <span className="kicker kicker-amber">The baskets</span>
            </div>
            <div className="divide-y divide-line">
              {manifest.indexes.map((index) => (
                <Link
                  key={index.slug}
                  to={`/index/${index.slug}`}
                  className="block px-3 py-2.5 hover:bg-panel-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[10px] text-ink">
                      {index.name}
                    </span>
                    <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.06em] text-dim">
                      {formatCoverage(index.pricedCount, index.constituentCount)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-dim">
                    <span>Base {formatDate(index.baseDate, "short")}</span>
                    <span>{index.benchmark}</span>
                    <span>{index.liveDays}d live</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel p-3">
            <div className="kicker kicker-amber">Repository</div>
            <div className="mt-2 space-y-1.5">
              <a
                href="https://github.com/JorgeQuijano/situation-index"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-[10px] text-muted hover:text-amber"
              >
                Source
                <ArrowUpRight size={10} />
              </a>
              <a
                href="https://github.com/JorgeQuijano/situation-index/tree/main/data/indexes"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-[10px] text-muted hover:text-amber"
              >
                Baskets
                <ArrowUpRight size={10} />
              </a>
              <a
                href="https://github.com/JorgeQuijano/situation-index/actions"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-[10px] text-muted hover:text-amber"
              >
                Update runs
                <ArrowUpRight size={10} />
              </a>
            </div>
          </section>

          <section className="border border-amber/40 bg-amber-soft p-3">
            <div className="kicker text-amber">Disclaimer</div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
              Personal research tool. Not investment advice. The backfill is
              simulated, the universe is selected with hindsight, and the index
              is not investable. Do your own work.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
