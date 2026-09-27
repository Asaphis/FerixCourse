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

export function usePrefs() {
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

  return { prefs, update, ready };
}
