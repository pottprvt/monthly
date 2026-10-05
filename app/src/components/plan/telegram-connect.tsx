"use client";

import { CheckCircle2Icon, ExternalLinkIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { useTelegramStatus } from "@/hooks/use-telegram";
import { useWalletSession } from "@/hooks/use-wallet-session";

/** Creator control: add the bot to a group and watch the connection come in. */
export function TelegramConnect({ plan }: { plan: string }) {
  const ensureSession = useWalletSession();
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const status = useTelegramStatus(plan, link !== null);
  const pending = link !== null && status.status !== "connected";

  // One-time connect codes expire after 10 minutes; offer a fresh link instead of waiting forever.
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => {
      setLink(null);
      toast.message("The connect link expired. Create a new one.");
    }, 10 * 60_000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  async function start() {
    setBusy(true);
    try {
      await ensureSession();
      const res = await fetch("/api/integrations/telegram/connect", {
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

  if (status.status === "loading") return <Loader2Icon className="size-4 animate-spin text-muted-foreground" />;

  if (status.status === "connected") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2Icon className="size-4 text-success" />
          Connected to <span className="font-medium">{status.title}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Only members who join through Monthly are managed. Revoke other invite links of the group.
        </p>
      </div>
    );
  }

  if (status.status === "unavailable") {
    return <p className="text-sm text-muted-foreground">Telegram status could not be loaded. Reload the page to try again.</p>;
  }

  return (
    <div className="space-y-2">
      {status.status === "error" && (
        <div className="flex items-center gap-2 text-sm text-warning">
          <TriangleAlertIcon className="size-4" /> {status.error ?? "Connection problem"} in {status.title}
        </div>
      )}
      {link ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" /> Waiting for the bot to join your group…
          <a href={link} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open Telegram <ExternalLinkIcon />
          </a>
          {/* The bot may have refused (not an admin, missing rights); a new code is the way out. */}
          <Button variant="ghost" size="sm" onClick={() => setLink(null)}>
            Start over
          </Button>
        </div>
      ) : (
        <Button onClick={start} disabled={busy}>
          {busy ? <Loader2Icon className="animate-spin" /> : null}
          {status.status === "error" ? "Reconnect Telegram" : "Connect Telegram"}
        </Button>
      )}
    </div>
  );
}
