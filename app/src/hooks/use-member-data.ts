"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";

import {
  fetchPlans,
  fetchSubscriptionsBySubscriber,
  fetchUsdcAccount,
  spendingLimitLeft,
  type Plan,
  type Subscription,
} from "@/lib/chain";

import { usePoll } from "./use-poll";
import { useProgram } from "./use-program";

export type Membership = { sub: Subscription; plan: Plan };

export type MemberData = {
  loaded: boolean;
  failing: boolean;
  memberships: Membership[];
  balance: bigint | null;
  limitLeft: bigint;
  now: number;
};

/** The connected wallet's subscriptions with their plans, balance and remaining spending limit. */
export function useMemberData(): MemberData {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const program = useProgram();
  const [state, setState] = useState<Omit<MemberData, "failing">>({
    loaded: false,
    memberships: [],
    balance: null,
    limitLeft: 0n,
    now: 0,
  });

  const load = useCallback(async () => {
    if (!publicKey) return;
    const [subs, usdc] = await Promise.all([
      fetchSubscriptionsBySubscriber(program, publicKey),
      fetchUsdcAccount(connection, publicKey),
    ]);
    const plans = await fetchPlans(program, subs.map((s) => s.account.plan));
    const memberships = subs.flatMap((sub, i) => {
      const account = plans[i];
      return account ? [{ sub, plan: { publicKey: sub.account.plan, account } }] : [];
    });
    memberships.sort((a, b) => a.sub.account.nextChargeAt.cmp(b.sub.account.nextChargeAt));
    setState({
      loaded: true,
      memberships,
      balance: usdc ? usdc.amount : null,
      limitLeft: spendingLimitLeft(usdc),
      now: Math.floor(Date.now() / 1000),
    });
  }, [program, publicKey, connection]);

  const failing = usePoll(load);
  return { ...state, failing };
}
