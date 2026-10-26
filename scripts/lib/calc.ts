import type {
  Constituent,
  IndexConfig,
  IndexDetail,
  IndexStats,
  IndexSummary,
  NormalizedConstituent,
  Perf,
  PreEventStats,
  Quote,
} from "../../src/lib/types";

const DAY = 86_400_000;
const STALE_DAYS = 7;

export type FxQuotes = Map<string, Quote>;

type Aligned = {
  values: Array<number | null>;
  barDates: Array<string | null>;
};

type Prepared = {
  config: NormalizedConstituent;
  quote: Quote;
  barDates: Array<string | null>;
  localClose: Array<number | null>;
  localAdj: Array<number | null>;
  usdClose: Array<number | null>;
  usdAdj: Array<number | null>;
  fx: number[];
  active: boolean[];
};

function round(value: number | null, digits = 4) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function roundArray(values: Array<number | null>, digits = 4) {
  return values.map((value) => round(value, digits));
}

export function addDays(iso: string, days: number) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);
}

function daysBetween(a: string, b: string) {
  return (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY;
}

function lastIndexOnOrBefore(dates: string[], target: string) {
  let low = 0;
  let high = dates.length - 1;
  let result = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (dates[mid] <= target) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}

function firstIndexOnOrAfter(dates: string[], target: string) {
  let low = 0;
  let high = dates.length - 1;
  let result = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (dates[mid] >= target) {
      result = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return result;
}

function alignBars(
  bars: Quote["bars"],
  masterDates: string[],
  field: "close" | "adjClose",
): Aligned {
  const values: Array<number | null> = new Array(masterDates.length).fill(null);
  const barDates: Array<string | null> = new Array(masterDates.length).fill(null);
  let pointer = -1;
  for (let i = 0; i < masterDates.length; i += 1) {
    while (
      pointer + 1 < bars.length &&
      bars[pointer + 1].date <= masterDates[i]
    ) {
      pointer += 1;
    }
    if (pointer >= 0) {
      values[i] = bars[pointer][field];
      barDates[i] = bars[pointer].date;
    }
  }
  return { values, barDates };
}

function alignFx(quote: Quote | undefined, masterDates: string[]) {
  if (!quote) return null;
  const aligned = alignBars(quote.bars, masterDates, "close");
  return aligned.values;
}

function prepare(
  config: NormalizedConstituent,
  quote: Quote,
  masterDates: string[],
  fxRates: Map<string, Array<number | null>>,
): Prepared {
  const close = alignBars(quote.bars, masterDates, "close");
  const adj = alignBars(quote.bars, masterDates, "adjClose");
  const currencyKey = quote.currency === "GBp" ? "GBP" : quote.currency;
  const rates = fxRates.get(currencyKey);
  const scale = quote.currency === "GBp" ? 1 / 100 : 1;

  const fx: number[] = [];
  const usdClose: Array<number | null> = [];
  const usdAdj: Array<number | null> = [];
  for (let i = 0; i < masterDates.length; i += 1) {
    const rate = quote.currency === "USD" ? 1 : (rates?.[i] ?? 1) * scale;
    fx.push(rate);
    usdClose.push(close.values[i] == null ? null : close.values[i]! * rate);
    usdAdj.push(adj.values[i] == null ? null : adj.values[i]! * rate);
  }

  const active = close.barDates.map((date, index) => {
    if (!date) return false;
    return daysBetween(date, masterDates[index]) <= STALE_DAYS;
  });

  return {
    config,
    quote,
    barDates: close.barDates,
    localClose: close.values,
    localAdj: adj.values,
    usdClose,
    usdAdj,
    fx,
    active,
  };
}

function returnsFor(values: Array<number | null>, active: boolean[]) {
  let last: number | null = null;
  return values.map((value, index) => {
    if (!active[index] || value == null) return null;
    const result = last == null ? null : value / last - 1;
    last = value;
    return result;
  });
}

type SeriesResult = {
  levels: Array<number | null>;
  coverage: number[];
};

function buildSeries(
  prepared: Prepared[],
  masterDates: string[],
  field: "usdAdj" | "usdClose",
): SeriesResult {
  const returns = prepared.map((item) =>
    returnsFor(item[field], item.active),
  );
  const levels: Array<number | null> = new Array(masterDates.length).fill(null);
  const coverage: number[] = new Array(masterDates.length).fill(0);
  let level: number | null = null;

  for (let i = 0; i < masterDates.length; i += 1) {
    const activeCount = prepared.filter((item) => item.active[i]).length;
    coverage[i] = activeCount;
    if (!activeCount) {
      level = null;
      continue;
    }

    const daily = returns
      .map((series) => series[i])
      .filter((value): value is number => value != null);
    if (!daily.length) {
      if (level == null) level = 100;
      levels[i] = level;
      continue;
    }
    const average = daily.reduce((sum, value) => sum + value, 0) / daily.length;
    level = level == null ? 100 * (1 + average) : level * (1 + average);
    levels[i] = level;
  }

  return { levels, coverage };
}

function normalizeAtBase(levels: Array<number | null>, baseIndex: number) {
  const base = levels[baseIndex];
  if (base == null || base === 0) return levels;
  return levels.map((level) => (level == null ? null : (level / base) * 100));
}

function findBaseIndex(dates: string[], levels: Array<number | null>, inception: string) {
  const candidate = firstIndexOnOrAfter(dates, inception);
  if (candidate >= 0) {
    for (let i = candidate; i < dates.length; i += 1) {
      if (levels[i] != null) return i;
    }
  }
  return levels.findIndex((level) => level != null);
}

function maxDrawdown(
  levels: Array<number | null>,
  startIndex: number,
  endIndex: number,
) {
  let peak: number | null = null;
  let worst = 0;
  let points = 0;
  for (let i = startIndex; i <= endIndex; i += 1) {
    const value = levels[i];
    if (value == null) continue;
    points += 1;
    peak = peak == null ? value : Math.max(peak, value);
    if (peak) worst = Math.min(worst, value / peak - 1);
  }
  return points < 2 ? null : worst;
}

function annualizedVolatility(
  levels: Array<number | null>,
  startIndex: number,
  endIndex: number,
) {
  const returns: number[] = [];
  let previous: number | null = null;
  for (let i = startIndex; i <= endIndex; i += 1) {
    const value = levels[i];
    if (value == null) continue;
    if (previous != null) returns.push(value / previous - 1);
    previous = value;
  }
  if (returns.length < 5) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

function bestWorst(levels: Array<number | null>, dates: string[], startIndex: number, endIndex: number) {
  let best: { date: string; pct: number } | null = null;
  let worst: { date: string; pct: number } | null = null;
  let previous: number | null = null;
  for (let i = startIndex; i <= endIndex; i += 1) {
    const value = levels[i];
    if (value == null) continue;
    if (previous != null) {
      const pct = value / previous - 1;
      if (!best || pct > best.pct) best = { date: dates[i], pct };
      if (!worst || pct < worst.pct) worst = { date: dates[i], pct };
    }
    previous = value;
  }
  return { best, worst };
}

function findCoverageStart(coverage: number[], threshold: number) {
  let run = 0;
  for (let i = 0; i < coverage.length; i += 1) {
    if (coverage[i] >= threshold) {
      run += 1;
      if (run >= 10) return i - 9;
    } else {
      run = 0;
    }
  }
  const first = coverage.findIndex((value) => value > 0);
  return first >= 0 ? first : 0;
}

function perfAt(
  levels: Array<number | null>,
  dates: string[],
  baseIndex: number,
  latestIndex: number,
  asOf: string,
): Perf {
  const level = levels[latestIndex];
  if (level == null) {
    return {
      level: null,
      dayPct: null,
      sincePct: null,
      ytdPct: null,
      oneYearPct: null,
      simulatedYtd: false,
    };
  }

  let previous: number | null = null;
  for (let i = latestIndex - 1; i >= baseIndex; i -= 1) {
    if (levels[i] != null) {
      previous = levels[i];
      break;
    }
  }
  const dayPct = latestIndex <= baseIndex ? 0 : previous == null ? null : level / previous - 1;

  const year = asOf.slice(0, 4);
  const previousYearEnd = `${Number(year) - 1}-12-31`;
  const ytdIndex = lastIndexOnOrBefore(dates, previousYearEnd);
  const ytdBase = ytdIndex >= 0 ? levels[ytdIndex] : null;
  const ytdPct = ytdBase == null ? null : level / ytdBase - 1;

  const oneYearIndex = lastIndexOnOrBefore(dates, addDays(asOf, -365));
  const oneYearBase = oneYearIndex >= 0 ? levels[oneYearIndex] : null;
  const oneYearPct = oneYearBase == null ? null : level / oneYearBase - 1;

  return {
    level: round(level, 2),
    dayPct: round(dayPct, 6),
    sincePct: round(level / 100 - 1, 6),
    ytdPct: round(ytdPct, 6),
    oneYearPct: round(oneYearPct, 6),
    simulatedYtd: dates[baseIndex] > `${year}-01-01`,
  };
}

function preEventStats(
  config: IndexConfig,
  levels: Array<number | null>,
  dates: string[],
  coverage: number[],
  baseDate: string,
  asOf: string,
): PreEventStats | null {
  if (!config.eventDate || config.eventDate > asOf) return null;
  const eventIndex = lastIndexOnOrBefore(dates, config.eventDate);
  if (eventIndex < 0 || levels[eventIndex] == null) return null;
  const eventLevel = levels[eventIndex]!;

  const target = (days: number) => {
    const index = lastIndexOnOrBefore(dates, addDays(config.eventDate!, -days));
    return index >= 0 ? levels[index] : null;
  };
  const oneMonth = target(31);
  const threeMonth = target(92);
  const sixMonth = target(183);
  const sixMonthIndex = lastIndexOnOrBefore(
    dates,
    addDays(config.eventDate, -183),
  );

  return {
    date: config.eventDate,
    label: config.eventLabel ?? "Event",
    oneMonth: oneMonth == null ? null : round(eventLevel / oneMonth - 1, 6),
    threeMonth: threeMonth == null ? null : round(eventLevel / threeMonth - 1, 6),
    sixMonth: sixMonth == null ? null : round(eventLevel / sixMonth - 1, 6),
    maxDrawdown:
      sixMonthIndex < 0
        ? null
        : round(maxDrawdown(levels, sixMonthIndex, eventIndex), 6),
    coverage: coverage[eventIndex] ?? 0,
    simulated: config.eventDate < baseDate,
  };
}

function constituentRow(
  config: NormalizedConstituent,
  prepared: Prepared | null,
  baseDate: string,
  asOf: string,
  latestActiveCount: number,
  latestIndex: number,
): Constituent {
  if (!prepared) {
    return {
      symbol: config.symbol,
      ticker: config.ticker,
      name: config.name,
      exchange: "",
      currency: "",
      price: null,
      priceUsd: null,
      dayPct: null,
      ytdPct: null,
      sincePct: null,
      sinceDate: null,
      lateStart: false,
      from52wHigh: null,
      sma20: null,
      sma50: null,
      sma200: null,
      spark: [],
      weight: 0,
      active: false,
      stale: true,
      missing: true,
      dataStart: null,
      dataEnd: null,
    };
  }

  const bars = prepared.quote.bars;
  const last = bars[bars.length - 1];
  const previous = bars.length > 1 ? bars[bars.length - 2] : null;
  const lastDate = last?.date ?? null;
  const firstAfterBase =
    bars.find((bar) => bar.date >= baseDate) ?? null;
  const prevYearEnd = `${Number(asOf.slice(0, 4)) - 1}-12-31`;
  const ytdBar = [...bars].reverse().find((bar) => bar.date <= prevYearEnd);
  const window = bars.slice(-252);
  const high = window.length ? Math.max(...window.map((bar) => bar.close)) : null;
  const sma = (period: number) => {
    if (bars.length < period) return null;
    const slice = bars.slice(-period);
    return slice.reduce((sum, bar) => sum + bar.close, 0) / period;
  };
  const sma20 = sma(20);
  const sma50 = sma(50);
  const sma200 = sma(200);
  const sparkBars = bars.slice(-252);
  const sparkBase = sparkBars[0]?.adjClose ?? null;
  const spark =
    sparkBase && sparkBase > 0
      ? sparkBars.map((bar) => round((bar.adjClose / sparkBase) * 100, 3)!)
      : [];

  return {
    symbol: config.symbol,
    ticker: config.ticker,
    name: config.name || prepared.quote.name,
    exchange: prepared.quote.exchange,
    currency: prepared.quote.currency,
    price: round(last?.close ?? null, 4),
    priceUsd: round(prepared.usdClose[latestIndex] ?? null, 4),
    dayPct:
      last && previous ? round(last.close / previous.close - 1, 6) : null,
    ytdPct:
      last && ytdBar ? round(last.close / ytdBar.close - 1, 6) : null,
    sincePct:
      last && firstAfterBase
        ? round(last.close / firstAfterBase.close - 1, 6)
        : null,
    sinceDate: firstAfterBase?.date ?? null,
    lateStart: firstAfterBase ? firstAfterBase.date > baseDate : false,
    from52wHigh:
      last && high && high > 0 ? round(last.close / high - 1, 6) : null,
    sma20:
      last && sma20 != null ? last.close > sma20 : null,
    sma50:
      last && sma50 != null ? last.close > sma50 : null,
    sma200:
      last && sma200 != null ? last.close > sma200 : null,
    spark,
    weight:
      latestActiveCount > 0 && prepared.active[latestIndex]
        ? round(1 / latestActiveCount, 6)!
        : 0,
    active: prepared.active[latestIndex],
    stale:
      lastDate == null || daysBetween(lastDate, asOf) > STALE_DAYS,
    missing: false,
    dataStart: bars[0]?.date ?? null,
    dataEnd: lastDate,
  };
}

export function calculateIndex(
  config: IndexConfig,
  quotes: Map<string, Quote>,
  fxQuotes: FxQuotes,
  masterDates: string[],
  asOf: string,
  generatedAt: string,
): { detail: IndexDetail; summary: IndexSummary; warnings: string[] } {
  const warnings: string[] = [];
  const fxRates = new Map<string, Array<number | null>>();
  for (const [currency, quote] of fxQuotes) {
    const rates = alignFx(quote, masterDates);
    if (rates) fxRates.set(currency, rates);
  }

  const prepared: Prepared[] = [];
  const preparedBySymbol = new Map<string, Prepared>();
  for (const constituent of config.constituents) {
    const quote = quotes.get(constituent.symbol);
    if (!quote) {
      warnings.push(`${config.slug}: ${constituent.symbol} has no price data`);
      continue;
    }
    const item = prepare(constituent, quote, masterDates, fxRates);
    prepared.push(item);
    preparedBySymbol.set(constituent.symbol, item);
  }

  if (!prepared.length) {
    throw new Error(`${config.slug}: no constituents returned any data`);
  }

  const total = buildSeries(prepared, masterDates, "usdAdj");
  const price = buildSeries(prepared, masterDates, "usdClose");
  const baseIndex = findBaseIndex(masterDates, total.levels, config.inception);
  if (baseIndex < 0) {
    throw new Error(`${config.slug}: no index level available at inception`);
  }
  const baseDate = masterDates[baseIndex];
  const totalLevels = normalizeAtBase(total.levels, baseIndex);
  const priceLevels = normalizeAtBase(price.levels, baseIndex);
  const latestIndex = totalLevels.reduce<number>(
    (last, value, index) => (value == null ? last : index),
    -1,
  );
  if (latestIndex < 0) {
    throw new Error(`${config.slug}: no index level available`);
  }

  const latestActiveCount = total.coverage[latestIndex] ?? 0;
  const coverageThreshold = Math.ceil(
    config.constituents.length * config.minCoverage,
  );
  const rawCoverageStart = findCoverageStart(total.coverage, coverageThreshold);
  const coverageStartIndex = Math.min(rawCoverageStart, baseIndex);
  const coverageStart = masterDates[coverageStartIndex];
  const latestDate = masterDates[latestIndex];

  const totalPerf = perfAt(totalLevels, masterDates, baseIndex, latestIndex, latestDate);
  const pricePerf = perfAt(priceLevels, masterDates, baseIndex, latestIndex, latestDate);
  const liveDays = masterDates.filter(
    (date, index) => date > baseDate && totalLevels[index] != null,
  ).length;

  const drawdown = maxDrawdown(totalLevels, coverageStartIndex, latestIndex);
  const drawdownSinceInception =
    latestIndex > baseIndex
      ? maxDrawdown(totalLevels, baseIndex, latestIndex)
      : null;
  const volatility = annualizedVolatility(
    totalLevels,
    coverageStartIndex,
    latestIndex,
  );
  const extremes = bestWorst(
    totalLevels,
    masterDates,
    coverageStartIndex,
    latestIndex,
  );
  const preEvent = preEventStats(
    config,
    totalLevels,
    masterDates,
    total.coverage,
    baseDate,
    latestDate,
  );

  const constituents = config.constituents.map((constituent) =>
    constituentRow(
      constituent,
      preparedBySymbol.get(constituent.symbol) ?? null,
      baseDate,
      latestDate,
      latestActiveCount,
      latestIndex,
    ),
  );
  const missing = constituents.filter((item) => item.missing);
  const stale = constituents.filter((item) => !item.missing && item.stale);
  const pricedCount = constituents.length - missing.length;
  const coveragePct =
    constituents.length > 0 ? latestActiveCount / constituents.length : 0;

  if (missing.length) {
    warnings.push(
      `${config.slug}: ${missing.length} constituent${missing.length === 1 ? "" : "s"} missing price data`,
    );
  }
  if (stale.length) {
    warnings.push(
      `${config.slug}: ${stale.length} constituent${stale.length === 1 ? "" : "s"} stale`,
    );
  }
  if (coveragePct < 0.8) {
    warnings.push(
      `${config.slug}: latest coverage is ${(coveragePct * 100).toFixed(0)}%`,
    );
  }

  const benchmarks: Record<string, Array<number | null>> = {};
  for (const symbol of config.benchmarks) {
    const quote = quotes.get(symbol);
    if (!quote) {
      benchmarks[symbol] = new Array(masterDates.length).fill(null);
      warnings.push(`${config.slug}: benchmark ${symbol} has no data`);
      continue;
    }
    benchmarks[symbol] = roundArray(
      alignBars(quote.bars, masterDates, "adjClose").values,
      4,
    );
  }

  const stats: IndexStats = {
    maxDrawdown: round(drawdown, 6),
    maxDrawdownSinceInception: round(drawdownSinceInception, 6),
    volatility: round(volatility, 6),
    bestDay: extremes.best
      ? { date: extremes.best.date, pct: round(extremes.best.pct, 6)! }
      : null,
    worstDay: extremes.worst
      ? { date: extremes.worst.date, pct: round(extremes.worst.pct, 6)! }
      : null,
    preEvent,
  };

  const spark = totalLevels
    .slice(Math.max(0, latestIndex - 59), latestIndex + 1)
    .filter((value): value is number => value != null)
    .map((value) => round(value, 3)!);

  const detail: IndexDetail = {
    slug: config.slug,
    name: config.name,
    note: config.note,
    order: config.order,
    created: config.created,
    inception: config.inception,
    baseDate,
    eventDate: config.eventDate,
    eventLabel: config.eventLabel,
    backfillStart: config.backfillStart,
    coverageStart,
    base: 100,
    color: config.color,
    benchmark: config.benchmark,
    benchmarkSymbols: config.benchmarks,
    benchmarks,
    dates: masterDates,
    levels: roundArray(totalLevels, 4),
    priceLevels: roundArray(priceLevels, 4),
    coverage: total.coverage,
    stats,
    constituents,
    meta: {
      generatedAt,
      asOf: latestDate,
      methodology:
        "Equal-weight, daily rebalanced, USD. Total return uses adjusted close; price return uses close.",
      source: "Yahoo Finance",
      currency: "USD",
      constituentCount: constituents.length,
      pricedCount,
      missingCount: missing.length,
      staleCount: stale.length,
      liveDays,
    },
  };

  const summary: IndexSummary = {
    slug: config.slug,
    name: config.name,
    note: config.note,
    order: config.order,
    created: config.created,
    inception: config.inception,
    baseDate,
    eventDate: config.eventDate,
    eventLabel: config.eventLabel,
    backfillStart: config.backfillStart,
    coverageStart,
    base: 100,
    benchmark: config.benchmark,
    benchmarks: config.benchmarks,
    color: config.color,
    constituentCount: constituents.length,
    pricedCount,
    missingCount: missing.length,
    staleCount: stale.length,
    coveragePct: round(coveragePct, 4)!,
    liveDays,
    status: liveDays > 0 ? "live" : "base",
    latest: {
      date: latestDate,
      total: totalPerf,
      price: pricePerf,
    },
    spark,
    health: {
      missing: missing.map((item) => item.ticker),
      stale: stale.map((item) => item.ticker),
    },
  };

  return { detail, summary, warnings };
}
