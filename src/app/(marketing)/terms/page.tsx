import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of School Inbox, including service scope, " +
    "acceptable use, and boundaries. Draft pending legal review.",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="August 15, 2026"
      intro="These terms govern your use of School Inbox. They describe what the service does, what it does not do, and the responsibilities of each party. By purchasing or using the service, you agree to these terms."
      sections={[
        {
          heading: "The service",
          body: (
            <p>
              School Inbox is a human-verified school-administration service. We
              turn the school, camp, and activity materials you send us into a
              calendar, prioritized action list, and reminders. We are an
              independent service and are not affiliated with, endorsed by, or
              operated by any school or district.
            </p>
          ),
        },
        {
          heading: "What we do not do",
          body: (
            <ul>
              <li>
                We do not sign forms, grant consent, or make payments to schools
                on your behalf.
              </li>
              <li>We do not reply to teachers or administrators for you.</li>
              <li>
                We do not connect to your full email inbox or a school portal.
              </li>
              <li>
                We do not provide legal, medical, financial, or educational
                advice.
              </li>
            </ul>
          ),
        },
        {
          heading: "Your responsibilities",
          body: (
            <p>
              You are responsible for the accuracy of the materials you send and
              for the final decisions and actions taken from your plan. You
              agree not to submit prohibited materials, including medical,
              custody, legal, immigration, special-education, or
              financial-account documents. You confirm you are an adult
              authorized to manage the children referenced in your account.
            </p>
          ),
        },
        {
          heading: "Accuracy and verification",
          body: (
            <p>
              We verify consequential items and flag ambiguity, and we aim for a
              high standard of accuracy. Even so, the service is a preparation
              and organization aid, not a guarantee. You should confirm critical
              details against original school communications. We are not liable
              for missed events or deadlines arising from incomplete or
              inaccurate source materials.
            </p>
          ),
        },
        {
          heading: "Payment and delivery",
          body: (
            <p>
              Prices are shown at checkout and processed by Stripe. The one-time
              Rescue is delivered within 24–48 business hours after we receive
              all of your materials. Where a subscription is offered, it renews
              until cancelled and can be cancelled at any time, remaining active
              through the current billing period.
            </p>
          ),
        },
        {
          heading: "Refunds and cancellation",
          body: (
            <p>
              If we cannot deliver your rescue, or if you cancel before we begin
              work, you are entitled to a refund of the rescue fee.
              Subscriptions can be cancelled at any time and are not charged
              again after cancellation. Specific refund terms will be finalized
              before public launch.
            </p>
          ),
        },
        {
          heading: "Acceptable use",
          body: (
            <p>
              You agree not to misuse the service, submit unlawful content, or
              attempt to access another family&rsquo;s information. We may
              suspend accounts that violate these terms or submit prohibited
              materials.
            </p>
          ),
        },
        {
          heading: "Changes and contact",
          body: (
            <p>
              We may update these terms; material changes will be communicated
              before they take effect. Questions about these terms can be sent
              to <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
