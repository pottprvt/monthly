"use client";

import { useEffect, useRef } from "react";

import { requestRefresh } from "./use-poll";

/**
 * While a view shows a payment that is due, asks the server to collect it and refreshes
 * all views afterwards. Retries every 15 seconds while something stays due.
 */
export type CollectScope = { plan?: string; subscriber?: string; merchant?: string };

export function useAutoCollect(scope: CollectScope | null, due: boolean) {
  const lastCall = useRef(0);
  const scopeKey = scope ? JSON.stringify(scope) : "";

  useEffect(() => {
    if (!due || !scopeKey) return;
    let active = true;
    const run = async () => {
      if (Date.now() - lastCall.current < 12_000) return;
      lastCall.current = Date.now();
      try {
        const res = await fetch("/api/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: scopeKey,
        });
        const data = (await res.json()) as { collected?: number };
        if (active && (data.collected ?? 0) > 0) {
          requestRefresh();
          // Devnet RPC nodes can lag a moment behind the confirmed charge; read again shortly after.
          window.setTimeout(requestRefresh, 2_000);
        }
      } catch {
        // The scheduled job collects later; the next attempt runs on the interval below.
      }
    };
    void run();
    const timer = window.setInterval(run, 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [due, scopeKey]);
}
