/**
 * Site-wide brand and navigation configuration. Safe for client import.
 * The product name lives here, not scattered through components.
 */

export const site = {
  name: "School Inbox",
  wordmark: "School Inbox",
  tagline: "Human-verified school administration",
  description:
    "Forward the school emails, newsletters, screenshots, schedules, and " +
    "flyers. We turn them into one verified family calendar, action list, and " +
    "reminder plan — so nothing important quietly disappears.",
  // Contact addresses. Real launch replaces these; they are not fabricated
  // proof, just placeholders clearly owned by the operator.
  supportEmail: "hello@schoolinbox.example",
  privacyEmail: "privacy@schoolinbox.example",
  securityEmail: "security@schoolinbox.example",
  // Real, configurable capacity for the founding-family cohort (PRD §9.4 —
  // "availability must come from a real configurable capacity count").
  foundingFamilyCapacity: 10,
} as const;

export interface NavLink {
  href: string;
  label: string;
}

export const primaryNav: NavLink[] = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/sample-briefing", label: "Sample Briefing" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
];

export const footerNav: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Service",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/sample-briefing", label: "Sample Briefing" },
      { href: "/pricing", label: "Pricing" },
      { href: "/get-started", label: "Get Started" },
    ],
  },
  {
    heading: "Trust",
    links: [
      { href: "/security", label: "Security" },
      { href: "/faq", label: "FAQ" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/sign-in", label: "Sign In" },
      { href: "/get-started", label: "Start My Rescue" },
    ],
  },
];
