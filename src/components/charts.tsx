import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ChartBundle,
  ChartPoint,
  CompareBundle,
  DrawdownPoint,
  RangeKey,
  ReturnMode,
} from "../lib/chart";
import { buildChartData, buildDrawdown } from "../lib/chart";
import {
  formatDate,
  formatLevel,
  formatPct,
  classNames,
} from "../lib/format";
import {
  indexColorForTheme,
  useChartColors,
  useTheme,
} from "../lib/theme";
import type { IndexDetail } from "../lib/types";

type TooltipEntry = {
  dataKey?: string | number;
  value?: number | string | null;
  color?: string;
  payload?: ChartPoint;
};

type TooltipProps = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
};

function AxisTick({ x, y, payload, fill, showYear }: any) {
  return (
    <text
      x={x}
      y={y}
      dy={10}
      fill={fill}
      fontSize={9}
      fontFamily="var(--font-mono)"
      textAnchor="middle"
    >
      {payload?.value
        ? formatDate(String(payload.value), showYear ? "monthYear" : "short")
        : ""}
    </text>
  );
}

function IndexTooltip({
  active,
  payload,
  label,
  benchmark,
  colors,
}: TooltipProps & {
  benchmark: string;
  colors: ReturnType<typeof useChartColors>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const indexEntry = payload.find(
    (entry) => entry.dataKey === "live" || entry.dataKey === "backfill",
  );
  const benchmarkEntry = payload.find((entry) => entry.dataKey === "benchmark");
  const indexValue = indexEntry?.value;
  const benchmarkValue = benchmarkEntry?.value;

  return (
    <div className="chart-tooltip min-w-[190px]">
      <div className="flex items-center justify-between gap-4 border-b border-line pb-1.5">
        <span className="text-[9px] uppercase tracking-[0.08em] text-muted">
          {formatDate(String(label), "medium")}
        </span>
        {point.simulated && (
          <span className="sim-badge border-amber/40 text-amber">sim</span>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-4">
        <span className="text-muted">Index</span>
        <span className="font-medium text-ink">
          {indexValue == null ? "—" : formatLevel(Number(indexValue))}
        </span>
      </div>
      {benchmarkValue != null && (
        <div className="mt-1 flex items-center justify-between gap-4">
          <span className="text-muted">{benchmark}</span>
          <span style={{ color: colors.benchmark }}>
            {formatLevel(Number(benchmarkValue))}
          </span>
        </div>
      )}
      {benchmarkValue != null && indexValue != null && (
        <div className="mt-1 flex items-center justify-between gap-4 border-t border-line pt-1 text-[9px]">
          <span className="text-dim">Spread</span>
          <span className="text-muted">
            {formatPct(Number(indexValue) / Number(benchmarkValue) - 1, 2)}
          </span>
        </div>
      )}
    </div>
  );
}

export function IndexChart({
  detail,
  range,
  mode,
  benchmark,
  logScale = false,
  heightClass = "h-[300px] sm:h-[400px]",
  className,
  showLegend = true,
}: {
  detail: IndexDetail;
  range: RangeKey;
  mode: ReturnMode;
  benchmark: string;
  logScale?: boolean;
  heightClass?: string;
  className?: string;
  showLegend?: boolean;
}) {
  const { resolved } = useTheme();
  const colors = useChartColors();
  const indexColor = indexColorForTheme(detail.color, resolved);
  const bundle = useMemo(
    () => buildChartData(detail, range, mode, benchmark),
    [detail, range, mode, benchmark],
  );
  const hasBenchmark = bundle.points.some((point) => point.benchmark != null);
  const backfillCount = bundle.points.filter(
    (point) => point.backfill != null,
  ).length;
  const liveCount = bundle.points.filter((point) => point.live != null).length;
  const baseInRange = bundle.points.some(
    (point) => point.date === detail.baseDate,
  );

  if (!bundle.points.length) {
    return (
      <div className={classNames("flex items-center justify-center text-[11px] text-muted", heightClass)}>
        No data in this range.
      </div>
    );
  }

  return (
    <div className={classNames("min-w-0", className)}>
      <div className={heightClass}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={bundle.points}
            margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              stroke={colors.grid}
              strokeDasharray="2 4"
              vertical={false}
            />
            {baseInRange && backfillCount > 1 && (
              <ReferenceArea
                x1={bundle.points[0].date}
                x2={detail.baseDate}
                fill={colors.amber}
                fillOpacity={0.035}
                stroke="none"
              />
            )}
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={
                <AxisTick
                  fill={colors.axis}
                  showYear={range === "MAX" || range === "1Y"}
                />
              }
              minTickGap={48}
              interval="preserveStartEnd"
            />
            <YAxis
              width={48}
              axisLine={false}
              tickLine={false}
              scale={logScale ? "log" : "linear"}
              domain={["auto", "auto"]}
              allowDataOverflow
              tick={{
                fill: colors.axis,
                fontSize: 9,
                fontFamily: "var(--font-mono)",
              }}
              tickFormatter={(value: number) =>
                Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
              }
            />
            <Tooltip
              content={
                <IndexTooltip benchmark={benchmark} colors={colors} />
              }
              cursor={{ stroke: colors.axis, strokeDasharray: "2 3" }}
            />
            <ReferenceLine
              y={100}
              stroke={colors.grid}
              strokeDasharray="2 4"
            />
            {baseInRange && (
              <ReferenceLine
                x={detail.baseDate}
                stroke={colors.axis}
                strokeDasharray="2 3"
              />
            )}
            {bundle.eventDate && (
              <ReferenceLine
                x={bundle.eventDate}
                stroke={colors.amber}
                strokeDasharray="3 3"
                label={{
                  value: "EVENT",
                  position: "insideTopRight",
                  fill: colors.amber,
                  fontSize: 8,
                  fontFamily: "var(--font-mono)",
                }}
              />
            )}
            {hasBenchmark && (
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke={colors.benchmark}
                strokeWidth={1}
                strokeDasharray="2 3"
                dot={false}
                activeDot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            {backfillCount > 0 && (
              <Line
                type="monotone"
                dataKey="backfill"
                stroke={indexColor}
                strokeWidth={1.3}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 2.5, fill: indexColor, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {liveCount > 0 && (
              <Line
                type="monotone"
                dataKey="live"
                stroke={indexColor}
                strokeWidth={1.6}
                dot={
                  liveCount <= 2
                    ? { r: 2.5, fill: indexColor, strokeWidth: 0 }
                    : false
                }
                activeDot={{ r: 3, fill: indexColor, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {showLegend && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-[2px] w-4"
              style={{ background: indexColor }}
            />
            Index
          </span>
          {backfillCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-0 w-4 border-t border-dashed"
                style={{ borderColor: indexColor }}
              />
              Simulated backfill
            </span>
          )}
          {hasBenchmark && (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-0 w-4 border-t border-dashed"
                style={{ borderColor: colors.benchmark }}
              />
              {benchmark}
            </span>
          )}
          <span className="ml-auto text-dim">
            Base 100 · {bundle.seriesLabel}
          </span>
        </div>
      )}
    </div>
  );
}

type DrawdownTooltipProps = {
  active?: boolean;
  payload?: Array<{ value?: number | string | null; payload?: DrawdownPoint }>;
  label?: string | number;
};

function DrawdownTooltip({ active, payload, label }: DrawdownTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <div className="chart-tooltip">
      <div className="text-[9px] uppercase tracking-[0.08em] text-muted">
        {formatDate(String(label), "medium")}
      </div>
      <div className="mt-1 text-down">
        {value == null ? "—" : formatPct(Number(value), 2)}
      </div>
    </div>
  );
}

export function DrawdownChart({
  detail,
  range,
  mode,
  heightClass = "h-[210px] sm:h-[250px]",
}: {
  detail: IndexDetail;
  range: RangeKey;
  mode: ReturnMode;
  heightClass?: string;
}) {
  const colors = useChartColors();
  const data = useMemo(
    () => buildDrawdown(detail, range, mode),
    [detail, range, mode],
  );
  return (
    <div className={heightClass}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="drawdown-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.down} stopOpacity={0.2} />
              <stop offset="100%" stopColor={colors.down} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={colors.grid}
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={
              <AxisTick
                fill={colors.axis}
                showYear={range === "MAX" || range === "1Y"}
              />
            }
            minTickGap={44}
            interval="preserveStartEnd"
          />
          <YAxis
            width={42}
            axisLine={false}
            tickLine={false}
            domain={["auto", 0]}
            tick={{
              fill: colors.axis,
              fontSize: 9,
              fontFamily: "var(--font-mono)",
            }}
            tickFormatter={(value: number) => `${(value * 100).toFixed(0)}%`}
          />
          <Tooltip content={<DrawdownTooltip />} cursor={{ stroke: colors.axis, strokeDasharray: "2 3" }} />
          <ReferenceLine y={0} stroke={colors.grid} />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke={colors.down}
            strokeWidth={1}
            fill="url(#drawdown-fill)"
            isAnimationActive={false}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

type CompareTooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | string | null;
    payload?: Record<string, number | string | null>;
  }>;
  label?: string | number;
  bundle: CompareBundle;
  colors: ReturnType<typeof useChartColors>;
  resolved: "terminal" | "paper";
};

function CompareTooltip({
  active,
  payload,
  label,
  bundle,
  colors,
  resolved,
}: CompareTooltipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((entry) => entry.value != null);
  if (!rows.length) return null;
  return (
    <div className="chart-tooltip min-w-[190px]">
      <div className="border-b border-line pb-1.5 text-[9px] uppercase tracking-[0.08em] text-muted">
        {formatDate(String(label), "medium")}
      </div>
      <div className="mt-1.5 space-y-1">
        {rows.map((entry) => {
          const series = bundle.series.find(
            (item) => item.id === entry.dataKey,
          );
          const color = series
            ? indexColorForTheme(series.color, resolved)
            : colors.amber;
          return (
            <div
              key={String(entry.dataKey)}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-1.5 text-muted">
                <span
                  className={
                    series?.dashed
                      ? "inline-block h-0 w-3 border-t border-dashed"
                      : "inline-block h-1.5 w-1.5"
                  }
                  style={
                    series?.dashed
                      ? { borderColor: color }
                      : { background: color }
                  }
                />
                {series?.name ?? entry.dataKey}
              </span>
              <span className="text-ink">
                {entry.value == null ? "—" : formatLevel(Number(entry.value))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompareChart({
  bundle,
  showYear = false,
  heightClass = "h-[320px] sm:h-[460px]",
}: {
  bundle: CompareBundle;
  showYear?: boolean;
  heightClass?: string;
}) {
  const { resolved } = useTheme();
  const colors = useChartColors();
  if (!bundle.data.length) {
    return (
      <div className={classNames("flex items-center justify-center text-[11px] text-muted", heightClass)}>
        Select at least one basket or benchmark.
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <div className={heightClass}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={bundle.data}
            margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              stroke={colors.grid}
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={<AxisTick fill={colors.axis} showYear={showYear} />}
              minTickGap={48}
              interval="preserveStartEnd"
            />
            <YAxis
              width={48}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
              tick={{
                fill: colors.axis,
                fontSize: 9,
                fontFamily: "var(--font-mono)",
              }}
              tickFormatter={(value: number) =>
                Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
              }
            />
            <Tooltip
              content={
                <CompareTooltip
                  bundle={bundle}
                  colors={colors}
                  resolved={resolved}
                />
              }
              cursor={{ stroke: colors.axis, strokeDasharray: "2 3" }}
            />
            <ReferenceLine
              y={100}
              stroke={colors.grid}
              strokeDasharray="2 4"
            />
            {bundle.series.map((series) => (
              <Line
                key={series.id}
                type="monotone"
                dataKey={series.id}
                name={series.name}
                stroke={indexColorForTheme(series.color, resolved)}
                strokeWidth={series.dashed ? 1.1 : 1.5}
                strokeDasharray={series.dashed ? "4 3" : undefined}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[8px] uppercase tracking-[0.08em] text-muted">
        {bundle.series.map((series) => (
          <span key={series.id} className="flex items-center gap-1.5">
            <span
              className={
                series.dashed
                  ? "inline-block h-0 w-4 border-t border-dashed"
                  : "inline-block h-[2px] w-4"
              }
              style={
                series.dashed
                  ? {
                      borderColor: indexColorForTheme(series.color, resolved),
                    }
                  : {
                      background: indexColorForTheme(series.color, resolved),
                    }
              }
            />
            {series.name}
          </span>
        ))}
        <span className="ml-auto text-dim">
          {bundle.normalization === "range"
            ? "Rebased at first available in range"
            : "Indexes at own inception · benchmarks at range start"}
        </span>
      </div>
    </div>
  );
}
