"use client";

import { useState } from "react";

import { SlowBanner } from "@/components/common/slow-banner";
import { MembersTable } from "@/components/dashboard/members-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectGate } from "@/components/wallet/connect-gate";
import { useCreatorData } from "@/hooks/use-creator-data";
import { memberStatus, type MemberStatus } from "@/lib/chain";

type Filter = "all" | MemberStatus;

export default function MembersPage() {
  return (
    <ConnectGate title="Members" description="Connect the wallet that owns your plans.">
      <Members />
    </ConnectGate>
  );
}

function Members() {
  const { loaded, failing, plans, subs, now } = useCreatorData();
  const [filter, setFilter] = useState<Filter>("all");
  const count = (f: MemberStatus) => subs.filter((s) => memberStatus(s.account, now) === f).length;
  const shown = filter === "all" ? subs : subs.filter((s) => memberStatus(s.account, now) === filter);

  return (
    <>
      <PageHeader title="Members" description="Everyone paying for your plans." />
      {failing && (
        <div className="mb-6">
          <SlowBanner />
        </div>
      )}
      {!loaded ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : subs.length === 0 ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyTitle>No members yet</EmptyTitle>
            <EmptyDescription>Share a plan&apos;s checkout link to get your first member.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="all">All {subs.length}</TabsTrigger>
              <TabsTrigger value="active">Active {count("active")}</TabsTrigger>
              <TabsTrigger value="due">Due {count("due")}</TabsTrigger>
              <TabsTrigger value="paused">Paused {count("paused")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <MembersTable subs={shown} plans={plans} now={now} />
        </div>
      )}
    </>
  );
}
