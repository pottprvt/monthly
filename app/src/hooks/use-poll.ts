"use client";

import { useEffect, useState } from "react";

const REFRESH_EVENT = "monthly:refresh";

/** Asks every mounted view to reload its data, e.g. after test funds arrived. */
export function requestRefresh() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

/** Retries reads that the public devnet RPC rejects under load. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 700 * 2 ** i));
    }
  }
  throw last;
}

/**
 * Loads once immediately, then on refresh requests, when the tab becomes visible, and on an
 * interval while visible. Returns true while the last attempt failed; previous data stays on screen.
 */
export function usePoll(load: () => Promise<void>, intervalMs = 20_000): boolean {
  const [failing, setFailing] = useState(false);
  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        await withRetry(load);
        if (active) setFailing(false);
      } catch {
        if (active) setFailing(true);
      }
    };
    const onVisible = () => {
      if (!document.hidden) void run();
    };
    void run();
    const timer = window.setInterval(() => {
      if (!document.hidden) void run();
    }, intervalMs);
    window.addEventListener(REFRESH_EVENT, run);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(REFRESH_EVENT, run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, intervalMs]);
  return failing;
}
