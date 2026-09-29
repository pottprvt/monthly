import { Logo } from "@/components/brand/logo";
import { explorerAddress } from "@/lib/config";
import { PROGRAM_ID } from "@/lib/chain/program";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
        <Logo className="text-foreground" />
        <div className="flex gap-5">
          <a href={explorerAddress(PROGRAM_ID.toBase58())} target="_blank" rel="noreferrer" className="hover:text-foreground">
            On-chain program
          </a>
          <a href="https://github.com/pottprvt/monthly" target="_blank" rel="noreferrer" className="hover:text-foreground">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
