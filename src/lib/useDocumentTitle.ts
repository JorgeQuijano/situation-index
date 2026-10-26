import { useEffect } from "react";

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Situation Index` : "Situation Index";
    return () => {
      document.title = "Situation Index";
    };
  }, [title]);
}
