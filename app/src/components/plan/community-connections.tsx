"use client";

import { Clock3Icon } from "lucide-react";

import { ProviderIcon } from "@/components/brand/provider-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntegrations } from "@/hooks/use-integrations";

import { TelegramConnect } from "./telegram-connect";

/**
 * Where a plan's members get access. Providers come from the server registry; a provider is
 * connectable once its credentials exist on this deployment. Without a plan (e.g. marketing) it
 * only describes the providers.
 */
export function CommunityConnections({ plan }: { plan?: string }) {
  const providers = useIntegrations();
  if (!providers) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {providers.map((p) => (
        <div key={p.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <ProviderIcon id={p.id} />
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">Members join your {p.target}</div>
              </div>
            </div>
            {!p.available && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <Clock3Icon className="size-3" /> Coming soon
              </span>
            )}
          </div>
          <ol className="space-y-1.5 text-xs text-muted-foreground">
            {p.setupSteps.map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-medium text-foreground">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          {p.available && plan && p.id === "telegram" && (
            <div className="mt-auto border-t pt-4">
              <TelegramConnect plan={plan} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
