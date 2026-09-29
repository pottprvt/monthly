import { LogoMark } from "@/components/brand/logo";

const MESSAGES = [
  { time: "09:00", text: "Payment received: 10 USDC. Your access to Alpha Signals is active until 30 Nov." },
  { time: "09:00", text: "You're in. Tap below to join the group.", action: "Join Alpha Signals" },
  { time: "30 Nov", text: "Next payment couldn't be collected. You keep access for 3 more days.", tone: "warn" as const },
];

/** Static illustration of the member experience in Telegram (not a live chat). */
export function TelegramMock() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <LogoMark className="size-8" />
        <div>
          <div className="text-sm font-medium">Monthly</div>
          <div className="text-xs text-muted-foreground">bot</div>
        </div>
      </div>
      <div className="space-y-3 bg-muted/40 p-4">
        {MESSAGES.map((m, i) => (
          <div key={i} className="max-w-[85%] rounded-2xl rounded-tl-sm bg-card px-3.5 py-2.5 text-sm shadow-xs">
            <p className={m.tone === "warn" ? "text-warning" : undefined}>{m.text}</p>
            {m.action && (
              <div className="mt-2 rounded-lg bg-[#27A6E5]/10 py-1.5 text-center text-xs font-medium text-[#1b8cc4]">
                {m.action}
              </div>
            )}
            <div className="mt-1 text-right text-[10px] text-muted-foreground">{m.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
