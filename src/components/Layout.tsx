import { Link, NavLink } from "react-router-dom";
import { ArrowUpRight, Code2 } from "lucide-react";
import type { ReactNode } from "react";
import { useManifest } from "../lib/api";
import { formatDate } from "../lib/format";
import DataStatus from "./DataStatus";
import ThemeSelector from "./ThemeSelector";
import TickerTape from "./TickerTape";

const NAV = [
  { to: "/", label: "Indexes", end: true },
  { to: "/compare", label: "Compare" },
  { to: "/methodology", label: "Methodology" },
];

function BrandMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7 shrink-0"
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="23" height="23" fill="var(--panel-2)" stroke="var(--line-strong)" />
      <path d="M5 18V9h2.4v9H5zm4.1 0V6h2.4v12H9.1zm4.1 0v-5.2h2.4V18h-2.4zm4.1 0V3.6h2.4V18h-2.4z" fill="var(--amber)" />
    </svg>
  );
}

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "border-b-2 px-0.5 py-[18px] font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
          isActive
            ? "border-amber text-amber"
            : "border-transparent text-muted hover:text-ink",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { manifest } = useManifest();
  const health = manifest?.health;
  const alertCount =
    (health?.failures.length ?? 0) + (health?.warnings.length ?? 0);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-40">
        <header className="border-b border-line bg-bg/95 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
            <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <BrandMark />
              <span className="min-w-0">
                <span className="block truncate font-mono text-[12px] font-semibold leading-none tracking-[0.1em] text-ink sm:text-[14px] sm:tracking-[0.16em]">
                  SITUATION<span className="text-amber">INDEX</span>
                </span>
                <span className="mt-1 hidden truncate font-mono text-[8px] uppercase leading-none tracking-[0.24em] text-muted sm:block">
                  Custom market baskets
                </span>
              </span>
            </Link>

            <nav className="hidden h-full items-center gap-7 md:flex" aria-label="Primary">
              {NAV.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <DataStatus />
              <ThemeSelector />
            </div>
          </div>

          <nav
            className="tape-scroll flex items-center gap-6 overflow-x-auto border-t border-line px-4 py-2 md:hidden"
            aria-label="Primary mobile"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "shrink-0 border-b pb-1 font-mono text-[10px] uppercase tracking-[0.12em]",
                    isActive
                      ? "border-amber text-amber"
                      : "border-transparent text-muted",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <TickerTape />
        {alertCount > 0 && (
          <div className="border-b border-line bg-amber-soft">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-1.5 sm:px-6 lg:px-8">
              <span className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-amber">
                Data note · {health?.warnings[0] ?? health?.failures[0]?.message}
              </span>
              <Link
                to="/methodology"
                className="shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-amber underline underline-offset-2"
              >
                Details
              </Link>
            </div>
          </div>
        )}
      </div>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
        {children}
      </main>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-7 sm:px-6 md:grid-cols-[1fr_auto_auto] lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <BrandMark />
              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-ink">
                SITUATION<span className="text-amber">INDEX</span>
              </span>
            </div>
            <p className="mt-2 max-w-md text-[11px] leading-relaxed text-muted">
              A personal terminal for custom equal-weight baskets, built around
              a market situation. Live data where it exists; clearly marked
              simulation where it does not.
            </p>
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
              Not investment advice. Backfilled history is simulated.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="kicker">Terminal</span>
            <Link to="/" className="text-[11px] text-muted hover:text-amber">
              Index board
            </Link>
            <Link to="/compare" className="text-[11px] text-muted hover:text-amber">
              Compare
            </Link>
            <Link
              to="/methodology"
              className="text-[11px] text-muted hover:text-amber"
            >
              Methodology
            </Link>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="kicker">Source</span>
            <a
              href="https://github.com/JorgeQuijano/situation-index"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-muted hover:text-amber"
            >
              <Code2 size={12} />
              GitHub
              <ArrowUpRight size={10} />
            </a>
            <a
              href="https://x.com/speculator_io"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-muted hover:text-amber"
            >
              Inspired by @speculator_io
              <ArrowUpRight size={10} />
            </a>
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
              Data {formatDate(manifest?.asOf, "short")} · Yahoo Finance
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
