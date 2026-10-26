import { Link } from "react-router-dom";
import { useDocumentTitle } from "../lib/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Not found");
  return (
    <div className="panel mx-auto max-w-xl p-8 text-center">
      <div className="kicker kicker-amber">404 · Ticker not found</div>
      <h1 className="display mt-3 text-[42px] leading-none text-ink">
        OFF THE BOARD
      </h1>
      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        This route is not part of the index board. It may have been renamed, or
        the link may be stale.
      </p>
      <Link
        to="/"
        className="mt-5 inline-flex items-center gap-1.5 border border-amber bg-amber-soft px-3 py-2 font-mono text-[9px] uppercase tracking-[0.08em] text-amber hover:bg-amber hover:text-black"
      >
        Back to the board
      </Link>
    </div>
  );
}
