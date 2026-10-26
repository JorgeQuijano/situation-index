import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Constituent, IndexDetail } from "../lib/types";
import {
  classNames,
  formatCoverage,
  formatDate,
  formatPct,
  formatPrice,
  pctClass,
  pctTone,
} from "../lib/format";
import Delta from "./Delta";
import Sparkline from "./Sparkline";

type SortKey =
  | "ticker"
  | "price"
  | "dayPct"
  | "ytdPct"
  | "sincePct"
  | "from52wHigh"
  | "sma20"
  | "sma50"
  | "sma200"
  | "weight";

type SortDirection = "asc" | "desc";

function sortableValue(row: Constituent, key: SortKey): string | number | null {
  switch (key) {
    case "ticker":
      return row.ticker;
    case "price":
      return row.price;
    case "dayPct":
      return row.dayPct;
    case "ytdPct":
      return row.ytdPct;
    case "sincePct":
      return row.sincePct;
    case "from52wHigh":
      return row.from52wHigh;
    case "sma20":
      return row.sma20 == null ? null : row.sma20 ? 1 : 0;
    case "sma50":
      return row.sma50 == null ? null : row.sma50 ? 1 : 0;
    case "sma200":
      return row.sma200 == null ? null : row.sma200 ? 1 : 0;
    case "weight":
      return row.weight;
  }
}

function SmaFlag({ value }: { value: boolean | null }) {
  if (value == null) {
    return <span className="text-dim">—</span>;
  }
  return (
    <span className={value ? "sma-up" : "sma-down"}>
      {value ? "▲" : "▼"}
    </span>
  );
}

function StatusBadge({ row }: { row: Constituent }) {
  if (row.missing) {
    return (
      <span className="border border-down/40 px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-down">
        No data
      </span>
    );
  }
  if (row.stale) {
    return (
      <span className="border border-amber/40 px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-amber">
        Stale
      </span>
    );
  }
  if (row.lateStart) {
    return (
      <span
        className="border border-line-strong px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-muted"
        title={`Price history starts ${formatDate(row.sinceDate, "medium")}`}
      >
        New
      </span>
    );
  }
  return (
    <span className="flex items-center justify-end gap-1 font-mono text-[8px] uppercase tracking-[0.06em] text-dim">
      <span className="status-dot" style={{ width: 4, height: 4 }} />
      Priced
    </span>
  );
}

function HeaderCell({
  label,
  sortKey,
  current = null,
  direction = "desc",
  onSort,
  align = "right",
}: {
  label: string;
  sortKey?: SortKey;
  current?: SortKey | null;
  direction?: SortDirection;
  onSort?: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey != null && current === sortKey;
  if (!sortKey) {
    return (
      <th className={align === "left" ? "text-left" : undefined}>{label}</th>
    );
  }
  return (
    <th
      className={align === "left" ? "text-left" : undefined}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort?.(sortKey)}
        className={classNames(
          "inline-flex items-center gap-1 uppercase tracking-[0.1em] hover:text-ink",
          active && "text-amber",
        )}
      >
        {label}
        <span className="text-[7px]">
          {active ? (direction === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

function Metric({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "flat";
  sub?: string;
}) {
  return (
    <div>
      <div className="kicker">{label}</div>
      <div
        className={classNames(
          "mt-1 font-mono text-[13px] tabular",
          tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-ink",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[9px] text-dim">{sub}</div>}
    </div>
  );
}

function StockSheet({
  row,
  index,
  onClose,
}: {
  row: Constituent;
  index: IndexDetail;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const sparkTone =
    row.spark.length > 1
      ? pctTone(row.spark[row.spark.length - 1] - row.spark[0])
      : "flat";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="panel max-h-[92vh] w-full max-w-3xl overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={`${row.ticker} position detail`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line px-4 py-3 sm:px-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[18px] font-medium text-amber">
                {row.ticker}
              </span>
              <StatusBadge row={row} />
              {row.lateStart && (
                <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-muted">
                  since {formatDate(row.sinceDate, "short")}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[12px] text-muted">{row.name}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="kicker">Last</div>
              <div className="mt-1 font-mono text-[18px] text-ink">
                {formatPrice(row.price, row.currency)}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close position detail"
              className="flex h-7 w-7 items-center justify-center border border-line text-muted hover:border-amber hover:text-amber"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-5 border-b border-line px-4 py-4 sm:grid-cols-4 sm:px-5">
          <Metric
            label="1D"
            value={formatPct(row.dayPct, 2)}
            tone={pctTone(row.dayPct)}
          />
          <Metric
            label="YTD"
            value={formatPct(row.ytdPct, 2)}
            tone={pctTone(row.ytdPct)}
          />
          <Metric
            label="Since inception"
            value={formatPct(row.sincePct, 2)}
            tone={pctTone(row.sincePct)}
            sub={row.sinceDate ? `from ${formatDate(row.sinceDate, "short")}` : undefined}
          />
          <Metric
            label="From 52w high"
            value={formatPct(row.from52wHigh, 2)}
            tone={pctTone(row.from52wHigh)}
          />
          <Metric
            label="Weight"
            value={formatPct(row.weight, 2, false)}
            sub="equal weight"
          />
          <Metric
            label="SMA 20 / 50 / 200"
            value={`${row.sma20 == null ? "—" : row.sma20 ? "▲" : "▼"} ${row.sma50 == null ? "—" : row.sma50 ? "▲" : "▼"} ${row.sma200 == null ? "—" : row.sma200 ? "▲" : "▼"}`}
            tone="flat"
          />
          <Metric
            label="Data range"
            value={formatDate(row.dataStart, "short")}
            sub={`to ${formatDate(row.dataEnd, "short")}`}
          />
          <Metric
            label="Exchange"
            value={row.exchange || "—"}
            sub={row.currency || ""}
          />
        </div>

        <div className="px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between">
            <span className="kicker">1Y price · normalized</span>
            <span className="kicker">{row.currency}</span>
          </div>
          <Sparkline
            values={row.spark}
            tone={sparkTone}
            className="mt-3 h-40 w-full"
            height={160}
            strokeWidth={1.5}
          />
          <div className="mt-2 flex justify-between font-mono text-[8px] uppercase tracking-[0.08em] text-dim">
            <span>{formatDate(row.dataEnd, "short")} - 1Y</span>
            <span>{row.spark.length} sessions</span>
          </div>
        </div>

        <div className="border-t border-line px-4 py-2.5 font-mono text-[8px] uppercase tracking-[0.06em] text-dim sm:px-5">
          {index.name} · constituent {index.constituents.findIndex((item) => item.symbol === row.symbol) + 1} of{" "}
          {index.constituents.length}
        </div>
      </div>
    </div>
  );
}

export default function ConstituentTable({ detail }: { detail: IndexDetail }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [selected, setSelected] = useState<Constituent | null>(null);

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = detail.constituents.filter(
      (row) =>
        !normalized ||
        row.ticker.toLowerCase().includes(normalized) ||
        row.name.toLowerCase().includes(normalized) ||
        row.symbol.toLowerCase().includes(normalized),
    );
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aValue = sortableValue(a, sortKey);
      const bValue = sortableValue(b, sortKey);
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      let comparison: number;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = Number(aValue) - Number(bValue);
      }
      return direction === "asc" ? comparison : -comparison;
    });
  }, [detail, query, sortKey, direction]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setDirection(key === "ticker" ? "asc" : "desc");
  };

  const selectedDetail = selected;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-[13px] font-medium uppercase tracking-[0.12em] text-ink">
              Constituents
            </h2>
            <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-dim">
              {formatCoverage(detail.meta.pricedCount, detail.meta.constituentCount)} priced
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            Equal weight · sorted list preserves the source basket order until a
            column is selected.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search
            size={12}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-dim"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter ticker or company"
            aria-label="Filter constituents"
            className="h-8 w-full border border-line bg-panel pl-7 pr-2 font-mono text-[10px] text-ink placeholder:text-dim focus:border-amber focus:outline-none"
          />
        </div>
      </div>

      <div className="panel hidden overflow-hidden md:block">
        <div className="table-wrap max-h-[78vh]">
          <table className="data-table min-w-[1040px]">
            <thead>
              <tr>
                <HeaderCell
                  label="Ticker / Company"
                  sortKey="ticker"
                  current={sortKey}
                  direction={direction}
                  onSort={handleSort}
                  align="left"
                />
                <HeaderCell label="Price" sortKey="price" current={sortKey} direction={direction} onSort={handleSort} />
                <HeaderCell label="1D" sortKey="dayPct" current={sortKey} direction={direction} onSort={handleSort} />
                <HeaderCell label="YTD" sortKey="ytdPct" current={sortKey} direction={direction} onSort={handleSort} />
                <HeaderCell label="Since" sortKey="sincePct" current={sortKey} direction={direction} onSort={handleSort} />
                <HeaderCell label="52W" sortKey="from52wHigh" current={sortKey} direction={direction} onSort={handleSort} />
                <HeaderCell label="20D" sortKey="sma20" current={sortKey} direction={direction} onSort={handleSort} />
                <HeaderCell label="50D" sortKey="sma50" current={sortKey} direction={direction} onSort={handleSort} />
                <HeaderCell label="200D" sortKey="sma200" current={sortKey} direction={direction} onSort={handleSort} />
                <HeaderCell label="1Y" />
                <HeaderCell label="Wt" sortKey="weight" current={sortKey} direction={direction} onSort={handleSort} />
                <HeaderCell label="Status" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.symbol}
                  onClick={() => setSelected(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(row);
                    }
                  }}
                  tabIndex={0}
                  className="cursor-pointer"
                  title={`${row.name} · ${row.symbol}`}
                >
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{row.ticker}</span>
                      {row.lateStart && (
                        <span className="border border-line-strong px-1 py-0.5 font-mono text-[7px] uppercase tracking-[0.06em] text-muted">
                          New
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 max-w-[190px] truncate text-[9px] text-muted">
                      {row.name}
                    </div>
                  </td>
                  <td title={row.currency}>
                    {formatPrice(row.price, row.currency)}
                  </td>
                  <td>
                    <Delta value={row.dayPct} showArrow={false} />
                  </td>
                  <td>
                    <Delta value={row.ytdPct} showArrow={false} />
                  </td>
                  <td>
                    <Delta value={row.sincePct} showArrow={false} />
                  </td>
                  <td className={row.from52wHigh == null ? "text-dim" : "text-down"}>
                    {formatPct(row.from52wHigh, 1)}
                  </td>
                  <td><SmaFlag value={row.sma20} /></td>
                  <td><SmaFlag value={row.sma50} /></td>
                  <td><SmaFlag value={row.sma200} /></td>
                  <td>
                    <Sparkline
                      values={row.spark}
                      tone={
                        row.spark.length > 1
                          ? pctTone(
                              row.spark[row.spark.length - 1] - row.spark[0],
                            )
                          : "flat"
                      }
                      className="ml-auto h-6 w-[90px]"
                      height={24}
                    />
                  </td>
                  <td>{formatPct(row.weight, 2, false)}</td>
                  <td><StatusBadge row={row} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            No constituents match “{query}”
          </div>
        )}
      </div>

      <div className="grid gap-2 md:hidden">
        {rows.map((row) => (
          <button
            key={row.symbol}
            type="button"
            onClick={() => setSelected(row)}
            className="panel w-full p-3 text-left transition-colors hover:border-amber"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] font-medium text-amber">
                    {row.ticker}
                  </span>
                  <StatusBadge row={row} />
                </div>
                <div className="mt-0.5 truncate text-[10px] text-muted">{row.name}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[13px] text-ink">
                  {formatPrice(row.price, row.currency)}
                </div>
                <Delta value={row.dayPct} className="text-[9px]" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-2">
              <div>
                <div className="kicker">YTD</div>
                <div className={classNames("mt-0.5 font-mono text-[10px]", pctClass(row.ytdPct))}>
                  {formatPct(row.ytdPct, 2)}
                </div>
              </div>
              <div>
                <div className="kicker">Since</div>
                <div className={classNames("mt-0.5 font-mono text-[10px]", pctClass(row.sincePct))}>
                  {formatPct(row.sincePct, 2)}
                </div>
              </div>
              <div>
                <div className="kicker">52W</div>
                <div className="mt-0.5 font-mono text-[10px] text-down">
                  {formatPct(row.from52wHigh, 1)}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <Sparkline
                values={row.spark}
                tone={
                  row.spark.length > 1
                    ? pctTone(row.spark[row.spark.length - 1] - row.spark[0])
                    : "flat"
                }
                className="h-7 w-24"
                height={28}
              />
              <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-dim">
                20 {row.sma20 == null ? "—" : row.sma20 ? "▲" : "▼"} · 50{" "}
                {row.sma50 == null ? "—" : row.sma50 ? "▲" : "▼"} · 200{" "}
                {row.sma200 == null ? "—" : row.sma200 ? "▲" : "▼"}
              </span>
            </div>
          </button>
        ))}
      </div>

      {selectedDetail && (
        <StockSheet
          row={selectedDetail}
          index={detail}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
