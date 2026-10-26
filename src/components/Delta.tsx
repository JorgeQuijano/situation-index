import {
  arrowFor,
  classNames,
  formatPct,
  pctClass,
} from "../lib/format";

export default function Delta({
  value,
  digits = 2,
  showArrow = true,
  className,
  title,
}: {
  value: number | null | undefined;
  digits?: number;
  showArrow?: boolean;
  className?: string;
  title?: string;
}) {
  if (value == null || !Number.isFinite(value)) {
    return <span className={classNames("text-dim", className)}>—</span>;
  }
  const arrow = arrowFor(value);
  return (
    <span
      className={classNames("font-mono tabular", pctClass(value), className)}
      title={title}
    >
      {showArrow && arrow ? <span className="mr-0.5 text-[8px]">{arrow}</span> : null}
      {formatPct(value, digits)}
    </span>
  );
}
