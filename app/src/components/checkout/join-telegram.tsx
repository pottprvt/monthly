"use client";

import { ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProviderIcon } from "@/components/brand/provider-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { useTelegramStatus } from "@/hooks/use-telegram";
import { useWalletSession } from "@/hooks/use-wallet-session";

/** Member control: link the Telegram account through the bot and get the join link. */
export function JoinTelegram({ plan, size = "default" }: { plan: string; size?: "default" | "sm" }) {
  const status = useTelegramStatus(plan);
  const ensureSession = useWalletSession();
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status.status === "loading") return null;
  if (status.status !== "connected") {
    return size === "sm" ? null : (
      <p className="text-sm text-muted-foreground">The creator hasn&apos;t connected a community yet. Your subscription is active.</p>
    );
  }

  async function join() {
    setBusy(true);
    try {
      await ensureSession();
      const res = await fetch("/api/integrations/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!data.url) throw new Error(data.error ?? "Could not create a link");
      setLink(data.url);
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size })}>
        <ProviderIcon id="telegram" className="size-4" /> Open the bot in Telegram <ExternalLinkIcon />
      </a>
    );
  }
  return (
    <div className="space-y-1.5">
      <Button onClick={join} disabled={busy} size={size} variant={size === "sm" ? "outline" : "default"}>
        {busy ? <Loader2Icon className="animate-spin" /> : <ProviderIcon id="telegram" className="size-4" />}
        Join {status.title} on Telegram
      </Button>
      {size !== "sm" && <p className="text-xs text-muted-foreground">You sign a short message to prove it&apos;s your wallet. Free.</p>}
    </div>
  );
}
