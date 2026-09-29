"use client";

import { ArrowDownIcon, ImageUpIcon, LockIcon, Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { INTERVALS, formatUsdc, parseUsdc } from "@/lib/format";
import { PRESET_COLORS, PRESET_EMOJIS, parseImage, presetImage } from "@/lib/plan-image";
import { cn } from "@/lib/utils";

export type PlanDraft = { name: string; image: string; price: string; interval: number };

/** Exact decimal representation of a base-unit amount (no rounding, no grouping). */
function exactUsdc(amount: { toString(): string }): string {
  const units = amount.toString().padStart(7, "0");
  const whole = units.slice(0, -6).replace(/^0+(?=\d)/, "");
  const frac = units.slice(-6).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

export function draftFromPlan(p: { name: string; image: string; amount: { toString(): string }; intervalSeconds: { toNumber(): number } }): PlanDraft {
  return { name: p.name, image: p.image, price: exactUsdc(p.amount), interval: p.intervalSeconds.toNumber() };
}

/** The program stores up to 32 bytes; emoji and umlauts take more than one byte per character. */
const nameBytes = (name: string) => new TextEncoder().encode(name.trim()).length;

export const EMPTY_DRAFT: PlanDraft = {
  name: "",
  image: presetImage(PRESET_EMOJIS[0], PRESET_COLORS[0]),
  price: "10",
  interval: INTERVALS[3].seconds,
};

export function isDraftValid(d: PlanDraft) {
  return d.name.trim().length > 0 && nameBytes(d.name) <= 32 && parseUsdc(d.price) !== null;
}

/**
 * Plan fields. In edit mode the interval is locked, and a price change explains its effect on
 * existing subscribers (cuts apply to all, increases only after approval).
 */
export function PlanForm({
  draft,
  onChange,
  originalAmount,
}: {
  draft: PlanDraft;
  onChange: (d: PlanDraft) => void;
  originalAmount?: bigint;
}) {
  const editing = originalAmount !== undefined;
  const image = parseImage(draft.image);
  const amount = parseUsdc(draft.price);
  const set = (patch: Partial<PlanDraft>) => onChange({ ...draft, ...patch });

  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <Label>Image</Label>
        <ImagePicker value={draft.image} onChange={(img) => set({ image: img })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan-name">Name</Label>
        <Input
          id="plan-name"
          value={draft.name}
          maxLength={32}
          placeholder="e.g. Alpha Signals"
          aria-invalid={nameBytes(draft.name) > 32}
          onChange={(e) => set({ name: e.target.value })}
        />
        {nameBytes(draft.name) > 32 && <p className="text-xs text-destructive">Name is too long. Use fewer or simpler characters.</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="plan-price">Price</Label>
          <div className="relative">
            <Input
              id="plan-price"
              value={draft.price}
              inputMode="decimal"
              className="pr-14 tabular-nums"
              aria-invalid={amount === null}
              onChange={(e) => set({ price: e.target.value })}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">USDC</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            Billed every {editing && <LockIcon className="size-3 text-muted-foreground" />}
          </Label>
          <ToggleGroup
            variant="outline"
            value={[String(draft.interval)]}
            onValueChange={(v: string[]) => v[0] && set({ interval: Number(v[0]) })}
            disabled={editing}
          >
            {INTERVALS.map((i) => (
              <ToggleGroupItem
                key={i.seconds}
                value={String(i.seconds)}
                className="px-3 text-xs aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:hover:bg-foreground aria-pressed:hover:text-background"
              >
                {i.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {editing && amount !== null && amount !== originalAmount && (
        <div className="flex gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-sm">
          {amount < originalAmount ? (
            <>
              <ArrowDownIcon className="mt-0.5 size-4 shrink-0 text-success" />
              All members pay {formatUsdc(amount)} USDC from their next payment.
            </>
          ) : (
            <>
              <LockIcon className="mt-0.5 size-4 shrink-0 text-warning" />
              New members pay {formatUsdc(amount)} USDC. Current members keep {formatUsdc(originalAmount)} USDC until they approve.
            </>
          )}
        </div>
      )}
      {image.kind === "none" && <p className="text-xs text-muted-foreground">No image selected.</p>}
    </div>
  );
}

function ImagePicker({ value, onChange }: { value: string; onChange: (image: string) => void }) {
  const current = parseImage(value);
  const [emoji, setEmoji] = useState(current.kind === "preset" ? current.emoji : PRESET_EMOJIS[0]);
  const [color, setColor] = useState(current.kind === "preset" ? current.color : PRESET_COLORS[0]);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function pick(e: string, c: string) {
    setEmoji(e);
    setColor(c);
    onChange(presetImage(e, c));
  }

  async function upload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => pick(e, color)}
            className={cn(
              "grid size-9 place-items-center rounded-lg border text-lg transition-colors hover:bg-muted",
              current.kind === "preset" && current.emoji === e && "border-foreground bg-muted",
            )}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            onClick={() => pick(emoji, c)}
            style={{ background: c }}
            className={cn(
              "size-6 rounded-full ring-offset-2 ring-offset-background transition",
              current.kind === "preset" && current.color === c && "ring-2 ring-foreground",
            )}
          />
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={uploading}>
          {uploading ? <Loader2Icon className="animate-spin" /> : <ImageUpIcon />}
          {current.kind === "url" ? "Replace image" : "Upload image"}
        </Button>
      </div>
    </div>
  );
}
