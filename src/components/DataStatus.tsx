import { Link } from "react-router-dom";
import { useManifest } from "../lib/api";
import { formatDate, formatDateTime } from "../lib/format";

export default function DataStatus() {
  const { manifest, loading, error } = useManifest();

  if (loading) {
    return (
      <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
        <span className="status-dot" data-tone="warn" />
        <span className="hidden sm:inline">Syncing</span>
      </span>
    );
  }

  if (error || !manifest) {
    return (
      <Link
        to="/methodology"
        className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-down"
        title={error ?? "No data loaded"}
      >
        <span className="status-dot" data-tone="bad" />
        <span className="hidden sm:inline">Data error</span>
      </Link>
    );
  }

  const health = manifest.health;
  const tone =
    health.failures.length > 0
      ? "bad"
      : health.warnings.length > 0
        ? "warn"
        : "ok";
  const title = [
    `As of ${manifest.asOf ?? "unknown"}`,
    `Last run ${formatDateTime(health.lastRun)}`,
    `${health.indexCount} indexes / ${health.symbolCount} instruments`,
    health.failures.length ? `${health.failures.length} failures` : "",
    health.warnings.length ? `${health.warnings.length} warnings` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      to="/methodology"
      className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted hover:text-ink"
      title={title}
    >
      <span className="status-dot" data-tone={tone} />
      <span className="hidden sm:inline">
        Data {formatDate(manifest.asOf, "short")}
      </span>
    </Link>
  );
}
