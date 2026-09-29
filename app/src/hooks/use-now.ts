"use client";

import { useSyncExternalStore } from "react";

/** Current unix time in seconds, updated every second, shared by all subscribers. */
function subscribe(onTick: () => void) {
  const timer = window.setInterval(onTick, 1000);
  return () => window.clearInterval(timer);
}

export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000),
    () => 0,
  );
}
