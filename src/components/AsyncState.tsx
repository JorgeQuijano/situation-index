import { Link } from "react-router-dom";
import { AlertTriangle, RotateCcw } from "lucide-react";

export function LoadingPanel({
  className = "h-72",
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`panel skeleton flex items-center justify-center ${className}`}
      aria-busy="true"
      aria-label={label}
    />
  );
}

export function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="panel flex flex-col items-start gap-3 border-down/40 p-5">
      <div className="flex items-center gap-2 text-down">
        <AlertTriangle size={15} />
        <span className="font-mono text-[10px] uppercase tracking-[0.1em]">
          Data unavailable
        </span>
      </div>
      <p className="text-[12px] text-muted">{message}</p>
      <div className="flex items-center gap-4">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 border border-line px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted hover:border-amber hover:text-amber"
          >
            <RotateCcw size={11} />
            Retry
          </button>
        )}
        <Link
          to="/methodology"
          className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted underline underline-offset-2 hover:text-amber"
        >
          Data notes
        </Link>
      </div>
    </div>
  );
}
