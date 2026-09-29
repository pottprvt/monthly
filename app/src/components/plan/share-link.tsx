"use client";

import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

/** The plan's public checkout link with copy and open actions. */
export function ShareLink({ plan }: { plan: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/p/${plan}`;

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="flex min-w-0 flex-1 items-center rounded-lg border bg-muted/50 px-3 font-mono text-xs text-muted-foreground">
        <span className="truncate py-2" suppressHydrationWarning>
          {typeof window === "undefined" ? "" : window.location.host}
          {path}
        </span>
      </div>
      <Button variant="outline" onClick={copy}>
        {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Copied" : "Copy"}
      </Button>
      <Link href={path} target="_blank" className={buttonVariants({ variant: "outline" })}>
        <ExternalLinkIcon /> Open
      </Link>
    </div>
  );
}
