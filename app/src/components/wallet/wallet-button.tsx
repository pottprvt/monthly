"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { CopyIcon, ExternalLinkIcon, LogOutIcon, WalletIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyText } from "@/lib/clipboard";
import { explorerAddress } from "@/lib/config";
import { shortAddress } from "@/lib/format";

import { useTestFunds } from "./use-test-funds";

export function WalletButton({ size = "default" }: { size?: "default" | "lg" }) {
  const { publicKey, wallet, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const { request, busy } = useTestFunds();

  if (!publicKey) {
    return (
      <Button size={size} onClick={() => setVisible(true)} disabled={connecting}>
        <WalletIcon data-icon="inline-start" />
        {connecting ? "Connecting…" : "Connect wallet"}
      </Button>
    );
  }

  const address = publicKey.toBase58();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size={size} />}>
        {wallet?.adapter.icon && (
          // eslint-disable-next-line @next/next/no-img-element -- wallet icons are inline data URIs
          <img src={wallet.adapter.icon} alt="" className="size-4 rounded-sm" />
        )}
        <span className="font-mono text-xs">{shortAddress(address)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-mono text-xs">{shortAddress(address, 6)}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => request()} disabled={busy}>
          <WalletIcon /> {busy ? "Sending test funds…" : "Get test funds"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void copyText(address, "Address copied")}>
          <CopyIcon /> Copy address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(explorerAddress(address), "_blank")}>
          <ExternalLinkIcon /> View on explorer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void disconnect()}>
          <LogOutIcon /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
