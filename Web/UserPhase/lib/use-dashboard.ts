"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthError } from "./dashboard-api";

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
  /** True when the request failed because the session is gone. */
  unauthenticated: boolean;
  reload: () => void;
};

/**
 * One fetch-on-mount hook with consistent loading / error / auth handling, so
 * every panel behaves the same instead of re-implementing useEffect + try/catch.
 * `fn` is held in a ref, so an inline arrow does not retrigger the request.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fnRef
      .current()
      .then((res) => {
        if (!alive) return;
        setData(res);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        if (e instanceof AuthError) setUnauthenticated(true);
        setError(e instanceof Error ? e.message : "Something went wrong.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, unauthenticated, reload };
}

/**
 * Runs a mutating call (POST) with pending + error state.
 */
export function useMutation<Args extends unknown[], R>(fn: (...args: Args) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (...args: Args): Promise<R | null> => {
    setPending(true);
    setError("");
    try {
      return await fnRef.current(...args);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return null;
    } finally {
      setPending(false);
    }
  }, []);

  const clear = useCallback(() => setError(""), []);
  return { run, pending, error, clear };
}

/** Live-updating "x minutes ago" for lists, so timestamps never go stale. */
export function useNow(intervalMs = 60000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/**
 * Course progress from real lesson_progress rows.
 * Lesson content (video, materials) lives behind /scope, so progress is read
 * from the authoritative endpoint for each enrolled course.
 */
export type CourseProgress = { courseId: string; completed: number; total: number; pct: number; nextLesson: { id: string; title: string } | null };

export function useCoursesProgress(courseIds: string[]): {
  progress: Record<string, CourseProgress>;
  loading: boolean;
} {
  const [progress, setProgress] = useState<Record<string, CourseProgress>>({});
  const [loading, setLoading] = useState(courseIds.length > 0);
  const key = courseIds.join(",");

  useEffect(() => {
    if (!courseIds.length) {
      setProgress({});
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    // Imported lazily to keep this hook dependency-free at module scope.
    import("./dashboard-api")
      .then(({ api }) => Promise.all(courseIds.map((id) => api.courseLearn(id).then((d) => ({ id, d })).catch(() => null))))
      .then((results) => {
        if (!alive) return;
        const next: Record<string, CourseProgress> = {};
        for (const r of results) {
          if (!r) continue;
          const lessons = (r.d.sections ?? []).flatMap((s) => s.lessons ?? []);
          const done = lessons.filter((l) => l.completed).length;
          const firstOpen = lessons.find((l) => !l.completed) ?? null;
          next[r.id] = {
            courseId: r.id,
            completed: done,
            total: lessons.length,
            pct: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
            nextLesson: firstOpen ? { id: firstOpen.id, title: firstOpen.title } : null,
          };
        }
        setProgress(next);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { progress, loading };
}
