import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { IndexDetail, Manifest } from "./types";

const BASE = import.meta.env.BASE_URL;

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    signal,
    cache: "no-cache",
  });
  if (!response.ok) {
    throw new Error(`Data request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function getManifest(signal?: AbortSignal) {
  return getJson<Manifest>("data/manifest.json", signal);
}

export function getIndexDetail(slug: string, signal?: AbortSignal) {
  return getJson<IndexDetail>(`data/indexes/${slug}.json`, signal);
}

type ManifestContextValue = {
  manifest: Manifest | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const ManifestContext = createContext<ManifestContextValue | null>(null);

export function ManifestProvider({ children }: { children: ReactNode }) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getManifest(controller.signal)
      .then((data) => {
        setManifest(data);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Unknown error");
        setLoading(false);
      });
    return () => controller.abort();
  }, [version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  const value = useMemo(
    () => ({ manifest, loading, error, reload }),
    [manifest, loading, error, reload],
  );

  return (
    <ManifestContext.Provider value={value}>
      {children}
    </ManifestContext.Provider>
  );
}

export function useManifest() {
  const context = useContext(ManifestContext);
  if (!context) {
    throw new Error("useManifest must be used inside ManifestProvider");
  }
  return context;
}

export function useIndexDetail(slug: string | null | undefined) {
  const [detail, setDetail] = useState<IndexDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setDetail(null);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setDetail(null);
    getIndexDetail(slug, controller.signal)
      .then((data) => {
        setDetail(data);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Unknown error");
        setLoading(false);
      });
    return () => controller.abort();
  }, [slug]);

  return { detail, loading, error };
}

export function useIndexDetails(slugs: string[] | null) {
  const key = slugs?.join("|") ?? "";
  const [details, setDetails] = useState<Record<string, IndexDetail>>({});
  const [loading, setLoading] = useState(Boolean(slugs?.length));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugs?.length) {
      setDetails({});
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all(
      slugs.map((slug) => getIndexDetail(slug, controller.signal)),
    )
      .then((items) => {
        setDetails(Object.fromEntries(items.map((item) => [item.slug, item])));
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Unknown error");
        setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { details, loading, error };
}
