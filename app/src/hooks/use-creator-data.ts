"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";

import { fetchAllSubscriptions, fetchPlansByMerchant, fetchUsdcAccount, type Plan, type Subscription } from "@/lib/chain";

import { usePoll } from "./use-poll";
import { useProgram } from "./use-program";

export type CreatorData = {
  loaded: boolean;
  failing: boolean;
  plans: Plan[];
  subs: Subscription[];
  hasUsdc: boolean | null;
  nextPlanId: number;
  now: number;
};

/** Everything the creator dashboard shows: the wallet's plans and their subscriptions. */
export function useCreatorData(): CreatorData {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useProgram();
  const [state, setState] = useState<Omit<CreatorData, "failing">>({
    loaded: false,
    plans: [],
    subs: [],
    hasUsdc: null,
    nextPlanId: 1,
    now: 0,
  });

  const load = useCallback(async () => {
    if (!publicKey) return;
    const [{ plans, nextPlanId }, usdc] = await Promise.all([
      fetchPlansByMerchant(program, publicKey),
      fetchUsdcAccount(connection, publicKey),
    ]);
    const mine = new Set(plans.map((p) => p.publicKey.toBase58()));
    const subs =
      plans.length === 0 ? [] : (await fetchAllSubscriptions(program)).filter((s) => mine.has(s.account.plan.toBase58()));
    plans.sort((a, b) => b.account.createdAt.cmp(a.account.createdAt));
    subs.sort((a, b) => a.account.nextChargeAt.cmp(b.account.nextChargeAt));
    setState({ loaded: true, plans, subs, hasUsdc: usdc !== null, nextPlanId, now: Math.floor(Date.now() / 1000) });
  }, [program, publicKey, connection]);

  const failing = usePoll(load);
  return { ...state, failing };
}
