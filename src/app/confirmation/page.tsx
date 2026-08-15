import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/shared/wordmark";
import { ButtonLink } from "@/components/shared/button";
import { AnalyticsBeacon } from "@/components/shared/analytics-beacon";
import {
  CheckCircleIcon,
  ClockIcon,
  AlertIcon,
} from "@/components/shared/icons";
import { env } from "@/lib/env";
import { billing } from "@/lib/billing/provider";
import { ensureOrderForCheckoutSession } from "@/lib/orders";
import { getStore } from "@/lib/database";
import { site } from "@/lib/config/site";
import type { Order } from "@/lib/database/types";

export const metadata: Metadata = {
  title: "Payment confirmed",
  description:
    "Your School Inbox rescue is confirmed. Complete onboarding to begin.",
  robots: { index: false, follow: false },
};

async function resolveOrder(sessionId: string | undefined): Promise<{
  order: Order | null;
  state: "ok" | "pending" | "missing" | "unconfigured";
}> {
  if (!env.stripeConfigured()) return { order: null, state: "unconfigured" };
  if (!sessionId) return { order: null, state: "missing" };
  try {
    // Retrieve straight from Stripe and finalize idempotently — this makes the
    // confirmation reliable even if the webhook hasn't landed yet (common in
    // test mode).
    const normalized = await billing().retrieveCheckoutSession(sessionId);
    if (
      normalized.paymentStatus !== "paid" &&
      normalized.paymentStatus !== "no_payment_required"
    ) {
      return { order: null, state: "pending" };
    }
    const { order } = await ensureOrderForCheckoutSession(normalized);
    if (order) return { order, state: "ok" };
    // Fall back to a direct lookup.
    const existing = await getStore().getOrderBySessionId(sessionId);
    return existing
      ? { order: existing, state: "ok" }
      : { order: null, state: "pending" };
  } catch (err) {
    console.error("[school-inbox] confirmation resolve error", err);
    return { order: null, state: "pending" };
  }
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const { order, state } = await resolveOrder(session_id);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-[var(--border)] bg-[var(--canvas)]">
        <div className="shell flex h-[68px] items-center">
          <Wordmark href="/" />
        </div>
      </header>

      <main
        id="main"
        className="flex flex-1 items-center justify-center px-5 py-16"
      >
        <div className="w-full max-w-lg">
          {state === "ok" && order && (
            <>
              <AnalyticsBeacon
                event="checkout_completed"
                props={{ offer: "rescue" }}
              />
              <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-paper p-8 text-center shadow-[var(--shadow-md)] sm:p-10">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--sage-soft)] text-[var(--sage)]">
                  <CheckCircleIcon size={34} />
                </span>
                <h1 className="mt-6 text-[1.8rem] font-semibold text-ink">
                  Payment confirmed. Welcome.
                </h1>
                <p className="mt-3 text-[1rem] leading-relaxed text-ink-soft">
                  Thank you — your rescue is booked. There&rsquo;s one quick
                  step before we begin: a short onboarding where you add your
                  children and tell us what to expect. It takes under ten
                  minutes.
                </p>

                <div className="mt-6 flex items-center justify-center gap-2 rounded-md bg-[var(--sky)] px-4 py-3 text-[0.9rem] text-[#2c4a63]">
                  <ClockIcon size={17} />
                  Your delivery clock starts when your materials arrive — not
                  now.
                </div>

                <div className="mt-7">
                  <ButtonLink
                    href={`/onboarding/${order.onboarding_token}`}
                    size="lg"
                    className="w-full"
                    withArrow
                  >
                    Complete my onboarding
                  </ButtonLink>
                </div>
                <p className="mt-4 text-[0.85rem] text-ink-faint">
                  We&rsquo;ve also emailed this link to{" "}
                  {order.customer_email ? (
                    <span className="font-medium text-ink-soft">
                      {order.customer_email}
                    </span>
                  ) : (
                    "you"
                  )}
                  .
                </p>
              </div>
            </>
          )}

          {state === "pending" && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-paper p-8 text-center sm:p-10">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--gold-soft)] text-[#8a6d29]">
                <ClockIcon size={32} />
              </span>
              <h1 className="mt-6 text-[1.6rem] font-semibold text-ink">
                Confirming your payment…
              </h1>
              <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-soft">
                This can take a moment. Refresh this page shortly, or check your
                email for a confirmation and onboarding link.
              </p>
              <div className="mt-6">
                <ButtonLink href="/confirmation" variant="secondary">
                  Refresh
                </ButtonLink>
              </div>
            </div>
          )}

          {(state === "missing" || state === "unconfigured") && (
            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-paper p-8 text-center sm:p-10">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--surface-sunken)] text-ink-faint">
                <AlertIcon size={30} />
              </span>
              <h1 className="mt-6 text-[1.5rem] font-semibold text-ink">
                No checkout session found
              </h1>
              <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-soft">
                {state === "unconfigured"
                  ? "Checkout isn’t configured in this environment. This page confirms a completed Stripe payment."
                  : "We couldn’t find a payment to confirm. If you just paid, check your email for your onboarding link."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/get-started" variant="secondary">
                  Back to checkout
                </ButtonLink>
                <a
                  href={`mailto:${site.supportEmail}`}
                  className="inline-flex items-center rounded-md px-5 py-3 font-medium text-ink ring-1 ring-[var(--border-strong)]"
                >
                  Email support
                </a>
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-[0.85rem] text-ink-faint">
            <Link href="/" className="underline underline-offset-2">
              Return home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
