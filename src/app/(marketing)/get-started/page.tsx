import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/shared/ui";
import { CheckoutButton } from "@/components/marketing/checkout-button";
import { AnalyticsBeacon } from "@/components/shared/analytics-beacon";
import { Wordmark } from "@/components/shared/wordmark";
import {
  CheckIcon,
  LockIcon,
  ClockIcon,
  AlertIcon,
} from "@/components/shared/icons";
import { OFFERS, formatPrice } from "@/lib/config/offers";
import { env } from "@/lib/env";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Get Started",
  description:
    "Continue to secure checkout for your Back-to-School Inbox Rescue. Payment " +
    "handled by Stripe. You choose what to send after you purchase.",
  robots: { index: false, follow: true },
};

export default function GetStartedPage() {
  const offer = OFFERS.rescue;
  const configured = env.stripeConfigured();

  return (
    <Shell className="py-12 sm:py-16">
      <AnalyticsBeacon event="checkout_started" props={{ offer: "rescue" }} />
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        {/* Summary */}
        <div>
          <Wordmark href="/" />
          <h1 className="mt-8 text-[clamp(1.9rem,4vw,2.8rem)] font-semibold leading-[1.08] text-ink">
            You&rsquo;re one step from handing off the school year.
          </h1>
          <p className="measure mt-4 text-[1.05rem] leading-relaxed text-ink-soft">
            Here&rsquo;s exactly what happens next: pay securely, then
            you&rsquo;ll come straight back to onboard and tell us what to
            expect. You send materials on your schedule — the delivery clock
            starts when they arrive.
          </p>

          <ol className="mt-8 space-y-4">
            {[
              {
                t: "Secure checkout",
                b: "Pay with Stripe. We never see your card.",
              },
              {
                t: "Quick onboarding",
                b: "Under 10 minutes. Add up to two children and your preferences.",
              },
              {
                t: "Send your materials",
                b: "Forward or upload whatever you have — one batch or a few.",
              },
              {
                t: "Receive your verified rescue",
                b: "A calendar, action list, and reminders in 24–48 business hours.",
              },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[0.85rem] font-semibold text-paper tnum">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-ink">{s.t}</p>
                  <p className="text-[0.92rem] text-ink-soft">{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Checkout card */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-xl)] border border-ink/15 bg-paper p-7 shadow-[var(--shadow-md)] sm:p-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[1.2rem] font-semibold text-ink">
                {offer.name}
              </h2>
              <span className="font-serif text-[2rem] leading-none text-ink tnum">
                {formatPrice(offer)}
              </span>
            </div>
            <p className="mt-1 text-[0.9rem] text-ink-soft">{offer.tagline}</p>

            <ul className="mt-5 space-y-2 border-y border-[var(--border)] py-5">
              {[
                `Up to ${offer.limits.children} children and ${offer.limits.schools} schools`,
                `${offer.limits.sourceItems} source items reviewed`,
                "Verified 60–90-day calendar + action list",
                "Co-parent / caregiver access",
                "14 days of follow-up reminders",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckIcon
                    size={17}
                    className="mt-0.5 shrink-0 text-[var(--sage)]"
                  />
                  <span className="text-[0.92rem] text-ink-soft">{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center gap-3 text-[0.85rem] text-ink-soft">
              <ClockIcon size={16} className="text-ink-faint" />
              Delivered {offer.deliveryWindow}.
            </div>

            <div className="mt-6">
              {configured ? (
                <CheckoutButton
                  offer="rescue"
                  label="Continue to Secure Checkout"
                />
              ) : (
                <div className="flex items-start gap-2.5 rounded-md border border-dashed border-[var(--border-strong)] bg-canvas px-4 py-4">
                  <AlertIcon
                    size={17}
                    className="mt-0.5 shrink-0 text-ink-faint"
                  />
                  <p className="text-[0.9rem] leading-relaxed text-ink-soft">
                    Checkout isn&rsquo;t configured in this environment yet. Add
                    your Stripe keys from{" "}
                    <code className="rounded bg-[var(--surface-sunken)] px-1 py-0.5 text-[0.85em]">
                      .env.example
                    </code>{" "}
                    to enable payment.
                  </p>
                </div>
              )}
            </div>

            <p className="mt-5 flex items-center justify-center gap-2 text-[0.82rem] text-ink-faint">
              <LockIcon size={14} className="text-[var(--sage)]" />
              No inbox password. No school login.
            </p>
          </div>

          <p className="mt-4 text-center text-[0.82rem] text-ink-faint">
            Questions before paying?{" "}
            <Link href="/faq" className="underline underline-offset-2">
              Read the FAQ
            </Link>{" "}
            or{" "}
            <a
              href={`mailto:${site.supportEmail}`}
              className="underline underline-offset-2"
            >
              email us
            </a>
            .
          </p>
        </div>
      </div>
    </Shell>
  );
}
