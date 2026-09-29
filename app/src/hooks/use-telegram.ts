"use client";

import { useCallback, useEffect, useState } from "react";

export type TelegramStatus =
  | { status: "loading" }
  | { status: "unavailable" }
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
      const res = await fetch(`/api/integrations/telegram/status?plan=${plan}`);
      if (!res.ok) throw new Error(String(res.status));
      setState((await res.json()) as TelegramStatus);
    } catch {
      setState((prev) => (prev.status === "loading" ? { status: "unavailable" } : prev));
    }
  }, [plan]);

  useEffect(() => {
    let active = true;
    const run = () => {
      if (active) void load();
    };
    run();
    if (!watch || state.status === "connected") {
      return () => {
        active = false;
      };
    }
    const timer = window.setInterval(run, 3_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [load, watch, state.status]);

  return state;
}

export type MemberAccess = "pending" | "granted" | "revoked" | null;

/** The signed-in member's own access state for a plan (null when unknown or not linked yet). */
export function useMemberAccess(plan: string | null, enabled: boolean): MemberAccess {
  const [state, setState] = useState<MemberAccess>(null);
  useEffect(() => {
    if (!plan || !enabled) return;
    let active = true;
    fetch(`/api/integrations/telegram/me?plan=${plan}`)
      .then((r) => r.json() as Promise<{ state: MemberAccess }>)
      .then((d) => active && setState(d.state))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [plan, enabled]);
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
