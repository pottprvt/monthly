"use client";

import { useCallback, useEffect, useState } from "react";

export type TelegramStatus =
  | { status: "loading" }
  | { status: "not_configured" }
  | { status: "needs_setup" }
  | { status: "connected"; title: string }
  | { status: "error"; title: string; error?: string };

/** Telegram connection of a plan. `watch` polls every 3 s, e.g. while the creator is adding the bot. */
export function useTelegramStatus(plan: string | null, watch = false) {
  const [state, setState] = useState<TelegramStatus>({ status: "loading" });

  const load = useCallback(async () => {
    if (!plan) return;
    try {
      setState((await (await fetch(`/api/integrations/telegram/status?plan=${plan}`)).json()) as TelegramStatus);
    } catch {
      // keep the previous state; the next poll retries
    }
  }, [plan]);

  useEffect(() => {
    let active = true;
    const run = () => {
      if (active) void load();
    };
    run();
    if (!watch) {
      return () => {
        active = false;
      };
    }
    const timer = window.setInterval(run, 3_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [load, watch]);

  return state;
}

/** Asks the server to re-check community access after a cancel, resume or plan close. */
export function refreshAccess(target: { subscription?: string; plan?: string }) {
  void fetch("/api/access/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(target),
  }).catch(() => undefined);
}
