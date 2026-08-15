import type { Metadata } from "next";
import { PageHeader } from "@/components/marketing/page-header";
import { Section, Card } from "@/components/shared/ui";
import { ButtonLink } from "@/components/shared/button";
import {
  ShieldIcon,
  LockIcon,
  UsersIcon,
  DocIcon,
  ClockIcon,
  AlertIcon,
  CheckCircleIcon,
  MailIcon,
} from "@/components/shared/icons";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Security & Privacy",
  description:
    "What School Inbox receives, what it never requests, how family access " +
    "works, our AI and human-review boundaries, retention and deletion — with " +
    "no compliance claims we haven't earned.",
};

const BLOCKS = [
  {
    icon: DocIcon,
    title: "What School Inbox receives",
    body: "Only the school, camp, and activity materials you choose to forward or upload: emails, newsletters, PDFs, screenshots, and photos of flyers. We process what you send us — nothing more.",
  },
  {
    icon: LockIcon,
    title: "What School Inbox does not request",
    body: "We never ask for your email password, never connect to your full Gmail or Outlook inbox, and never ask for school-portal credentials. We don’t scrape authenticated portals.",
  },
  {
    icon: UsersIcon,
    title: "How family access works",
    body: "Your workspace belongs to your family. You can invite a co-parent or caregiver to see the plan. Caregiver access is limited to what you share — it does not automatically expose every source document.",
  },
  {
    icon: ShieldIcon,
    title: "AI processing boundaries",
    body: "AI helps extract candidate items, but it works on your source content strictly as data. It cannot follow instructions hidden in an email, send messages, reach other families’ data, browse arbitrary links, or approve anything on its own.",
  },
  {
    icon: CheckCircleIcon,
    title: "Human-review model",
    body: "Consequential items — pickups, payments, consent forms, urgent or conflicting changes — are checked by a person against your original source before they’re published to you. High-risk items are never auto-published.",
  },
  {
    icon: ClockIcon,
    title: "Source retention and deletion",
    body: "Raw source materials are kept only for the published retention period after your rescue is delivered, then deleted. Your extracted plan remains while your account is active. You can request export or deletion at any time.",
  },
];

const CURRENT_CONTROLS = [
  "Payments handled by Stripe’s hosted checkout — we never store card data.",
  "Secrets kept server-side only, never shipped to the browser.",
  "Payment webhooks are signature-verified and processed idempotently.",
  "Private file storage with authorization required for access.",
  "Rate limiting on public forms and sensitive endpoints.",
  "Privileged operator actions are recorded in an audit log.",
  "Separate development and production data.",
];

const FUTURE_CONTROLS = [
  "Formal third-party security audit and penetration test.",
  "Published sub-processor list and signed data-processing terms.",
  "SSO and hardware-key options for operator accounts.",
  "Automated retention-deletion jobs with verifiable receipts.",
  "Regional data-residency options.",
];

export default function SecurityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Security & privacy"
        title="Your family information deserves restraint."
        intro="We ask for as little as possible, keep it for as short as possible, and put a person between AI output and anything consequential. Below is exactly what we do and don't do — stated plainly, with no certifications we haven't earned."
      />

      <Section>
        <div className="grid gap-5 md:grid-cols-2">
          {BLOCKS.map((b) => {
            const Icon = b.icon;
            return (
              <Card key={b.title} className="p-7">
                <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-[var(--sage-soft)] text-[var(--sage)]">
                  <Icon size={22} />
                </span>
                <h2 className="mt-4 text-[1.2rem] font-semibold text-ink">
                  {b.title}
                </h2>
                <p className="mt-2 text-[0.96rem] leading-relaxed text-ink-soft">
                  {b.body}
                </p>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* Children's privacy & prohibited materials */}
      <Section tone="paper">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--coral-soft)] px-3 py-1.5 text-[0.78rem] font-semibold text-[var(--coral)]">
              <AlertIcon size={15} /> Please don&rsquo;t send these
            </span>
            <h2 className="mt-5 text-[clamp(1.6rem,3.5vw,2.4rem)] font-semibold leading-[1.1] text-ink">
              Children&rsquo;s privacy and prohibited materials
            </h2>
            <p className="mt-4 text-[1rem] leading-relaxed text-ink-soft">
              School Inbox is designed for school logistics, not sensitive
              records. To keep everyone safe, please don&rsquo;t submit certain
              document types. If something sensitive arrives, we quarantine it
              and ask you to remove it.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              "Medical or health records",
              "Custody or legal documents",
              "Immigration paperwork",
              "Special-education (IEP) records",
              "Financial-account details",
              "Government identification numbers",
            ].map((x) => (
              <li
                key={x}
                className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-canvas px-4 py-4"
              >
                <AlertIcon
                  size={18}
                  className="mt-0.5 shrink-0 text-[var(--coral)]"
                />
                <span className="text-[0.94rem] text-ink-soft">{x}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Current vs future controls — clearly separated */}
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--sage)]/30 bg-[color-mix(in_srgb,var(--sage-soft)_40%,var(--paper))] p-7 sm:p-9">
            <h2 className="flex items-center gap-2 text-[1.3rem] font-semibold text-ink">
              <CheckCircleIcon size={22} className="text-[var(--sage)]" />
              Current controls
            </h2>
            <p className="mt-2 text-[0.9rem] text-ink-soft">In place today.</p>
            <ul className="mt-5 space-y-2.5">
              {CURRENT_CONTROLS.map((c) => (
                <li key={c} className="flex items-start gap-2.5">
                  <CheckCircleIcon
                    size={18}
                    className="mt-0.5 shrink-0 text-[var(--sage)]"
                  />
                  <span className="text-[0.94rem] text-ink-soft">{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-paper p-7 sm:p-9">
            <h2 className="flex items-center gap-2 text-[1.3rem] font-semibold text-ink">
              <ClockIcon size={22} className="text-ink-faint" />
              Not yet implemented
            </h2>
            <p className="mt-2 text-[0.9rem] text-ink-soft">
              On the roadmap — listed here so we never imply we have them today.
            </p>
            <ul className="mt-5 space-y-2.5">
              {FUTURE_CONTROLS.map((c) => (
                <li key={c} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint" />
                  <span className="text-[0.94rem] text-ink-soft">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-[0.9rem] text-ink-soft">
          We do not claim FERPA, COPPA, PIPEDA, SOC 2, or HIPAA compliance.
          Those require work and qualified review we have not completed, and we
          won&rsquo;t say otherwise.
        </p>
      </Section>

      {/* Incident contact */}
      <Section tone="ink">
        <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-semibold leading-[1.1] text-paper">
              Reporting a concern
            </h2>
            <p className="mt-4 max-w-lg text-[1rem] leading-relaxed text-[color-mix(in_srgb,var(--paper)_75%,transparent)]">
              If you believe your information was mishandled, or you spot a
              security issue, contact us directly. We take reports seriously and
              will respond.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <a
              href={`mailto:${site.securityEmail}`}
              className="inline-flex items-center gap-2 rounded-md bg-paper px-5 py-3.5 font-medium text-ink"
            >
              <MailIcon size={18} />
              {site.securityEmail}
            </a>
            <ButtonLink
              href="/privacy"
              variant="ghost"
              className="!text-paper hover:!bg-white/10"
            >
              Read the privacy policy
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
