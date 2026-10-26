import fs from "node:fs";
import path from "node:path";
import { loadConfigs } from "./lib/config";
import { calculateIndex } from "./lib/calc";
import { fetchChart, sleep } from "./lib/yahoo";
import type {
  Health,
  HealthFailure,
  IndexDetail,
  Manifest,
  Quote,
} from "../src/lib/types";

const OUT_DIR = path.join(process.cwd(), "public/data");
const INDEX_DIR = path.join(OUT_DIR, "indexes");

async function main() {
  const generatedAt = new Date().toISOString();
  const configs = loadConfigs();
  const minBackfillStart = configs
    .map((config) => config.backfillStart)
    .sort()[0];

  console.log(`Situation Index — updating ${configs.length} indexes`);
  console.log(`Backfill from ${minBackfillStart}`);

  const quotes = new Map<string, Quote>();
  const failures: HealthFailure[] = [];

  const masterResult = await fetchChart("SPY", "10y");
  let master: Quote | null = masterResult.quote;
  if (!master) {
    failures.push({ symbol: "SPY", message: masterResult.error ?? "no data" });
    console.warn("SPY failed, trying QQQ as the master calendar");
    const fallback = await fetchChart("QQQ", "10y");
    master = fallback.quote;
    if (!master) {
      failures.push({ symbol: "QQQ", message: fallback.error ?? "no data" });
      throw new Error(
        `Could not build a master calendar: ${failures
          .map((failure) => `${failure.symbol}: ${failure.message}`)
          .join("; ")}`,
      );
    }
  }
  quotes.set(master.symbol, master);

  const symbols = Array.from(
    new Set([
      master.symbol,
      ...configs.flatMap((config) => [
        ...config.constituents.map((constituent) => constituent.symbol),
        ...config.benchmarks,
      ]),
    ]),
  ).sort((a, b) => {
    if (a === master!.symbol) return -1;
    if (b === master!.symbol) return 1;
    return a.localeCompare(b);
  });

  console.log(`Fetching ${symbols.length} instruments`);
  let consecutiveFailures = 0;
  for (let i = 0; i < symbols.length; i += 1) {
    const symbol = symbols[i];
    if (quotes.has(symbol)) continue;
    const result = await fetchChart(symbol, "10y");
    if (result.quote) {
      quotes.set(symbol, result.quote);
      consecutiveFailures = 0;
      console.log(
        `  [${String(i + 1).padStart(3)}/${symbols.length}] ${symbol.padEnd(10)} ${result.quote.bars.length} bars${
          result.cached ? " (cache)" : ""
        }`,
      );
    } else {
      consecutiveFailures += 1;
      failures.push({
        symbol,
        message: result.error ?? "no data",
      });
      console.warn(
        `  [${String(i + 1).padStart(3)}/${symbols.length}] ${symbol.padEnd(10)} FAILED: ${result.error}`,
      );
      if (consecutiveFailures >= 5) {
        throw new Error(
          "Five consecutive instrument failures. Aborting so the last committed data stays live.",
        );
      }
    }
    if (!result.cached) await sleep(700);
    if (!result.cached && i > 0 && i % 50 === 0) await sleep(2_000);
  }

  const currencies = Array.from(
    new Set(
      Array.from(quotes.values())
        .map((quote) => (quote.currency === "GBp" ? "GBP" : quote.currency))
        .filter((currency) => currency && currency !== "USD"),
    ),
  ).sort();

  const fxQuotes = new Map<string, Quote>();
  for (const currency of currencies) {
    const pair = `${currency}USD=X`;
    const result = await fetchChart(pair, "10y");
    if (result.quote) {
      fxQuotes.set(currency, result.quote);
      console.log(`  FX ${pair.padEnd(10)} ${result.quote.bars.length} bars`);
    } else {
      failures.push({ symbol: pair, message: result.error ?? "no data" });
      console.warn(`  FX ${pair} FAILED: ${result.error}`);
    }
    if (!result.cached) await sleep(700);
  }

  if (fxQuotes.size !== currencies.length) {
    throw new Error(
      "Missing FX rates. Refusing to calculate cross-currency indexes with stale prices.",
    );
  }

  const masterDates = master.bars
    .map((bar) => bar.date)
    .filter((date) => date >= minBackfillStart);
  const asOf = masterDates[masterDates.length - 1] ?? null;
  if (!asOf) {
    throw new Error("Master calendar has no dates in the configured range");
  }

  console.log(`Master calendar: ${masterDates[0]} → ${asOf}`);
  fs.mkdirSync(INDEX_DIR, { recursive: true });

  const indexes: Manifest["indexes"] = [];
  const details: IndexDetail[] = [];
  const warnings: string[] = [];

  for (const config of configs) {
    const configDates = masterDates.filter(
      (date) => date >= config.backfillStart,
    );
    try {
      const result = calculateIndex(
        config,
        quotes,
        fxQuotes,
        configDates,
        asOf,
        generatedAt,
      );
      details.push(result.detail);
      indexes.push(result.summary);
      warnings.push(...result.warnings);
      console.log(
        `  ${config.name.padEnd(18)} base ${result.detail.baseDate} · ${result.summary.pricedCount}/${result.summary.constituentCount} priced · ${result.summary.status} · ${result.summary.liveDays}d live`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ symbol: config.slug, message });
      warnings.push(`${config.name}: ${message}`);
      console.error(`  ${config.name}: FAILED — ${message}`);
    }
  }

  if (!details.length) {
    throw new Error("No indexes could be calculated");
  }

  for (const detail of details) {
    fs.writeFileSync(
      path.join(INDEX_DIR, `${detail.slug}.json`),
      JSON.stringify(detail),
    );
  }

  const configured = new Set(details.map((detail) => `${detail.slug}.json`));
  for (const file of fs.readdirSync(INDEX_DIR)) {
    if (file.endsWith(".json") && !configured.has(file)) {
      fs.unlinkSync(path.join(INDEX_DIR, file));
      console.log(`  Removed stale data file ${file}`);
    }
  }

  const health: Health = {
    lastRun: generatedAt,
    asOf,
    source: "Yahoo Finance",
    indexCount: indexes.length,
    symbolCount: quotes.size,
    failures,
    warnings: Array.from(new Set(warnings)).sort(),
  };

  const manifest: Manifest = {
    generatedAt,
    asOf,
    indexes: indexes.sort(
      (a, b) => a.order - b.order || a.name.localeCompare(b.name),
    ),
    health,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "health.json"),
    JSON.stringify(health, null, 2),
  );

  console.log("");
  console.log(
    `Done: ${indexes.length} indexes, ${quotes.size} instruments, ${failures.length} failures`,
  );
  console.log(`As of ${asOf}`);
  if (failures.length) {
    console.log("Failures:");
    for (const failure of failures) {
      console.log(`  - ${failure.symbol}: ${failure.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
