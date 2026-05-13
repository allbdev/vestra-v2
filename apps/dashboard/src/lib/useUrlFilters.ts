import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export interface UrlFilterAccessor<T> {
  read: (params: URLSearchParams) => T;
  write: (params: URLSearchParams, value: T) => void;
}

export function stringParam(key: string, fallback = ""): UrlFilterAccessor<string> {
  return {
    read: (p) => p.get(key) ?? fallback,
    write: (p, v) => {
      if (!v) p.delete(key);
      else p.set(key, v);
    },
  };
}

export function listParam(key: string): UrlFilterAccessor<string[]> {
  return {
    read: (p) => {
      const raw = p.get(key);
      if (!raw) return [];
      return raw.split(",").filter(Boolean);
    },
    write: (p, v) => {
      if (!v || v.length === 0) p.delete(key);
      else p.set(key, v.join(","));
    },
  };
}

export function useUrlFilters<T extends Record<string, UrlFilterAccessor<any>>>(
  accessors: T,
): {
  values: { [K in keyof T]: ReturnType<T[K]["read"]> };
  set: <K extends keyof T>(key: K, value: ReturnType<T[K]["read"]>) => void;
  patch: (partial: Partial<{ [K in keyof T]: ReturnType<T[K]["read"]> }>) => void;
  clearAll: () => void;
} {
  const [params, setParams] = useSearchParams();

  const values = useMemo(() => {
    const out = {} as { [K in keyof T]: ReturnType<T[K]["read"]> };
    for (const k in accessors) {
      const acc = accessors[k];
      if (acc) out[k] = acc.read(params);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const set = useCallback(
    <K extends keyof T>(key: K, value: ReturnType<T[K]["read"]>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const acc = accessors[key];
          if (acc) acc.write(next, value);
          return next;
        },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  );

  const patch = useCallback(
    (partial: Partial<{ [K in keyof T]: ReturnType<T[K]["read"]> }>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const k in partial) {
            const acc = accessors[k as keyof T];
            if (acc) acc.write(next, partial[k as keyof T] as never);
          }
          return next;
        },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  );

  const clearAll = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const k in accessors) next.delete(k);
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setParams]);

  return { values, set, patch, clearAll };
}
