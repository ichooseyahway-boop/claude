import type { Metadata } from "next";
import { PageHeader } from "@/components/marketing/page-header";
import { Section } from "@/components/shared/ui";
import { ButtonLink } from "@/components/shared/button";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FAQS } from "@/lib/config/faq";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to the questions parents ask before starting a School Inbox " +
    "rescue — access, formats, boundaries, timing, and deletion.",
};

export default function FaqPage() {
  return (
    <>
      <PageHeader
        eyebrow="Questions"
        title="Everything parents ask before they start."
        intro="Honest, specific answers. If yours isn't here, email us — a person will reply."
      />
      <Section>
        <div className="mx-auto max-w-3xl">
          <FaqAccordion items={FAQS} />

          <div className="mt-10 flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-paper p-8 text-center">
            <p className="text-[1.05rem] text-ink">
              Still deciding? We&rsquo;re happy to answer directly.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href="/get-started" size="lg" withArrow>
                Start My Inbox Rescue
              </ButtonLink>
              <a
                href={`mailto:${site.supportEmail}`}
                className="inline-flex items-center gap-2 rounded-md px-5 py-3.5 font-medium text-ink ring-1 ring-[var(--border-strong)] hover:bg-[var(--surface-sunken)]"
              >
                Email {site.supportEmail}
              </a>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
