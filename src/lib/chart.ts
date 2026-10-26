import type { IndexDetail } from "./types";
import { addDays } from "./format";

export type RangeKey = "1M" | "3M" | "6M" | "YTD" | "1Y" | "MAX";
export type ReturnMode = "total" | "price";
export type PeriodKey =
  | "1D"
  | "1W"
  | "1M"
  | "3M"
  | "6M"
  | "YTD"
  | "1Y"
  | "SI";

export const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "6M", label: "6M" },
  { key: "YTD", label: "YTD" },
  { key: "1Y", label: "1Y" },
  { key: "MAX", label: "MAX" },
];

const RANGE_DAYS: Record<Exclude<RangeKey, "YTD" | "MAX">, number> = {
  "1M": 31,
  "3M": 92,
  "6M": 183,
  "1Y": 365,
};

function seriesFor(detail: IndexDetail, mode: ReturnMode) {
  return mode === "total" ? detail.levels : detail.priceLevels;
}

function findFirstAtOrAfter(dates: string[], target: string) {
  const index = dates.findIndex((date) => date >= target);
  return index < 0 ? dates.length - 1 : index;
}

function findLastAtOrBefore(dates: string[], target: string) {
  for (let i = dates.length - 1; i >= 0; i -= 1) {
    if (dates[i] <= target) return i;
  }
  return -1;
}

export function rangeStartFor(detail: IndexDetail, range: RangeKey) {
  const asOf = detail.meta.asOf;
  let target: string;
  if (range === "MAX") {
    target = detail.coverageStart;
  } else if (range === "YTD") {
    target = `${asOf.slice(0, 4)}-01-01`;
  } else {
    target = addDays(asOf, -RANGE_DAYS[range]);
  }
  if (target < detail.coverageStart) target = detail.coverageStart;
  if (target > asOf) target = asOf;
  return target;
}

export type ChartPoint = {
  date: string;
  backfill: number | null;
  live: number | null;
  benchmark: number | null;
  simulated: boolean;
};

export type ChartBundle = {
  points: ChartPoint[];
  startDate: string;
  baseDate: string;
  eventDate: string | null;
  benchmark: string;
  benchmarkLabel: string | null;
  seriesLabel: string;
  range: RangeKey;
};

export function buildChartData(
  detail: IndexDetail,
  range: RangeKey,
  mode: ReturnMode,
  benchmark: string,
): ChartBundle {
  const series = seriesFor(detail, mode);
  const startDate = rangeStartFor(detail, range);
  const startIndex = findFirstAtOrAfter(detail.dates, startDate);
  const baseIndex = Math.max(
    0,
    detail.dates.findIndex((date) => date >= detail.baseDate),
  );
  const lastIndex = detail.dates.reduce(
    (last, date, index) => (date <= detail.meta.asOf ? index : last),
    startIndex,
  );

  const rawBenchmark = detail.benchmarks[benchmark] ?? null;
  let benchmarkBase: number | null = rawBenchmark?.[baseIndex] ?? null;
  if (benchmarkBase == null && rawBenchmark) {
    for (let i = baseIndex; i < rawBenchmark.length; i += 1) {
      if (rawBenchmark[i] != null) {
        benchmarkBase = rawBenchmark[i];
        break;
      }
    }
  }
  if (benchmarkBase == null && rawBenchmark) {
    for (let i = startIndex; i < rawBenchmark.length; i += 1) {
      if (rawBenchmark[i] != null) {
        benchmarkBase = rawBenchmark[i];
        break;
      }
    }
  }

  const points: ChartPoint[] = [];
  for (let i = startIndex; i <= lastIndex; i += 1) {
    const level = series[i];
    const date = detail.dates[i];
    const benchmarkValue =
      rawBenchmark && rawBenchmark[i] != null && benchmarkBase
        ? (rawBenchmark[i]! / benchmarkBase) * 100
        : null;
    points.push({
      date,
      backfill: i <= baseIndex && level != null ? level : null,
      live: i >= baseIndex && level != null ? level : null,
      benchmark: benchmarkValue,
      simulated: i < baseIndex,
    });
  }

  let eventDate: string | null = null;
  if (detail.eventDate) {
    const eventIndex = findLastAtOrBefore(detail.dates, detail.eventDate);
    if (
      eventIndex >= startIndex &&
      eventIndex <= lastIndex &&
      detail.dates[eventIndex] >= startDate
    ) {
      eventDate = detail.dates[eventIndex];
    }
  }

  const benchmarkLabel = rawBenchmark ? benchmark : null;

  return {
    points,
    startDate: detail.dates[startIndex],
    baseDate: detail.baseDate,
    eventDate,
    benchmark,
    benchmarkLabel,
    seriesLabel: mode === "total" ? "TOTAL RETURN" : "PRICE RETURN",
    range,
  };
}

export type DrawdownPoint = {
  date: string;
  drawdown: number | null;
};

export function buildDrawdown(
  detail: IndexDetail,
  range: RangeKey,
  mode: ReturnMode,
): DrawdownPoint[] {
  const series = seriesFor(detail, mode);
  const startDate = rangeStartFor(detail, range);
  const startIndex = findFirstAtOrAfter(detail.dates, startDate);
  const lastIndex = detail.dates.reduce(
    (last, date, index) => (date <= detail.meta.asOf ? index : last),
    startIndex,
  );
  let peak: number | null = null;
  const points: DrawdownPoint[] = [];
  for (let i = startIndex; i <= lastIndex; i += 1) {
    const value = series[i];
    if (value == null) {
      points.push({ date: detail.dates[i], drawdown: null });
      continue;
    }
    peak = peak == null ? value : Math.max(peak, value);
    points.push({
      date: detail.dates[i],
      drawdown: peak ? value / peak - 1 : null,
    });
  }
  return points;
}

export type PeriodResult = {
  value: number | null;
  simulated: boolean;
  startDate: string | null;
};

export function periodReturn(
  detail: IndexDetail,
  mode: ReturnMode,
  period: PeriodKey,
): PeriodResult {
  const series = seriesFor(detail, mode);
  const dates = detail.dates;
  const latestIndex = series.reduce<number>(
    (last, value, index) => (value == null ? last : index),
    -1,
  );
  if (latestIndex < 0) return { value: null, simulated: false, startDate: null };

  if (period === "SI") {
    return {
      value: series[latestIndex]! / 100 - 1,
      simulated: false,
      startDate: detail.baseDate,
    };
  }

  if (period === "1D") {
    const baseIndex = dates.findIndex((date) => date >= detail.baseDate);
    if (latestIndex <= 0 || latestIndex <= baseIndex) {
      return { value: 0, simulated: false, startDate: null };
    }
    let previous = -1;
    for (let i = latestIndex - 1; i >= 0; i -= 1) {
      if (series[i] != null) {
        previous = i;
        break;
      }
    }
    if (previous < 0 || series[previous] == null) {
      return { value: null, simulated: false, startDate: null };
    }
    return {
      value: series[latestIndex]! / series[previous]! - 1,
      simulated: false,
      startDate: dates[previous],
    };
  }

  const asOf = detail.meta.asOf;
  let target: string;
  if (period === "YTD") {
    target = `${asOf.slice(0, 4)}-01-01`;
  } else {
    const days: Record<Exclude<PeriodKey, "1D" | "YTD" | "SI">, number> = {
      "1W": 7,
      "1M": 31,
      "3M": 92,
      "6M": 183,
      "1Y": 365,
    };
    target = addDays(asOf, -days[period]);
  }

  const targetIndex = findLastAtOrBefore(dates, target);
  if (targetIndex < 0 || series[targetIndex] == null) {
    return { value: null, simulated: target < detail.baseDate, startDate: null };
  }
  return {
    value: series[latestIndex]! / series[targetIndex]! - 1,
    simulated: target < detail.baseDate,
    startDate: dates[targetIndex],
  };
}

export type CompareSeries = {
  slug: string;
  name: string;
  color: string;
};

export type CompareBundle = {
  dates: string[];
  data: Array<Record<string, number | string | null>>;
  series: CompareSeries[];
  startDate: string;
  asOf: string;
  normalization: "range" | "inception";
};

export function buildCompareData(
  details: IndexDetail[],
  slugs: string[],
  range: RangeKey,
  normalization: "range" | "inception",
): CompareBundle {
  const selected = details.filter((detail) => slugs.includes(detail.slug));
  if (!selected.length) {
    return {
      dates: [],
      data: [],
      series: [],
      startDate: "",
      asOf: "",
      normalization,
    };
  }

  const asOf = selected[0].meta.asOf;
  let target: string;
  if (range === "MAX") {
    target = selected
      .map((detail) => detail.coverageStart)
      .sort()[0];
  } else if (range === "YTD") {
    target = `${asOf.slice(0, 4)}-01-01`;
  } else {
    target = addDays(asOf, -RANGE_DAYS[range]);
  }

  const dateSet = new Set<string>();
  const maps = new Map<string, Map<string, number>>();
  for (const detail of selected) {
    const map = new Map<string, number>();
    for (let i = 0; i < detail.dates.length; i += 1) {
      const date = detail.dates[i];
      if (date < target || date > asOf) continue;
      if (date < detail.coverageStart) continue;
      const level = detail.levels[i];
      if (level == null) continue;
      map.set(date, level);
      dateSet.add(date);
    }
    maps.set(detail.slug, map);
  }

  const dates = Array.from(dateSet).sort();
  if (!dates.length) {
    return {
      dates: [],
      data: [],
      series: selected.map((detail) => ({
        slug: detail.slug,
        name: detail.name,
        color: detail.color,
      })),
      startDate: target,
      asOf,
      normalization,
    };
  }

  const starts = new Map<string, number>();
  for (const detail of selected) {
    const map = maps.get(detail.slug)!;
    for (const date of dates) {
      const value = map.get(date);
      if (value != null) {
        starts.set(detail.slug, value);
        break;
      }
    }
  }

  const data = dates.map((date) => {
    const row: Record<string, number | string | null> = { date };
    for (const detail of selected) {
      const value = maps.get(detail.slug)!.get(date) ?? null;
      if (value == null) {
        row[detail.slug] = null;
      } else if (normalization === "range") {
        const start = starts.get(detail.slug);
        row[detail.slug] = start ? (value / start) * 100 : value;
      } else {
        row[detail.slug] = value;
      }
    }
    return row;
  });

  return {
    dates,
    data,
    series: selected.map((detail) => ({
      slug: detail.slug,
      name: detail.name,
      color: detail.color,
    })),
    startDate: dates[0],
    asOf,
    normalization,
  };
}

export function rangeLabel(range: RangeKey) {
  if (range === "MAX") return "MAX";
  if (range === "YTD") return "YTD";
  return range;
}
