import { Card, InlineLink } from "@/components/ui";

const steps = [
  {
    title: "Merchant creates a plan",
    text: "Name, amount in USDC, interval. The plan is bound to the merchant's token account, so a charge can only ever land there.",
  },
  {
    title: "Subscriber approves a mandate",
    text: "One signature approves the Monthly program as delegate for a chosen allowance and collects the first period. Nothing is prepaid; the money stays in the wallet until it is due.",
  },
  {
    title: "Charges run on schedule",
    text: "When a period is due, anyone can trigger the charge. The program moves exactly the plan amount, exactly once per period. A charge that cannot be covered is retried for three days, then the subscription pauses.",
  },
  {
    title: "Subscriber stays in control",
    text: "Cancel any time, revoke the mandate in any wallet, resume a paused subscription when funds are back. The rules live in the program, not on this website.",
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <div className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">Direct debit for USDC.</h1>
        <p className="text-lg text-muted">
          Solana has no way to pay something every month. Merchants fall back to credit cards
          or chase people by hand. Monthly turns the token program&apos;s delegate feature into a
          mandate: approve once, get charged when due, cancel whenever.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <InlineLink href="/merchant">Create a plan →</InlineLink>
          <InlineLink href="/me">My subscriptions →</InlineLink>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map((s, i) => (
          <Card key={s.title}>
            <div className="mb-1 text-xs text-muted">Step {i + 1}</div>
            <h2 className="mb-2 font-medium">{s.title}</h2>
            <p className="text-sm text-muted">{s.text}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-2 font-medium">Try it on devnet</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Switch your wallet to devnet and get SOL from{" "}
            <a className="text-accent underline" href="https://faucet.solana.com" target="_blank" rel="noreferrer">faucet.solana.com</a>.
          </li>
          <li>Get devnet USDC from{" "}
            <a className="text-accent underline" href="https://faucet.circle.com" target="_blank" rel="noreferrer">faucet.circle.com</a>{" "}
            (select Solana Devnet).
          </li>
          <li>Create a plan with a one-minute interval, open its link in a second wallet, subscribe, and watch the charges arrive.</li>
        </ol>
      </Card>
    </div>
  );
}
