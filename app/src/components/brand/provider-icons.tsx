import type { ProviderId } from "@/integrations/types";
import { cn } from "@/lib/utils";

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#27A6E5" />
      <path
        fill="#fff"
        d="M5.5 11.8 16.9 7.4c.53-.19 1 .13.83.93l-1.94 9.14c-.14.65-.53.81-1.07.5l-2.97-2.19-1.43 1.38c-.16.16-.29.29-.6.29l.21-3.02 5.5-4.97c.24-.21-.05-.33-.37-.12l-6.8 4.28-2.93-.91c-.64-.2-.65-.64.13-.94Z"
      />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#5865F2" />
      <path
        fill="#fff"
        d="M17.2 7.6a12.4 12.4 0 0 0-3.1-.96l-.4.8a11.5 11.5 0 0 0-3.4 0l-.4-.8c-1.08.19-2.12.51-3.1.96C4.8 10.5 4.3 13.4 4.55 16.2a12.5 12.5 0 0 0 3.8 1.9l.8-1.3c-.44-.16-.86-.37-1.25-.6l.3-.24a8.9 8.9 0 0 0 7.6 0l.3.24c-.4.23-.82.44-1.26.6l.8 1.3a12.4 12.4 0 0 0 3.8-1.9c.3-3.25-.52-6.1-2.24-8.6ZM9.7 14.5c-.74 0-1.35-.68-1.35-1.52 0-.84.6-1.52 1.35-1.52.76 0 1.36.69 1.35 1.52 0 .84-.6 1.52-1.35 1.52Zm4.6 0c-.74 0-1.35-.68-1.35-1.52 0-.84.6-1.52 1.35-1.52.76 0 1.36.69 1.35 1.52 0 .84-.6 1.52-1.35 1.52Z"
      />
    </svg>
  );
}

export function ProviderIcon({ id, className }: { id: ProviderId; className?: string }) {
  const Icon = id === "telegram" ? TelegramIcon : DiscordIcon;
  return <Icon className={cn("size-9 shrink-0", className)} />;
}
