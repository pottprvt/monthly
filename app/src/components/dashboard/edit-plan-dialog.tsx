"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { PencilIcon } from "lucide-react";
import { useState } from "react";

import { PlanCard } from "@/components/plan/plan-card";
import { PlanForm, draftFromPlan, isDraftValid, type PlanDraft } from "@/components/plan/plan-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useProgram } from "@/hooks/use-program";
import { useTx } from "@/hooks/use-tx";
import { updatePlanIx, type Plan } from "@/lib/chain";
import { formatUsdc, parseUsdc, perInterval } from "@/lib/format";

export function EditPlanDialog({ plan }: { plan: Plan }) {
  const { publicKey } = useWallet();
  const program = useProgram();
  const { busy, run } = useTx();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PlanDraft>(() => draftFromPlan(plan.account));
  const amount = parseUsdc(draft.price);

  async function save() {
    if (!publicKey || amount === null) return;
    const ok = await run(
      "save",
      async () => [await updatePlanIx(program, publicKey, plan.publicKey, { name: draft.name.trim(), image: draft.image, amount })],
      "Plan updated",
    );
    if (ok) setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(draftFromPlan(plan.account));
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <PencilIcon /> Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit plan</DialogTitle>
          <DialogDescription>Name, image and price can change. The billing interval is fixed.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-8 pt-2 md:grid-cols-[1fr_280px]">
          <PlanForm draft={draft} onChange={setDraft} originalAmount={BigInt(plan.account.amount.toString())} />
          <PlanCard
            plan={{ name: draft.name, image: draft.image, price: amount !== null ? formatUsdc(amount) : "–", per: perInterval(draft.interval) }}
            className="self-start"
          />
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!isDraftValid(draft) || busy !== null}>
            {busy ? "Confirm in your wallet…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
