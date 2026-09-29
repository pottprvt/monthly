"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";

import { usePoll, useProgram } from "./hooks";
import {
  type Keyed,
  type PlanAccount,
  type SubscriptionAccount,
  fetchPlansByMerchant,
  fetchSubscriptionsByPlan,
  fetchUsdcAccount,
} from "./monthly";

export type MerchantData = {
  loaded: boolean;
  plans: Keyed<PlanAccount>[];
  subs: Keyed<SubscriptionAccount>[];
  hasUsdc: boolean | null;
  now: number;
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
  const [now, setNow] = useState(0);

  const reload = useCallback(async () => {
    if (!publicKey) return;
    const [list, usdc] = await Promise.all([
      fetchPlansByMerchant(program, publicKey),
      fetchUsdcAccount(connection, publicKey),
    ]);
    list.sort((a, b) => b.account.createdAt.cmp(a.account.createdAt));
    const perPlan = await Promise.all(list.map((p) => fetchSubscriptionsByPlan(program, p.publicKey)));
    const all = perPlan.flat();
    all.sort((a, b) => a.account.nextChargeAt.cmp(b.account.nextChargeAt));
    setPlans(list);
    setSubs(all);
    setHasUsdc(usdc !== null);
    setNow(Math.floor(Date.now() / 1000));
    setLoaded(true);
  }, [program, publicKey, connection]);

  usePoll(reload, 15_000);

  return { loaded, plans, subs, hasUsdc, now, reload };
}
