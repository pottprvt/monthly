"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";

import { ConnectPrompt } from "@/components/ConnectPrompt";
import { PlusIcon } from "@/components/icons";
import { Overview } from "@/components/merchant/Overview";
import { PlanEditor } from "@/components/merchant/PlanEditor";
import { PlanList } from "@/components/merchant/PlanList";
import { SubscriberTable } from "@/components/merchant/SubscriberTable";
import { Button, Modal, SlowNotice, Tabs } from "@/components/ui";
import type { Keyed, PlanAccount } from "@/lib/monthly";
import { useMerchantData } from "@/lib/useMerchantData";

type Tab = "plans" | "overview" | "subscribers";
type Editing = { mode: "new" } | { mode: "edit"; plan: Keyed<PlanAccount> } | null;

export default function MerchantPage() {
  const { publicKey } = useWallet();
  const data = useMerchantData();
  const [tab, setTab] = useState<Tab>("plans");
  const [editing, setEditing] = useState<Editing>(null);

  if (!publicKey) {
    return <ConnectPrompt title="Sell a subscription" text="Connect the wallet that should get paid." />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your plans</h1>
        <Button onClick={() => setEditing({ mode: "new" })}>
          <PlusIcon size={16} /> New plan
        </Button>
      </div>
      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "plans", label: "Plans", count: data.plans.length },
          { id: "overview", label: "Overview" },
          { id: "subscribers", label: "Subscribers", count: data.subs.length },
        ]}
      />
      {data.failing && <SlowNotice />}
      {!data.loaded ? (
        <p className="py-10 text-center text-sm text-muted">Loading…</p>
      ) : tab === "plans" ? (
        <PlanList
          data={data}
          onNew={() => setEditing({ mode: "new" })}
          onEdit={(plan) => setEditing({ mode: "edit", plan })}
        />
      ) : tab === "overview" ? (
        <Overview data={data} />
      ) : (
        <SubscriberTable data={data} />
      )}
      <Modal
        open={editing !== null}
        title={editing?.mode === "edit" ? "Edit plan" : "New plan"}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <PlanEditor
            key={editing.mode === "edit" ? editing.plan.publicKey.toBase58() : "new"}
            existing={editing.mode === "edit" ? editing.plan : undefined}
            nextPlanId={data.nextPlanId}
            hasUsdc={data.hasUsdc}
            onSaved={async () => {
              await data.reload();
              setEditing(null);
              setTab("plans");
            }}
          />
        )}
      </Modal>
    </div>
  );
}
