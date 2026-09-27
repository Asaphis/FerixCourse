"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "./admin";

/*
  Data hooks for the console.

  Two rules this project learned the hard way:
    1. A failed request must never be rendered as "you have nothing". Every
       hook separates `error` from an empty result so the UI can show a retry
       instead of a misleading empty state.
    2. Never re-render a component for a request that already unmounted.
*/

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
  reload: () => void;
  setData: (next: T | null) => void;
};

/** Fetch-on-mount with a manual retry. `path` may be null to stay idle. */
export function useAdmin<T = any>(path: string | null, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    adminFetch<T>(path)
      .then((d) => {
        if (alive.current) setData(d);
      })
      .catch((e: unknown) => {
        if (alive.current) {
          setData(null);
          setError(e instanceof Error ? e.message : "Request failed.");
        }
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload, setData };
}

export type MutationState = {
  run: (...args: any[]) => Promise<any>;
  pending: boolean;
  error: string;
  reset: () => void;
};

/** For writes. Keeps the last error so callers can render it inline. */
export function useAdminMutation<A extends any[], R>(
  fn: (...args: A) => Promise<R>
): MutationState {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      setPending(true);
      setError("");
      try {
        return await fn(...args);
      } catch (e: unknown) {
        if (alive.current) setError(e instanceof Error ? e.message : "Request failed.");
        return undefined;
      } finally {
        if (alive.current) setPending(false);
      }
    },
    [fn]
  );

  const reset = useCallback(() => setError(""), []);
  return { run, pending, error, reset };
}

/** Poll an endpoint on an interval — used by the live control room. */
export function useAdminPoll<T = any>(path: string | null, ms: number): AsyncState<T> {
  const state = useAdmin<T>(path);
  const reloadRef = useRef(state.reload);
  reloadRef.current = state.reload;

  useEffect(() => {
    if (!path || ms <= 0) return;
    const id = setInterval(() => reloadRef.current(), ms);
    return () => clearInterval(id);
  }, [path, ms]);

  return state;
}
