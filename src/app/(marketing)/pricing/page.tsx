import type { Metadata } from "next";
import { PageHeader } from "@/components/marketing/page-header";
import { Section } from "@/components/shared/ui";
import { OfferCard } from "@/components/marketing/offer-card";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { AnalyticsBeacon } from "@/components/shared/analytics-beacon";
import { CheckCircleIcon, AlertIcon } from "@/components/shared/icons";
import {
  OFFERS,
  SOURCE_ITEM_DEFINITION,
  ADDITIONAL_CHILD_ADDON,
} from "@/lib/config/offers";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start with a one-time Back-to-School Inbox Rescue ($149). Continue with " +
    "School Inbox Care. Transparent limits, delivery time, and what's included.",
};

const BILLING_FAQS = [
  {
    q: "When does the delivery clock start?",
    a: "Your 24–48 business-hour turnaround begins when we have received all of your materials — not at the moment of purchase. We’ll confirm when the clock starts.",
  },
  {
    q: "What if I have more than two children or schools?",
    a: `The Rescue covers up to two children and two schools. Additional children or schools are ${`$${ADDITIONAL_CHILD_ADDON.priceUSD}`} each per rescue. We’ll confirm the total before any additional charge.`,
  },
  {
    q: "How does cancellation work?",
    a: "The Rescue is a one-time service. School Inbox Care (monthly) can be cancelled at any time and stays active through the end of the current billing period; you are not charged again after cancelling.",
  },
  {
    q: "Do you store my card details?",
    a: "No. Payment is handled entirely by Stripe on their hosted, PCI-compliant checkout. We never see or store your card number.",
  },
];

export default function PricingPage() {
  return (
    <>
      <AnalyticsBeacon event="pricing_viewed" />
      <PageHeader
        eyebrow="Pricing"
        title="One clear price to start. Continue only if it earns it."
        intro="Begin with a one-time rescue that does the setup and verification for you. If it saves you the scramble, continue with ongoing Care. Pricing is transparent — limits, turnaround, and boundaries are all listed."
      />

      <Section>
        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          <OfferCard offer={OFFERS.rescue} featured />
          <OfferCard offer={OFFERS.care} />
          <OfferCard offer={OFFERS.care_plus} />
        </div>

        <p className="mt-6 text-center text-[0.88rem] text-ink-faint">
          Monthly Care and Care Plus prices are a current proposal and may be
          refined. Care continues after your rescue, with the family portal.
        </p>
      </Section>

      {/* Source item definition + what's not included */}
      <Section tone="paper">
        <div className="grid gap-6 lg:grid-cols-2">
          <div
            id="care"
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-canvas p-7 sm:p-9"
          >
            <h2 className="text-[1.4rem] font-semibold text-ink">
              What counts as a source item
            </h2>
            <p className="mt-3 text-[1rem] leading-relaxed text-ink-soft">
              {SOURCE_ITEM_DEFINITION}
            </p>
            <div className="mt-6 rounded-[var(--radius-md)] bg-[var(--sky)] px-5 py-4">
              <p className="text-[0.92rem] text-[#2c4a63]">
                <strong>Additional child or school:</strong> $
                {ADDITIONAL_CHILD_ADDON.priceUSD} per rescue. Configurable — and
                confirmed with you before any extra charge.
              </p>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-canvas p-7 sm:p-9">
            <h2 className="text-[1.4rem] font-semibold text-ink">
              What is not included
            </h2>
            <ul className="mt-4 space-y-2.5 text-[0.96rem] text-ink-soft">
              {[
                "Signing forms, granting consent, or paying schools for you.",
                "Connecting to your full inbox or a school portal.",
                "Grades, assignments, or academic-performance tracking.",
                "Medical, custody, legal, or special-education documents.",
                "Communicating with your school on your behalf.",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2.5">
                  <AlertIcon
                    size={17}
                    className="mt-0.5 shrink-0 text-ink-faint"
                  />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Founding-family capacity — real, configurable count. */}
      <Section>
        <div className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-paper p-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--gold-soft)] px-3 py-1.5 text-[0.78rem] font-semibold text-[#8a6d29]">
            <CheckCircleIcon size={15} /> Founding-family cohort
          </span>
          <p className="mt-4 text-[1.1rem] leading-relaxed text-ink">
            We take a small number of founding families each term so every
            rescue gets full attention. The current cohort is capped at{" "}
            <strong className="tnum">{site.foundingFamilyCapacity}</strong>{" "}
            families.
          </p>
          <p className="mt-2 text-[0.9rem] text-ink-soft">
            This is a real operational limit, not a countdown gimmick.
          </p>
        </div>
      </Section>

      <Section tone="paper">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-[clamp(1.7rem,3.5vw,2.4rem)] font-semibold text-ink">
            Billing questions
          </h2>
          <div className="mt-8">
            <FaqAccordion items={BILLING_FAQS} />
          </div>
        </div>
      </Section>
    </>
  );
}
