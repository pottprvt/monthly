"use client";

import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRef, useState } from "react";

import { ArrowDownIcon, LockIcon } from "@/components/icons";
import { PlanCard } from "@/components/PlanCard";
import { Button, Notice, ResultNotice, inputClass } from "@/components/ui";
import { INTERVALS, formatUsdc, parseUsdc, perInterval } from "@/lib/config";
import { useProgram, useTx } from "@/lib/hooks";
import { type Keyed, type PlanAccount, createPlanIx, updatePlanIx } from "@/lib/monthly";
import { PRESET_COLORS, PRESET_EMOJIS, parseImage, presetImage } from "@/lib/presets";

function safeParse(v: string): bigint | null {
  try {
    const n = parseUsdc(v);
    return n > 0n ? n : null;
  } catch {
    return null;
  }
}

export function PlanEditor({
  existing,
  nextPlanId,
  hasUsdc,
  onSaved,
}: {
  existing?: Keyed<PlanAccount>;
  nextPlanId: number;
  hasUsdc: boolean | null;
  onSaved: () => Promise<void>;
}) {
  const { publicKey } = useWallet();
  const program = useProgram();
  const initialImage = parseImage(existing?.account.image ?? "");

  const [name, setName] = useState(existing?.account.name ?? "");
  const [emoji, setEmoji] = useState(initialImage.kind === "preset" ? initialImage.emoji : PRESET_EMOJIS[0]);
  const [color, setColor] = useState(initialImage.kind === "preset" ? initialImage.color : PRESET_COLORS[0]);
  const [imageUrl, setImageUrl] = useState(initialImage.kind === "url" ? initialImage.url : "");
  const [useUrl, setUseUrl] = useState(initialImage.kind === "url");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setImageUrl(data.url);
      setUseUrl(true);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }
  const [price, setPrice] = useState(existing ? formatUsdc(existing.account.amount).replace(/,/g, "") : "10");
  const [interval, setInterval] = useState(existing?.account.intervalSeconds.toNumber() ?? INTERVALS[3].seconds);
  const { busy, result, run } = useTx(onSaved);

  const image = useUrl ? imageUrl.trim() : presetImage(emoji, color);
  const amount = safeParse(price);
  const oldAmount = existing ? BigInt(existing.account.amount.toString()) : null;
  const urlInvalid = useUrl && !/^https:\/\/\S+$/.test(imageUrl.trim());
  const canSave =
    !!publicKey && name.trim() !== "" && amount !== null && !urlInvalid && hasUsdc !== false && (!!existing || nextPlanId > 0);

  async function save() {
    if (!publicKey || amount === null) return;
    if (existing) {
      await run(
        "Save",
        async () => [
          await updatePlanIx(program, publicKey, existing.publicKey, name.trim(), image, new BN(amount.toString())),
        ],
        "Plan updated.",
      );
    } else {
      await run(
        "Create",
        async () => [
          await createPlanIx(
            program,
            publicKey,
            new BN(nextPlanId),
            name.trim(),
            image,
            new BN(amount.toString()),
            new BN(interval),
          ),
        ],
        "Plan created.",
      );
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {hasUsdc === false && (
          <Notice tone="error">Click “Get test funds” at the top first. Your plan needs an account to be paid into.</Notice>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Image</span>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
            <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload image"}
            </Button>
          </div>
          {uploadError && <p className="text-xs text-danger">{uploadError}</p>}
          {useUrl ? (
            <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm">
              <span className="text-muted">Your image is used.</span>
              <button className="text-xs text-accent hover:underline" onClick={() => setUseUrl(false)}>
                Pick an icon instead
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid w-max grid-cols-5 gap-2">
                {PRESET_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`grid h-10 w-10 place-items-center rounded-xl border text-xl transition ${
                      emoji === e ? "border-accent bg-accent/10" : "border-line hover:bg-panel-strong"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={`Color ${c}`}
                    style={{ background: c }}
                    className={`h-7 w-7 rounded-full transition ${color === c ? "ring-2 ring-fg ring-offset-2 ring-offset-bg" : ""}`}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <span className="text-sm font-medium">Name</span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            placeholder="Alpha Signals"
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <span className="flex h-5 items-center text-sm font-medium">Price</span>
            <div className="flex items-center rounded-lg border border-line bg-bg pr-3 focus-within:border-accent">
              <input
                className="w-full bg-transparent px-3 py-2 text-lg font-semibold outline-none"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
              />
              <span className="text-sm text-muted">USDC</span>
            </div>
          </div>
          <div className="space-y-2">
            <span className="flex h-5 items-center gap-1.5 text-sm font-medium">
              Billing {existing && <LockIcon size={13} className="text-muted" />}
            </span>
            <div className="grid grid-cols-4 gap-1 rounded-lg border border-line p-1">
              {INTERVALS.map((i) => (
                <button
                  key={i.seconds}
                  disabled={!!existing}
                  onClick={() => setInterval(i.seconds)}
                  className={`rounded-md py-1.5 text-xs transition disabled:cursor-not-allowed ${
                    interval === i.seconds ? "bg-accent text-white" : "text-muted hover:bg-panel-strong"
                  } ${existing && interval !== i.seconds ? "opacity-40" : ""}`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {existing && amount !== null && oldAmount !== null && amount !== oldAmount && (
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              amount < oldAmount ? "border-accent/40 bg-accent/5" : "border-warn/40 bg-warn/5"
            }`}
          >
            {amount < oldAmount ? (
              <>
                <ArrowDownIcon className="mt-0.5 text-accent" />
                <span>All subscribers pay {formatUsdc(amount)} USDC from their next payment.</span>
              </>
            ) : (
              <>
                <LockIcon className="mt-0.5 text-warn" />
                <span>
                  New subscribers pay {formatUsdc(amount)} USDC. Existing ones keep {formatUsdc(oldAmount)} USDC until
                  they accept.
                </span>
              </>
            )}
          </div>
        )}

        <Button size="lg" className="w-full" onClick={save} disabled={!canSave || busy !== null}>
          {busy ? "Confirm in your wallet…" : existing ? "Save changes" : "Create plan"}
        </Button>
        <ResultNotice result={result} />
      </div>

      <div className="space-y-2">
        <span className="text-xs uppercase tracking-wide text-muted">Preview</span>
        <PlanCard
          plan={{ name: name.trim(), image, price: amount !== null ? formatUsdc(amount) : "—", per: perInterval(interval) }}
          footer={
            <div className="rounded-xl bg-accent py-3 text-center text-sm font-medium text-white opacity-90">Subscribe</div>
          }
        />
      </div>
    </div>
  );
}
