import fs from "node:fs";
import path from "node:path";
import type { Bar, Quote } from "../../src/lib/types";

const CACHE_DIR = path.join(process.cwd(), ".cache/yahoo");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

type YahooChart = {
  chart: {
    result?: Array<{
      meta: {
        symbol?: string;
        longName?: string;
        shortName?: string;
        currency?: string;
        exchangeName?: string;
        fullExchangeName?: string;
        exchangeTimezoneName?: string;
      };
      timestamp?: number[];
      indicators: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
        adjclose?: Array<{ adjclose?: Array<number | null> }>;
      };
    }>;
    error?: { code?: string; description?: string } | null;
  };
};

export type FetchResult = {
  quote: Quote | null;
  error: string | null;
  cached: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isUsMarketOpen(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = get("weekday");
  if (weekday === "Sat" || weekday === "Sun") return false;
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const minutes = hour * 60 + minute;
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60 + 20;
}

function isoDateInTz(timestampSeconds: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestampSeconds * 1000));
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function cachePath(symbol: string, range: string) {
  const safe = symbol.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(CACHE_DIR, `${safe}-${range}.json`);
}

function readCache(symbol: string, range: string): Quote | null {
  try {
    const file = cachePath(symbol, range);
    const stat = fs.statSync(file);
    if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as Quote;
  } catch {
    return null;
  }
}

function writeCache(symbol: string, range: string, quote: Quote) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cachePath(symbol, range), JSON.stringify(quote));
  } catch {
    // A cache failure should never block the update.
  }
}

function toQuote(
  symbol: string,
  raw: YahooChart,
  range: string,
  dropToday: boolean,
): Quote {
  const result = raw.chart.result?.[0];
  if (!result) {
    throw new Error(
      raw.chart.error?.description ?? raw.chart.error?.code ?? "no result",
    );
  }
  const meta = result.meta;
  const timezone = meta.exchangeTimezoneName ?? "America/New_York";
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators.quote?.[0] ?? {};
  const adj = result.indicators.adjclose?.[0]?.adjclose ?? [];

  const todayEt = isoDateInTz(Date.now() / 1000, "America/New_York");
  const byDate = new Map<string, Bar>();

  for (let i = 0; i < timestamps.length; i += 1) {
    const date = isoDateInTz(timestamps[i], timezone);
    if (dropToday && date === todayEt) continue;
    const close = quote.close?.[i];
    if (!Number.isFinite(close) || (close ?? 0) <= 0) continue;
    const adjClose = adj[i] ?? close;
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const volume = quote.volume?.[i];
    byDate.set(date, {
      date,
      open: Number.isFinite(open) ? (open as number) : (close as number),
      high: Number.isFinite(high) ? (high as number) : (close as number),
      low: Number.isFinite(low) ? (low as number) : (close as number),
      close: close as number,
      adjClose:
        Number.isFinite(adjClose) && (adjClose as number) > 0
          ? (adjClose as number)
          : (close as number),
      volume: Number.isFinite(volume) ? (volume as number) : null,
    });
  }

  const bars = Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  if (!bars.length) {
    throw new Error(`no daily bars returned for ${symbol} (${range})`);
  }

  return {
    symbol: meta.symbol ?? symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    currency: meta.currency ?? "USD",
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? "",
    timezone,
    bars,
  };
}

async function request(
  symbol: string,
  range: string,
  hostIndex: number,
): Promise<YahooChart> {
  const host = HOSTS[hostIndex % HOSTS.length];
  const url =
    `${host}/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=${encodeURIComponent(range)}&interval=1d`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as YahooChart;
}

export async function fetchChart(
  symbol: string,
  range = "10y",
): Promise<FetchResult> {
  const marketOpen = isUsMarketOpen();
  const cacheAllowed = !marketOpen;

  if (cacheAllowed) {
    const cached = readCache(symbol, range);
    if (cached) return { quote: cached, error: null, cached: true };
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const raw = await request(symbol, range, attempt);
      const quote = toQuote(symbol, raw, range, marketOpen);
      if (cacheAllowed) writeCache(symbol, range, quote);
      return { quote, error: null, cached: false };
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        const message = error instanceof Error ? error.message : String(error);
        const delay = message.includes("429")
          ? 10_000 + attempt * 8_000
          : 2_000 * 2 ** attempt;
        await sleep(delay);
      }
    }
  }

  return {
    quote: null,
    error: lastError instanceof Error ? lastError.message : String(lastError),
    cached: false,
  };
}

export { sleep };
