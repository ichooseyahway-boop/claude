import type { Metadata } from "next";
import { Wordmark } from "@/components/shared/wordmark";
import { Badge } from "@/components/shared/ui";
import { OpsLogin } from "@/components/operations/ops-login";
import { OpsSignOut } from "@/components/operations/ops-signout";
import {
  AlertIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@/components/shared/icons";
import { getOpsAccess } from "@/lib/ops/auth";
import { getStore } from "@/lib/database";
import { getOffer } from "@/lib/config/offers";
import type { OrderWithFamily } from "@/lib/database/types";

export const metadata: Metadata = {
  title: "Operations",
  robots: { index: false, follow: false },
};

// Operator data must always be fresh.
export const dynamic = "force-dynamic";

function money(amount: number | null, currency: string | null): string {
  if (amount == null || !currency) return "—";
  return (amount / 100).toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}

function OnboardingBadge({ status }: { status: string }) {
  if (status === "completed")
    return (
      <Badge tone="sage">
        <CheckCircleIcon size={12} /> Ready for materials
      </Badge>
    );
  if (status === "in_progress")
    return <Badge tone="gold">Onboarding started</Badge>;
  return <Badge tone="coral">Awaiting onboarding</Badge>;
}

export default async function OpsPage() {
  const access = await getOpsAccess();

  if (access.state === "unauthed") return <OpsLogin />;
  if (access.state === "unconfigured" && !access.devBypass) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-5">
        <div className="max-w-md rounded-[var(--radius-xl)] border border-[var(--border)] bg-paper p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--surface-sunken)] text-ink-faint">
            <AlertIcon size={24} />
          </span>
          <h1 className="mt-4 text-[1.3rem] font-semibold text-ink">
            Operations access not configured
          </h1>
          <p className="mt-2 text-[0.94rem] text-ink-soft">
            Set{" "}
            <code className="rounded bg-[var(--surface-sunken)] px-1">
              OPS_ACCESS_TOKEN
            </code>{" "}
            in this environment to enable the operations console.
          </p>
        </div>
      </div>
    );
  }

  const store = getStore();
  const orders = await store.listOrders();
  const paid = orders.filter((o) => o.order.status === "paid");
  const awaiting = paid.filter(
    (o) => o.order.onboarding_status !== "completed",
  );
  const ready = paid.filter((o) => o.order.onboarding_status === "completed");

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-[var(--border)] bg-paper">
        <div className="shell flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Wordmark href="/" />
            <Badge tone="neutral">Operations</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={store.kind === "supabase" ? "sage" : "gold"}>
              {store.kind === "supabase" ? "Supabase" : "In-memory store"}
            </Badge>
            {access.state === "authed" && <OpsSignOut />}
          </div>
        </div>
      </header>

      <main id="main" className="shell py-10">
        {access.state === "unconfigured" && access.devBypass && (
          <div className="mb-6 flex items-start gap-2 rounded-md border border-[var(--gold)]/40 bg-[var(--gold-soft)] px-4 py-3 text-[0.88rem] text-[#7a601f]">
            <AlertIcon size={17} className="mt-0.5 shrink-0" />
            Development bypass: <code>OPS_ACCESS_TOKEN</code> is not set, so
            this console is open. It will be locked in production until a token
            is configured.
          </div>
        )}
        {store.kind === "memory" && (
          <div className="mb-6 flex items-start gap-2 rounded-md border border-[var(--border)] bg-paper px-4 py-3 text-[0.88rem] text-ink-soft">
            <AlertIcon size={17} className="mt-0.5 shrink-0 text-ink-faint" />
            Using the in-memory store. Orders here do not persist across
            restarts. Configure Supabase for durable data.
          </div>
        )}

        <div>
          <h1 className="text-[1.6rem] font-semibold text-ink">Paid orders</h1>
          <p className="mt-1 text-[0.95rem] text-ink-soft">
            Every paid rescue and its onboarding status. Work the “Awaiting” and
            “Ready for materials” queues first.
          </p>
        </div>

        {/* Metrics */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Metric
            label="Paid orders"
            value={paid.length}
            icon={<CheckCircleIcon size={20} className="text-[var(--sage)]" />}
          />
          <Metric
            label="Awaiting onboarding"
            value={awaiting.length}
            icon={<ClockIcon size={20} className="text-[var(--coral)]" />}
          />
          <Metric
            label="Ready for materials"
            value={ready.length}
            icon={<CheckCircleIcon size={20} className="text-[var(--sage)]" />}
          />
        </div>

        {/* Orders table */}
        <div className="mt-8 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-paper">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-[0.9rem]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-sunken)] text-[0.78rem] uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Offer</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Onboarding</th>
                  <th className="px-4 py-3 font-semibold">Children</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {paid.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-ink-soft"
                    >
                      No paid orders yet. Completed test-mode checkouts will
                      appear here.
                    </td>
                  </tr>
                )}
                {paid.map((o) => (
                  <OrderRow key={o.order.id} row={o} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-paper p-5">
      <div className="flex items-center justify-between">
        <span className="text-[0.85rem] text-ink-soft">{label}</span>
        {icon}
      </div>
      <p className="mt-2 font-serif text-[2.2rem] leading-none text-ink tnum">
        {value}
      </p>
    </div>
  );
}

function OrderRow({ row }: { row: OrderWithFamily }) {
  const { order, family, children } = row;
  const offer = getOffer(order.offer_id as never);
  return (
    <tr className="align-top">
      <td className="px-4 py-3 font-mono text-[0.8rem] text-ink-soft">
        {order.id.slice(0, 8)}
      </td>
      <td className="px-4 py-3">
        <span className="text-ink">{order.customer_email ?? "—"}</span>
        {family?.name && (
          <span className="block text-[0.8rem] text-ink-faint">
            {family.name}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-ink-soft">
        {offer?.name ?? order.offer_id}
      </td>
      <td className="px-4 py-3 tnum text-ink">
        {money(order.amount_total, order.currency)}
      </td>
      <td className="px-4 py-3">
        <OnboardingBadge status={order.onboarding_status} />
      </td>
      <td className="px-4 py-3">
        {children.length === 0 ? (
          <span className="text-ink-faint">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {children.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-sunken)] px-2 py-0.5 text-[0.76rem] text-ink-soft"
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: `var(${c.color_token})` }}
                />
                {c.display_name}
                {c.grade_label ? ` · ${c.grade_label}` : ""}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 tnum text-[0.82rem] text-ink-soft">
        {new Date(order.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </td>
    </tr>
  );
}
