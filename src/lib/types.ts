export type ThemeChoice = "system" | "terminal" | "paper";
export type ResolvedTheme = "terminal" | "paper";

export type ConstituentConfig = {
  symbol: string;
  ticker?: string;
  name?: string;
};

export type RawIndexConfig = {
  name: string;
  slug: string;
  order?: number;
  created?: string;
  inception: string;
  event_date?: string;
  event_label?: string;
  backfill_start?: string;
  min_coverage?: number;
  benchmark?: string;
  benchmarks?: string[];
  color?: string;
  note?: string;
  constituents: Array<string | ConstituentConfig>;
};

export type NormalizedConstituent = {
  symbol: string;
  ticker: string;
  name: string;
};

export type IndexConfig = {
  name: string;
  slug: string;
  order: number;
  created: string;
  inception: string;
  eventDate: string | null;
  eventLabel: string | null;
  backfillStart: string;
  minCoverage: number;
  benchmark: string;
  benchmarks: string[];
  color: string;
  note: string;
  constituents: NormalizedConstituent[];
};

export type Bar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number | null;
};

export type Quote = {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  timezone: string;
  bars: Bar[];
};

export type Perf = {
  level: number | null;
  dayPct: number | null;
  sincePct: number | null;
  ytdPct: number | null;
  oneYearPct: number | null;
  simulatedYtd: boolean;
};

export type PreEventStats = {
  date: string;
  label: string;
  oneMonth: number | null;
  threeMonth: number | null;
  sixMonth: number | null;
  maxDrawdown: number | null;
  coverage: number;
  simulated: boolean;
};

export type IndexStats = {
  maxDrawdown: number | null;
  maxDrawdownSinceInception: number | null;
  volatility: number | null;
  bestDay: { date: string; pct: number } | null;
  worstDay: { date: string; pct: number } | null;
  preEvent: PreEventStats | null;
};

export type IndexSummary = {
  slug: string;
  name: string;
  note: string;
  order: number;
  created: string;
  inception: string;
  baseDate: string;
  eventDate: string | null;
  eventLabel: string | null;
  backfillStart: string;
  coverageStart: string;
  base: number;
  benchmark: string;
  benchmarks: string[];
  color: string;
  constituentCount: number;
  pricedCount: number;
  missingCount: number;
  staleCount: number;
  coveragePct: number;
  liveDays: number;
  status: "live" | "base";
  latest: {
    date: string | null;
    total: Perf;
    price: Perf;
  };
  spark: number[];
  health: {
    missing: string[];
    stale: string[];
  };
};

export type Constituent = {
  symbol: string;
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  price: number | null;
  priceUsd: number | null;
  dayPct: number | null;
  ytdPct: number | null;
  sincePct: number | null;
  sinceDate: string | null;
  lateStart: boolean;
  from52wHigh: number | null;
  sma20: boolean | null;
  sma50: boolean | null;
  sma200: boolean | null;
  spark: number[];
  weight: number;
  active: boolean;
  stale: boolean;
  missing: boolean;
  dataStart: string | null;
  dataEnd: string | null;
};

export type IndexDetail = {
  slug: string;
  name: string;
  note: string;
  order: number;
  created: string;
  inception: string;
  baseDate: string;
  eventDate: string | null;
  eventLabel: string | null;
  backfillStart: string;
  coverageStart: string;
  base: number;
  color: string;
  benchmark: string;
  benchmarkSymbols: string[];
  benchmarks: Record<string, Array<number | null>>;
  dates: string[];
  levels: Array<number | null>;
  priceLevels: Array<number | null>;
  coverage: number[];
  stats: IndexStats;
  constituents: Constituent[];
  meta: {
    generatedAt: string;
    asOf: string;
    methodology: string;
    source: string;
    currency: string;
    constituentCount: number;
    pricedCount: number;
    missingCount: number;
    staleCount: number;
    liveDays: number;
  };
};

export type BenchmarkConfig = {
  symbol: string;
  name: string;
  color: string;
};

export type BenchmarkSeries = BenchmarkConfig & {
  levels: Array<number | null>;
};

export type BenchmarkFile = {
  generatedAt: string;
  asOf: string;
  dates: string[];
  benchmarks: BenchmarkSeries[];
};

export type HealthFailure = {
  symbol: string;
  message: string;
};

export type Health = {
  lastRun: string;
  asOf: string | null;
  source: string;
  indexCount: number;
  symbolCount: number;
  failures: HealthFailure[];
  warnings: string[];
};

export type Manifest = {
  generatedAt: string;
  asOf: string | null;
  indexes: IndexSummary[];
  health: Health;
};
