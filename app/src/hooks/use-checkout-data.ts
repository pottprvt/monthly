"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import { useCallback, useState } from "react";

import {
  fetchPlan,
  fetchSubscription,
  fetchUsdcAccount,
  spendingLimitLeft,
  subscriptionPda,
  type PlanAccount,
  type SubscriptionAccount,
} from "@/lib/chain";

import { usePoll } from "./use-poll";
import { useProgram } from "./use-program";

export type CheckoutData = {
  /** undefined while loading, null if the plan does not exist */
  plan: PlanAccount | null | undefined;
  sub: SubscriptionAccount | null;
  balance: bigint | null;
  /** Lamports; the subscription deposit and fee are paid in SOL. */
  sol: number;
  limitLeft: bigint;
  failing: boolean;
};

export function useCheckoutData(planKey: PublicKey | null): CheckoutData {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useProgram();
  const [state, setState] = useState<Omit<CheckoutData, "failing">>({
    plan: undefined,
    sub: null,
    balance: null,
    sol: 0,
    limitLeft: 0n,
  });

  const load = useCallback(async () => {
    if (!planKey) return;
    const plan = await fetchPlan(program, planKey);
    if (!publicKey || !plan) {
      setState({ plan, sub: null, balance: null, sol: 0, limitLeft: 0n });
      return;
    }
    const [sub, usdc, sol] = await Promise.all([
      fetchSubscription(program, subscriptionPda(planKey, publicKey)),
      fetchUsdcAccount(connection, publicKey),
      connection.getBalance(publicKey),
    ]);
    setState({ plan, sub, balance: usdc ? usdc.amount : null, sol, limitLeft: spendingLimitLeft(usdc) });
  }, [planKey, program, publicKey, connection]);

  const failing = usePoll(load, 10_000);
  return { ...state, failing };
}
