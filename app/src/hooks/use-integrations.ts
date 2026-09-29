"use client";

import { useEffect, useState } from "react";

import type { ProviderInfo } from "@/integrations/types";

/** Community providers and whether they are set up on this deployment. */
export function useIntegrations(): ProviderInfo[] | null {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/integrations")
      .then((r) => r.json() as Promise<ProviderInfo[]>)
      .then((list) => active && setProviders(list))
      .catch(() => active && setProviders([]));
    return () => {
      active = false;
    };
  }, []);
  return providers;
}
