"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";

import { ConnectPrompt } from "@/components/ConnectPrompt";
import { NewPlanDrawer } from "@/components/merchant/NewPlanDrawer";
import { Overview } from "@/components/merchant/Overview";
import { PlanList } from "@/components/merchant/PlanList";
import { SubscriberTable } from "@/components/merchant/SubscriberTable";
import { Button, PageHeader, Tabs } from "@/components/ui";
import { useMerchantData } from "@/lib/useMerchantData";

type Tab = "overview" | "plans" | "subscribers";

export default function MerchantPage() {
  const { publicKey } = useWallet();
  const data = useMerchantData();
  const [tab, setTab] = useState<Tab>("overview");
  const [drawer, setDrawer] = useState(false);

  if (!publicKey) {
    return (
      <ConnectPrompt
        title="Sell a subscription"
        text="Connect the wallet that should receive the payments. Your plans and subscribers appear here."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Merchant dashboard"
        subtitle="Plans you sell, who pays for them, and what is due."
        action={<Button onClick={() => setDrawer(true)}>+ New plan</Button>}
      />
      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "plans", label: "Plans", count: data.plans.length },
          { id: "subscribers", label: "Subscribers", count: data.subs.length },
        ]}
      />
      {!data.loaded ? (
        <p className="py-10 text-center text-sm text-muted">Loading…</p>
      ) : tab === "overview" ? (
        <Overview data={data} />
      ) : tab === "plans" ? (
        <PlanList data={data} onNew={() => setDrawer(true)} />
      ) : (
        <SubscriberTable data={data} />
      )}
      <NewPlanDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        hasUsdc={data.hasUsdc}
        onCreated={async () => {
          await data.reload();
          setTab("plans");
        }}
      />
    </div>
  );
}
