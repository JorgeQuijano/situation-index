import { describe, expect, it } from "vitest";
import type {
  Bar,
  IndexConfig,
  Quote,
} from "../../src/lib/types";
import { addDays, calculateIndex } from "./calc";

function makeBar(date: string, close: number, adjClose = close): Bar {
  return {
    date,
    open: close,
    high: close,
    low: close,
    close,
    adjClose,
    volume: 1_000,
  };
}

function makeQuote(
  symbol: string,
  rows: Array<[string, number, number?]>,
  currency = "USD",
): Quote {
  return {
    symbol,
    name: symbol,
    currency,
    exchange: "TEST",
    timezone: "America/New_York",
    bars: rows.map(([date, close, adj]) => makeBar(date, close, adj)),
  };
}

function makeConfig(overrides: Partial<IndexConfig> = {}): IndexConfig {
  return {
    name: "Test Basket",
    slug: "test-basket",
    order: 1,
    created: "2024-01-02",
    inception: "2024-01-02",
    eventDate: null,
    eventLabel: null,
    backfillStart: "2024-01-02",
    minCoverage: 0.6,
    benchmark: "SPY",
    benchmarks: ["SPY"],
    color: "#ffb000",
    note: "",
    constituents: [
      { symbol: "AAA", ticker: "AAA", name: "AAA" },
      { symbol: "BBB", ticker: "BBB", name: "BBB" },
    ],
    ...overrides,
  };
}

function run(
  config: IndexConfig,
  quotes: Map<string, Quote>,
  dates = ["2024-01-02", "2024-01-03", "2024-01-04"],
  fx = new Map<string, Quote>(),
) {
  return calculateIndex(
    config,
    quotes,
    fx,
    dates,
    dates[dates.length - 1],
    "2024-01-04T23:00:00.000Z",
  );
}

describe("calculateIndex", () => {
  it("averages daily returns equally", () => {
    const quotes = new Map([
      [
        "AAA",
        makeQuote("AAA", [
          ["2024-01-02", 100],
          ["2024-01-03", 110],
          ["2024-01-04", 121],
        ]),
      ],
      [
        "BBB",
        makeQuote("BBB", [
          ["2024-01-02", 100],
          ["2024-01-03", 90],
          ["2024-01-04", 81],
        ]),
      ],
    ]);
    const { detail } = run(makeConfig(), quotes);
    expect(detail.levels).toEqual([100, 100, 100]);
    expect(detail.baseDate).toBe("2024-01-02");
    expect(detail.meta.liveDays).toBe(2);
  });

  it("uses adjusted close for total return and close for price return", () => {
    const quotes = new Map([
      [
        "AAA",
        makeQuote("AAA", [
          ["2024-01-02", 100, 100],
          ["2024-01-03", 100, 120],
          ["2024-01-04", 100, 144],
        ]),
      ],
      [
        "BBB",
        makeQuote("BBB", [
          ["2024-01-02", 100, 100],
          ["2024-01-03", 100, 100],
          ["2024-01-04", 100, 100],
        ]),
      ],
    ]);
    const { detail } = run(makeConfig(), quotes);
    expect(detail.levels).toEqual([100, 110, 121]);
    expect(detail.priceLevels).toEqual([100, 100, 100]);
    expect(detail.levels[1]).not.toBe(detail.priceLevels[1]);
  });

  it("normalizes the backfilled series to 100 at inception", () => {
    const quotes = new Map([
      [
        "AAA",
        makeQuote("AAA", [
          ["2024-01-02", 100],
          ["2024-01-03", 120],
          ["2024-01-04", 144],
        ]),
      ],
      [
        "BBB",
        makeQuote("BBB", [
          ["2024-01-02", 100],
          ["2024-01-03", 100],
          ["2024-01-04", 100],
        ]),
      ],
    ]);
    const config = makeConfig({
      inception: "2024-01-03",
      backfillStart: "2024-01-02",
    });
    const { detail } = run(config, quotes);
    expect(detail.baseDate).toBe("2024-01-03");
    expect(detail.levels[1]).toBe(100);
    expect(detail.levels[0]).toBeCloseTo(90.909, 3);
    expect(detail.levels[2]).toBe(110);
  });

  it("handles missing constituents and reports coverage", () => {
    const quotes = new Map([
      [
        "AAA",
        makeQuote("AAA", [
          ["2024-01-02", 100],
          ["2024-01-03", 101],
          ["2024-01-04", 102],
        ]),
      ],
    ]);
    const { detail, summary, warnings } = run(makeConfig(), quotes);
    expect(detail.meta.pricedCount).toBe(1);
    expect(detail.meta.missingCount).toBe(1);
    expect(detail.coverage.at(-1)).toBe(1);
    expect(summary.coveragePct).toBe(0.5);
    expect(warnings.some((warning) => warning.includes("BBB"))).toBe(true);
  });

  it("converts foreign currency prices to USD", () => {
    const quotes = new Map([
      [
        "AAA",
        makeQuote(
          "AAA",
          [
            ["2024-01-02", 100],
            ["2024-01-03", 100],
          ],
          "EUR",
        ),
      ],
      [
        "BBB",
        makeQuote("BBB", [
          ["2024-01-02", 100],
          ["2024-01-03", 100],
        ]),
      ],
    ]);
    const fx = new Map([
      [
        "EUR",
        makeQuote(
          "EURUSD=X",
          [
            ["2024-01-02", 1],
            ["2024-01-03", 1.1],
          ],
          "USD",
        ),
      ],
    ]);
    const { detail } = run(makeConfig(), quotes, undefined, fx);
    expect(detail.levels[1]).toBeCloseTo(105, 4);
  });

  it("adds calendar days without timezone drift", () => {
    expect(addDays("2024-03-01", 1)).toBe("2024-03-02");
    expect(addDays("2024-12-31", 1)).toBe("2025-01-01");
  });
});
