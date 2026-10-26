export function addDays(iso: string, days: number) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function formatPct(
  value: number | null | undefined,
  digits = 2,
  showSign = true,
) {
  if (value == null || !Number.isFinite(value)) return "—";
  const pct = value * 100;
  const prefix = showSign && pct > 0 ? "+" : "";
  return `${prefix}${pct.toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatLevel(value: number | null | undefined) {
  return formatNumber(value, 2);
}

export function formatPrice(
  value: number | null | undefined,
  currency?: string | null,
) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (currency === "GBp") return `${formatNumber(value, 2)}p`;
  const code = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${formatNumber(value, 2)} ${code}`;
  }
}

export function formatDate(
  iso: string | null | undefined,
  style: "short" | "medium" | "long" | "monthYear" = "medium",
) {
  if (!iso) return "—";
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  if (style === "short") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      timeZone: "UTC",
    })
      .format(date)
      .toUpperCase();
  }
  if (style === "monthYear") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    })
      .format(date)
      .toUpperCase();
  }
  if (style === "long") {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(date)
    .toUpperCase();
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatCompactDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  })
    .format(date)
    .toUpperCase()
    .replace(",", "");
}

export function formatCoverage(priced: number, total: number) {
  return `${priced}/${total}`;
}

export function pctTone(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value === 0) return "flat";
  return value > 0 ? "up" : "down";
}

export function pctClass(value: number | null | undefined) {
  const tone = pctTone(value);
  if (tone === "up") return "text-up";
  if (tone === "down") return "text-down";
  return "text-muted";
}

export function arrowFor(value: number | null | undefined) {
  if (value == null || value === 0) return "";
  return value > 0 ? "▲" : "▼";
}

export function daysBetween(a: string, b: string) {
  return (
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) /
    86_400_000
  );
}

export function classNames(
  ...values: Array<string | false | null | undefined>
) {
  return values.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
