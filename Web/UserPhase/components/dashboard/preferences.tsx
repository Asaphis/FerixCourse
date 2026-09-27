"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";

/* Lightweight toast queue used for optimistic-action feedback (mark read, etc). */

type Toast = { id: number; message: string; tone: "ok" | "danger" };

type ToastValue = { push: (message: string, tone?: "ok" | "danger") => void };

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: "ok" | "danger" = "ok") => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, message, tone }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fc-toasts" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className="fc-toast" role="status">
            <Icon name={t.tone === "ok" ? "checkCircle" : "alertCircle"} size={17} style={t.tone === "ok" ? undefined : { color: "var(--fc-danger-fg)" }} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/* ---------- Theme + motion preferences (real, persisted, applied) ---------- */

export type Prefs = { theme: "dark" | "light"; reduceMotion: boolean };

const PREFS_KEY = "fc_dash_prefs";

const defaultPrefs: Prefs = { theme: "dark", reduceMotion: false };

/*
  Preferences live in a CONTEXT, not in per-caller state.

  `usePrefs` used to be a bare hook with its own useState, so the Header toggle,
  the Profile switch and the shell root each held a separate copy. Flipping the
  toggle persisted to localStorage but never re-rendered the root, so the theme
  did not change until a reload. One provider keeps a single source of truth.
*/
type PrefsValue = { prefs: Prefs; update: (patch: Partial<Prefs>) => void; ready: boolean };

const PrefsContext = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Prefs>;
        setPrefs({
          theme: parsed.theme === "light" ? "light" : "dark",
          reduceMotion: Boolean(parsed.reduceMotion),
        });
      }
    } catch {
      /* first run or storage blocked — defaults are fine */
    }
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota/privacy errors */
      }
      return next;
    });
  }, []);

  const value = useMemo<PrefsValue>(() => ({ prefs, update, ready }), [prefs, update, ready]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return ctx;
}
