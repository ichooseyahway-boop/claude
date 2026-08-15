import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How School Inbox collects, uses, retains, and deletes the information you " +
    "send. Draft pending legal review.",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="August 15, 2026"
      intro="This policy describes what information School Inbox collects, why, how long we keep it, and the control you have over it. We practice data minimization: we ask for as little as possible and keep it only as long as needed."
      sections={[
        {
          heading: "Information we collect",
          body: (
            <>
              <p>We collect only what you provide:</p>
              <ul>
                <li>
                  Account details you enter during onboarding — your name,
                  email, and time zone.
                </li>
                <li>
                  Child labels you choose — a nickname or initials, a school
                  label, and a grade label. We do not require a child&rsquo;s
                  full legal name and do not collect dates of birth.
                </li>
                <li>
                  The school, camp, and activity materials you forward or upload
                  so we can prepare your plan.
                </li>
                <li>
                  Payment status from our processor (Stripe). We never receive
                  or store your card number.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "What we do not collect",
          body: (
            <p>
              We do not connect to your full email inbox, do not ask for
              school-portal passwords, and do not request medical, custody,
              legal, immigration, special-education, or financial-account
              documents. Please do not send those materials.
            </p>
          ),
        },
        {
          heading: "How we use your information",
          body: (
            <p>
              We use the materials you send to extract dates, actions, links,
              and requirements; to verify consequential details; and to deliver
              your calendar, action list, and reminders. We use your contact
              details to deliver the service and send transactional messages
              about your order. We do not sell your information.
            </p>
          ),
        },
        {
          heading: "AI processing",
          body: (
            <p>
              We use automated tools to help extract information from your
              materials. Your content is treated strictly as data to be
              processed, never as instructions to our systems. Consequential
              items are checked by a person before publication.
            </p>
          ),
        },
        {
          heading: "Retention and deletion",
          body: (
            <p>
              Raw source materials and attachments are retained only for the
              published retention period after your rescue is delivered, then
              deleted, unless you delete them sooner or a documented dispute
              requires a hold. Your extracted plan is retained while your
              account is active. You may request export or deletion of your
              information at any time by emailing{" "}
              <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a>.
            </p>
          ),
        },
        {
          heading: "Sharing with caregivers",
          body: (
            <p>
              If you invite a co-parent or caregiver, they can see the plan you
              share with them. Caregiver access is limited and does not
              automatically include every source document.
            </p>
          ),
        },
        {
          heading: "Service providers",
          body: (
            <p>
              We rely on a small number of vendors to operate — for example, a
              payment processor and an email-delivery provider. They process
              information only to provide their service to us. A complete
              sub-processor list will be published before public launch.
            </p>
          ),
        },
        {
          heading: "Children’s privacy",
          body: (
            <p>
              School Inbox is a tool for parents and guardians, not for
              children. Accounts require a verified adult. We intentionally
              minimize child-related data by using labels rather than full
              identities.
            </p>
          ),
        },
        {
          heading: "Your choices and contact",
          body: (
            <p>
              You can request access, export, correction, or deletion of your
              information. For any privacy question or request, contact{" "}
              <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a>. A
              Canadian and U.S. state privacy review will be completed before
              public launch.
            </p>
          ),
        },
      ]}
    />
  );
}
