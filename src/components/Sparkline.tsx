import { classNames, pctTone } from "../lib/format";

type Tone = "up" | "down" | "flat";

export default function Sparkline({
  values,
  width = 120,
  height = 32,
  className,
  strokeWidth = 1.3,
  fill = true,
  tone,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
  fill?: boolean;
  tone?: Tone;
}) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={classNames("text-dim", className)}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.6}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const pad = 2;
  const usable = height - pad * 2;
  const points = clean.map((value, index) => {
    const x = (index / (clean.length - 1)) * width;
    const y = pad + (1 - (value - min) / range) * usable;
    return [x, y] as const;
  });
  const path = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  const resolvedTone =
    tone ?? pctTone(clean[clean.length - 1] - clean[0]);
  const colorClass =
    resolvedTone === "up"
      ? "text-up"
      : resolvedTone === "down"
        ? "text-down"
        : "text-muted";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={classNames(colorClass, className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {fill && <path d={area} fill="currentColor" opacity={0.08} />}
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
