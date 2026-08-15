/**
 * Realistic but entirely FICTIONAL preview data. Used only in clearly-labelled
 * product previews and the sample briefing. This is never a real customer
 * account and must always be presented as a demonstration (PRD §9.3 Section 1).
 */

export type ItemStatus = "needs_attention" | "open" | "completed" | "clarify";
export type ItemKind =
  | "form"
  | "payment"
  | "event"
  | "schedule_change"
  | "bring_buy_wear"
  | "rsvp"
  | "reference";

export interface ChildLabel {
  id: string;
  label: string;
  /** CSS var token name for the child colour chip. */
  colorVar: string;
  grade: string;
}

export const SAMPLE_CHILDREN: ChildLabel[] = [
  { id: "c1", label: "R.", colorVar: "--sage", grade: "Grade 4" },
  { id: "c2", label: "Sam", colorVar: "--gold", grade: "Grade 1" },
];

export interface SampleItem {
  id: string;
  childId: string;
  kind: ItemKind;
  title: string;
  when: string;
  status: ItemStatus;
  assignee: string;
  /** The source this was extracted from — traceability is always visible. */
  source: {
    label: string;
    excerpt: string;
    received: string;
  };
  verified: boolean;
  /** For schedule changes: the value this supersedes. */
  supersedes?: string;
  cost?: string;
  actionUrl?: boolean;
}

export const SAMPLE_ITEMS: SampleItem[] = [
  {
    id: "i1",
    childId: "c2",
    kind: "form",
    title: "Field-trip permission form due — Riverside Aquarium",
    when: "Return by Fri, Sep 12",
    status: "needs_attention",
    assignee: "You",
    verified: true,
    cost: "$14.00",
    actionUrl: true,
    source: {
      label: "Grade 1 Newsletter (PDF)",
      excerpt:
        "Signed permission slips and the $14 trip fee must be returned to the " +
        "office no later than Friday, September 12.",
      received: "Received Sep 4",
    },
  },
  {
    id: "i2",
    childId: "c1",
    kind: "schedule_change",
    title: "Early dismissal moved to 1:15 PM",
    when: "Thu, Sep 18 · 1:15 PM",
    status: "needs_attention",
    verified: true,
    assignee: "You + co-parent",
    supersedes: "Previously listed as 2:45 PM",
    source: {
      label: "School email — Office",
      excerpt:
        "Please note the revised early-dismissal time of 1:15 PM (updated from " +
        "the 2:45 PM listed in the September calendar).",
      received: "Received Sep 9",
    },
  },
  {
    id: "i3",
    childId: "c1",
    kind: "bring_buy_wear",
    title: "Wear team colours (blue) for spirit day",
    when: "Wed, Sep 17",
    status: "open",
    verified: true,
    assignee: "You",
    source: {
      label: "Class group-chat screenshot",
      excerpt: "Reminder: spirit day Wednesday — everyone in blue! 💙",
      received: "Received Sep 8",
    },
  },
  {
    id: "i4",
    childId: "c2",
    kind: "payment",
    title: "Hot-lunch program registration",
    when: "Registration closes Sep 20",
    status: "open",
    verified: true,
    assignee: "Co-parent",
    cost: "$62.50",
    actionUrl: true,
    source: {
      label: "Lunch provider email",
      excerpt:
        "Term 1 hot-lunch orders close September 20. Orders placed after this " +
        "date begin in Term 2.",
      received: "Received Sep 2",
    },
  },
  {
    id: "i5",
    childId: "c1",
    kind: "event",
    title: "Meet-the-teacher evening",
    when: "Tue, Sep 23 · 6:30–7:30 PM",
    status: "completed",
    verified: true,
    assignee: "You",
    source: {
      label: "School email — Principal",
      excerpt:
        "Our Meet-the-Teacher evening will be held Tuesday, September 23 from " +
        "6:30 to 7:30 PM in the gymnasium.",
      received: "Received Aug 29",
    },
  },
  {
    id: "i6",
    childId: "c2",
    kind: "event",
    title: "Picture day — date needs confirmation",
    when: "“Next Thursday” — year/date unclear",
    status: "clarify",
    verified: false,
    assignee: "Awaiting your confirmation",
    source: {
      label: "Paper flyer (photo)",
      excerpt: "Picture day is next Thursday! Order forms coming home soon.",
      received: "Received Sep 10",
    },
  },
];

export function itemsByStatus(status: ItemStatus): SampleItem[] {
  return SAMPLE_ITEMS.filter((i) => i.status === status);
}

export function childFor(childId: string): ChildLabel {
  return SAMPLE_CHILDREN.find((c) => c.id === childId) ?? SAMPLE_CHILDREN[0]!;
}

export const KIND_LABEL: Record<ItemKind, string> = {
  form: "Form",
  payment: "Payment",
  event: "Event",
  schedule_change: "Schedule change",
  bring_buy_wear: "Bring / wear",
  rsvp: "RSVP",
  reference: "Reference",
};
