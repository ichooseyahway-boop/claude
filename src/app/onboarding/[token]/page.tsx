import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/shared/wordmark";
import { ButtonLink } from "@/components/shared/button";
import { AnalyticsBeacon } from "@/components/shared/analytics-beacon";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { CheckCircleIcon, AlertIcon } from "@/components/shared/icons";
import { getStore } from "@/lib/database";
import { getOffer } from "@/lib/config/offers";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Set up your School Inbox family workspace.",
  robots: { index: false, follow: false },
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-[var(--border)] bg-[var(--canvas)]">
        <div className="shell flex h-[68px] items-center justify-between">
          <Wordmark href="/" />
          <span className="text-[0.82rem] text-ink-faint">
            Secure onboarding
          </span>
        </div>
      </header>
      <main id="main" className="flex-1">
        <div className="shell max-w-2xl py-10 sm:py-14">{children}</div>
      </main>
    </div>
  );
}

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const store = getStore();
  const order = await store.getOrderByToken(token);

  if (!order) {
    return (
      <Frame>
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-paper p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--surface-sunken)] text-ink-faint">
            <AlertIcon size={28} />
          </span>
          <h1 className="mt-5 text-[1.5rem] font-semibold text-ink">
            This onboarding link isn&rsquo;t valid
          </h1>
          <p className="mt-3 text-[0.98rem] text-ink-soft">
            The link may be mistyped or expired. If you&rsquo;ve paid, check
            your confirmation email for the correct link, or contact us.
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
      </Frame>
    );
  }

  if (order.onboarding_status === "completed") {
    return (
      <Frame>
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-paper p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--sage-soft)] text-[var(--sage)]">
            <CheckCircleIcon size={28} />
          </span>
          <h1 className="mt-5 text-[1.5rem] font-semibold text-ink">
            Onboarding already complete
          </h1>
          <p className="mt-3 text-[0.98rem] text-ink-soft">
            You&rsquo;re all set. The next step is to send us your school, camp,
            and activity materials — check your email for where to send them.
          </p>
          <div className="mt-6">
            <ButtonLink href="/sample-briefing" variant="secondary">
              Revisit the sample briefing
            </ButtonLink>
          </div>
        </div>
      </Frame>
    );
  }

  const draft = await store.getOnboardingDraft(token);
  const offer = getOffer(order.offer_id as never);
  // Allow the plan's base children plus room for the paid add-on.
  const maxChildren = Math.max(
    offer.limits.children + 2,
    offer.limits.children,
  );

  return (
    <Frame>
      <AnalyticsBeacon event="onboarding_started" />
      <div className="mb-8">
        <p className="eyebrow">Welcome</p>
        <h1 className="mt-3 text-[clamp(1.7rem,4vw,2.4rem)] font-semibold leading-[1.1] text-ink">
          Let&rsquo;s set up your family workspace.
        </h1>
        <p className="mt-3 text-[1rem] leading-relaxed text-ink-soft">
          Under ten minutes. Your progress saves automatically, so you can pause
          and pick up where you left off from your emailed link.
        </p>
      </div>

      <OnboardingFlow
        token={token}
        customerEmail={order.customer_email ?? ""}
        initial={draft?.data ?? null}
        maxChildren={maxChildren}
      />

      <p className="mt-8 text-center text-[0.82rem] text-ink-faint">
        <Link href="/security" className="underline underline-offset-2">
          How we protect your information
        </Link>
      </p>
    </Frame>
  );
}
