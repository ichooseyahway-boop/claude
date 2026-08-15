export interface FaqItem {
  q: string;
  a: string;
}

/** PRD §9.3 Section 9 — required FAQs, answered honestly and specifically. */
export const FAQS: FaqItem[] = [
  {
    q: "Do you need access to my entire email inbox?",
    a: "No. School Inbox never connects to your full Gmail or Outlook account and never asks for your inbox password. You choose exactly what to forward or upload — nothing more. This is a deliberate boundary, not a limitation we plan to remove.",
  },
  {
    q: "Can I send screenshots and PDFs?",
    a: "Yes. Forward emails and newsletters, upload PDFs, and send screenshots or photos of paper flyers. If a date or detail is only legible in an image, we read it and, when it matters, verify it against what you sent.",
  },
  {
    q: "Will you sign forms or make payments for me?",
    a: "No. We surface the form, the deadline, the cost, and the link — but you stay in control. School Inbox never signs a form, grants consent, pays money, or replies to the school on your behalf without your explicit authorization.",
  },
  {
    q: "What happens when a date is unclear?",
    a: "We flag it rather than guess. If a flyer says “next Thursday” with no date or year, that item is held as “Clarification needed” and shown to you for confirmation. We never manufacture a firm date from vague text.",
  },
  {
    q: "Can my co-parent or caregiver receive the plan?",
    a: "Yes. Your rescue includes co-parent or caregiver access so the same clear plan reaches the people who need it — without you having to re-explain everything.",
  },
  {
    q: "How quickly is the rescue completed?",
    a: "We deliver your verified calendar and action list within 24–48 business hours after we receive all of your materials. The clock starts when your materials arrive, not at purchase.",
  },
  {
    q: "What information should I not send?",
    a: "Please don’t send medical, custody, immigration, legal, special-education, or financial-account documents. School Inbox is for school, camp, and activity administration only. If something sensitive arrives, we quarantine it and ask you to remove it.",
  },
  {
    q: "How do I delete my information?",
    a: "You can request export or deletion at any time. Raw source materials are retained only for the published policy period after your rescue is delivered, then deleted. Deletion requests are completed within the published policy window.",
  },
  {
    q: "Is this service operated by my child’s school?",
    a: "No. School Inbox is an independent service you hire directly. We are not affiliated with, endorsed by, or operated by any school or district, and we don’t communicate with your school on your behalf.",
  },
];
