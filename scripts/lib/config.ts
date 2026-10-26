import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type {
  IndexConfig,
  NormalizedConstituent,
  RawIndexConfig,
} from "../../src/lib/types";

const DEFAULT_COLORS = ["#ffb000", "#2dd4bf", "#c084fc", "#60a5fa", "#f472b6"];

function assertDate(value: string | undefined, field: string, slug: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${slug}: ${field} must be YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${slug}: ${field} is not a valid date`);
  }
  return value;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function subtractYears(iso: string, years: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return isoDate(date);
}

function normalizeConstituent(
  raw: string | { symbol: string; ticker?: string; name?: string },
): NormalizedConstituent {
  if (typeof raw === "string") {
    const ticker = raw.split(".")[0];
    return { symbol: raw, ticker, name: ticker };
  }
  if (!raw.symbol) {
    throw new Error("Constituent is missing a symbol");
  }
  const ticker = raw.ticker ?? raw.symbol.split(".")[0];
  return {
    symbol: raw.symbol,
    ticker,
    name: raw.name ?? ticker,
  };
}

export function loadConfigs(dir = path.join(process.cwd(), "data/indexes")) {
  const files = fs
    .readdirSync(dir)
    .filter((file) => /\.ya?ml$/i.test(file))
    .sort();

  if (!files.length) {
    throw new Error(`No index configs found in ${dir}`);
  }

  const configs: IndexConfig[] = files.map((file, fileIndex) => {
    const raw = parse(
      fs.readFileSync(path.join(dir, file), "utf8"),
    ) as RawIndexConfig;

    if (!raw.name || !raw.slug || !raw.inception) {
      throw new Error(`${file}: name, slug and inception are required`);
    }
    if (!/^[a-z0-9-]+$/.test(raw.slug)) {
      throw new Error(`${file}: slug must use lowercase letters, numbers or dashes`);
    }
    if (!Array.isArray(raw.constituents) || raw.constituents.length === 0) {
      throw new Error(`${file}: constituents is required`);
    }

    const inception = assertDate(raw.inception, "inception", raw.slug);
    const created = assertDate(
      raw.created ?? raw.inception,
      "created",
      raw.slug,
    );
    const eventDate = raw.event_date
      ? assertDate(raw.event_date, "event_date", raw.slug)
      : null;
    const backfillStart = assertDate(
      raw.backfill_start ?? subtractYears(inception, 5),
      "backfill_start",
      raw.slug,
    );

    if (backfillStart > inception) {
      throw new Error(`${file}: backfill_start must be before inception`);
    }

    const benchmarks = Array.from(
      new Set([
        raw.benchmark ?? raw.benchmarks?.[0] ?? "SPY",
        ...(raw.benchmarks ?? []),
      ]),
    );
    const constituents = raw.constituents.map(normalizeConstituent);
    const seen = new Set<string>();
    for (const constituent of constituents) {
      if (seen.has(constituent.symbol)) {
        throw new Error(`${file}: duplicate constituent ${constituent.symbol}`);
      }
      seen.add(constituent.symbol);
    }

    return {
      name: raw.name,
      slug: raw.slug,
      order: raw.order ?? fileIndex + 1,
      created,
      inception,
      eventDate,
      eventLabel: raw.event_label ?? null,
      backfillStart,
      minCoverage: Math.min(Math.max(raw.min_coverage ?? 0.6, 0.1), 1),
      benchmark: benchmarks[0],
      benchmarks,
      color: raw.color ?? DEFAULT_COLORS[fileIndex % DEFAULT_COLORS.length],
      note: raw.note ?? "",
      constituents,
    };
  });

  const slugs = new Set<string>();
  for (const config of configs) {
    if (slugs.has(config.slug)) {
      throw new Error(`Duplicate index slug ${config.slug}`);
    }
    slugs.add(config.slug);
  }

  return configs.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}
