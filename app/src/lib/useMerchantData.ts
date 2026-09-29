"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";

import { usePoll, useProgram } from "./hooks";
import {
  type Keyed,
  type PlanAccount,
  type SubscriptionAccount,
  fetchAllSubscriptions,
  fetchPlansByMerchant,
  fetchUsdcAccount,
} from "./monthly";

export type MerchantData = {
  loaded: boolean;
  plans: Keyed<PlanAccount>[];
  subs: Keyed<SubscriptionAccount>[];
  hasUsdc: boolean | null;
  nextPlanId: number;
  now: number;
  failing: boolean;
  reload: () => Promise<void>;
};

export function useMerchantData(): MerchantData {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useProgram();
  const [loaded, setLoaded] = useState(false);
  const [plans, setPlans] = useState<Keyed<PlanAccount>[]>([]);
  const [subs, setSubs] = useState<Keyed<SubscriptionAccount>[]>([]);
  const [hasUsdc, setHasUsdc] = useState<boolean | null>(null);
  const [nextPlanId, setNextPlanId] = useState(1);
  const [now, setNow] = useState(0);

  const reload = useCallback(async () => {
    if (!publicKey) return;
    const [{ plans: list, nextPlanId: next }, usdc] = await Promise.all([
      fetchPlansByMerchant(program, publicKey),
      fetchUsdcAccount(connection, publicKey),
    ]);
    list.sort((a, b) => b.account.createdAt.cmp(a.account.createdAt));
    const mine = new Set(list.map((p) => p.publicKey.toBase58()));
    const all = list.length === 0 ? [] : (await fetchAllSubscriptions(program)).filter((s) => mine.has(s.account.plan.toBase58()));
    all.sort((a, b) => a.account.nextChargeAt.cmp(b.account.nextChargeAt));
    setPlans(list);
    setSubs(all);
    setNextPlanId(next);
    setHasUsdc(usdc !== null);
    setNow(Math.floor(Date.now() / 1000));
    setLoaded(true);
  }, [program, publicKey, connection]);

  const failing = usePoll(reload);

  return { loaded, plans, subs, hasUsdc, nextPlanId, now, failing, reload };
}
