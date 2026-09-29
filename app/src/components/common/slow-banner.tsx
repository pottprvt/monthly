import { CloudAlertIcon } from "lucide-react";

/** Shown while devnet reads keep failing; data on screen stays the last good state. */
export function SlowBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
      <CloudAlertIcon className="size-4" />
      Solana devnet is responding slowly. Retrying…
    </div>
  );
}
