/**
 * English (Canada) message catalogue — the source of truth for message keys.
 *
 * `fr-CA.ts` is typed against this object, so adding a key here without adding
 * it there is a compile error. That is the mechanism behind FR-I18N-001's
 * requirement that a released French page never silently shows English draft
 * text, and behind the launch gate's "French missing-key count: zero".
 *
 * Copy rules that are not negotiable (PRD 4.4, FR-MKT-005):
 *   - No compliance, certification or "guaranteed" claims.
 *   - No invented customers, logos, testimonials or metrics.
 *   - Nothing that implies the report is a legal opinion or a security audit.
 */

export const enCA = {
  common: {
    brandName: 'BotAssure CX',
    skipToContent: 'Skip to main content',
    languageSwitcherLabel: 'Language',
    loading: 'Loading',
    errorTitle: 'Something went wrong',
    errorBody:
      'The page could not be loaded. Please try again, or contact support if the problem continues.',
    notFoundTitle: 'Page not found',
    notFoundBody: 'The page you asked for does not exist or has moved.',
    backToHome: 'Back to home',
  },

  nav: {
    home: 'Home',
    howItWorks: 'How it works',
    methodology: 'Methodology',
    pricing: 'Pricing',
    sampleReport: 'Sample report',
    security: 'Security and privacy',
    about: 'About',
    contact: 'Contact',
    faq: 'FAQ',
    signIn: 'Sign in',
    startAudit: 'Start an audit',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },

  home: {
    metaTitle: 'Bilingual AI customer-experience assurance for Canadian businesses',
    metaDescription:
      'BotAssure CX tests customer-facing AI in English and Canadian French, with documented evidence and mandatory human review, so you find the failures before your customers do.',
    category: 'Bilingual AI customer-experience testing and assurance',
    headline: 'Find the failures before your customers do',
    subhead:
      'We test your customer-facing AI against real service scenarios in English and Canadian French, document what actually happened, and hand you a prioritized list of what to fix.',
    primaryCta: 'Start an audit',
    secondaryCta: 'View a sample report',

    whatWeTestTitle: 'What we test',
    whatWeTestIntro:
      'Every audit works from your own policies. We check whether the system tells your customers the truth, resolves their problem, and knows when to bring in a human.',
    whatWeTest: [
      {
        title: 'Factual and policy accuracy',
        body: 'Does the answer match your authoritative policy, or has the system invented a rule that does not exist?',
      },
      {
        title: 'Resolution and task completion',
        body: 'Does the conversation move the customer toward a correct, practical outcome, or just sound helpful?',
      },
      {
        title: 'Safety and privacy',
        body: 'Does it avoid unsafe guidance, unnecessary data collection and disclosure it should never make?',
      },
      {
        title: 'Escalation and human handoff',
        body: 'Does it recognize its limits and route the customer to the right human channel?',
      },
      {
        title: 'Context and conversation memory',
        body: 'Does it hold on to what the customer already said, or contradict itself three turns later?',
      },
      {
        title: 'Empathy and brand tone',
        body: 'Is it respectful and clear when the customer is frustrated, confused or in a hurry?',
      },
      {
        title: 'Language and cultural fit',
        body: 'Is the Canadian French natural and equivalent to the English, or a literal translation that loses the meaning?',
      },
    ],

    processTitle: 'Three steps',
    process: [
      {
        step: '1',
        title: 'Scope and authorize',
        body: 'You tell us which system to test, which policies are authoritative, and confirm in writing that you can authorize the test.',
      },
      {
        step: '2',
        title: 'Test and review',
        body: 'We run the scenarios, capture every response as evidence, and an analyst reviews every result before anything reaches your report.',
      },
      {
        step: '3',
        title: 'Fix and retest',
        body: 'You get evidence-linked findings ranked by severity, with specific remediation. When you have fixed them, we retest.',
      },
    ],

    bilingualTitle: 'English and French, assessed independently',
    bilingualBody:
      'Most testing treats French as a translation problem. We run matched scenario pairs in both languages and compare them directly, because a French-speaking customer receiving a different answer is a service failure, not a localization detail.',

    humanReviewTitle: 'Every finding is reviewed by a person',
    humanReviewBody:
      'Automated checks and AI assistance narrow the field. They do not decide. An analyst reviews every scored dimension and adjudicates every critical and high finding before a report is released. Nothing reaches you on a model’s say-so alone.',

    limitationsTitle: 'What this is, and what it is not',
    limitationsBody:
      'A BotAssure CX report is a customer-experience and risk-assurance assessment of a defined sample at a point in time. It is not a legal opinion, a security certification, a penetration test or a regulatory compliance certificate. AI systems are probabilistic and may answer the same question differently, and an audit cannot prove the absence of undiscovered defects.',

    finalCtaTitle: 'Ready to see what your customers are actually being told?',
    finalCtaBody: 'Start with a single system and one language, or go bilingual from the start.',
  },

  pricing: {
    metaTitle: 'Pricing',
    metaDescription:
      'One-time bilingual AI customer-experience audits and continuous assurance subscriptions, priced in Canadian dollars.',
    title: 'Pricing',
    intro:
      'Prices are in Canadian dollars and shown before tax. Applicable tax is calculated at checkout.',
    perMonth: 'per month',
    oneTime: 'one-time',
    customQuote: 'Custom quote',
    choosePlan: 'Choose this package',
    contactSales: 'Talk to us',
    mostPopular: 'Most popular',
    includedLabel: 'Includes',
    taxNote: 'Plus applicable tax. Turnaround targets begin after onboarding is complete.',
    turnaroundNote:
      'We use target turnaround rather than a guarantee. The clock starts after payment and accepted onboarding, and pauses while we are waiting on you.',
  },

  methodology: {
    metaTitle: 'Methodology',
    metaDescription:
      'How BotAssure CX scores customer-facing AI: seven weighted dimensions, deterministic checks, AI-assisted analysis and mandatory human review.',
    title: 'How we score',
    intro:
      'The method is meant to be understandable, repeatable and honest about uncertainty. Every number in a report traces back to a specific response and a specific policy.',
    dimensionsTitle: 'Seven dimensions',
    dimensionsIntro:
      'Each applicable dimension is scored 0 to 5 and weighted. A dimension that does not apply to a scenario is excluded from that scenario’s denominator, with the reason recorded.',
    dimensionHeader: 'Dimension',
    weightHeader: 'Weight',
    questionHeader: 'Core question',
    gradesTitle: 'Grades',
    gradesIntro:
      'Grades describe the tested scope and time only. They are not certifications and do not transfer to untested parts of your system.',
    capsTitle: 'Severity caps',
    capsBody:
      'An average can hide serious harm, so it is not allowed to. A confirmed critical finding caps the overall score at 49 and the grade at F. An unresolved high finding in factual accuracy, privacy and safety, or required escalation caps the score at 69 and the grade at D. When a cap applies, the report says so and says why.',
    parityTitle: 'Bilingual parity',
    parityBody:
      'Matched English and French cases are compared directly. The parity index is 100 minus the weighted average gap between the two scores. Below ten valid matched pairs we do not publish a number at all — you get a written assessment instead, because a parity score computed from three pairs would imply a precision we do not have.',
    limitationsTitle: 'Stated limitations',
    limitations: [
      'Results reflect a defined sample, configuration and point in time.',
      'Probabilistic systems may respond differently to the same prompt.',
      'The audit does not prove the absence of undiscovered defects.',
      'Findings depend on the accuracy of the policies you provide.',
      'The audit is not legal advice, a penetration test or a regulatory certification.',
      'Changes you make to production after testing can invalidate the results.',
    ],
  },

  security: {
    metaTitle: 'Security and privacy practices',
    metaDescription:
      'How BotAssure CX handles authorization, synthetic test data, tenant isolation, retention and incident response.',
    title: 'Security and privacy practices',
    intro:
      'This page describes what we actually do. It is not a certification and does not claim one.',
    sections: [
      {
        title: 'We test only what you authorize',
        body: 'Before any test runs, you confirm in writing that you own the system or are authorized to commission the test, and you define the scope. Testing stops if authorization expires or is revoked, if the target moves outside the agreed scope, or if your system shows signs of distress.',
      },
      {
        title: 'Synthetic data by default',
        body: 'Test identities, addresses, order numbers and account identifiers are synthetic and marked as test data. We do not ask for real customer records to run an audit, and we block known real payment card and government identifier formats unless you have an approved exception.',
      },
      {
        title: 'Your data is separated from every other customer’s',
        body: 'Each organization is a separate tenant, enforced in the database with row-level security as well as in the application. Cross-tenant access is covered by an automated test suite that runs before every release.',
      },
      {
        title: 'Your transcripts are not training data',
        body: 'Raw transcripts are never reused to train models without separate, explicit, recorded permission. Provider settings are configured so API content is not used for general model training where that option exists.',
      },
      {
        title: 'Retention has a default and an end',
        body: 'Raw transcripts and screenshots are deleted 90 days after report release by default. Released reports and findings are kept for the active service period plus 24 months so you can export them. You can request earlier deletion where contract and law allow.',
      },
      {
        title: 'Incidents',
        body: 'We keep a breach register even for incidents below reporting thresholds, and we do not automate a legal notification decision. If something affects your data, a person tells you.',
      },
    ],
  },

  legal: {
    reviewPendingTitle: 'This document is under legal review',
    reviewPendingBody:
      'This is a working draft and has not yet been approved by Canadian counsel. It is not legal advice and must not be relied on as a final agreement. It is published here so the terms are visible while review is completed.',
    termsTitle: 'Terms of service',
    privacyTitle: 'Privacy policy',
    acceptableUseTitle: 'Acceptable use and authorized testing policy',
    refundsTitle: 'Refund and cancellation policy',
    cookiesTitle: 'Cookie choices',
    lastUpdated: 'Last updated',
  },

  footer: {
    tagline: 'Bilingual AI customer-experience assurance.',
    workingNameNotice:
      'BotAssure CX is a working name pending trademark, domain and corporate-name clearance.',
    legalHeading: 'Legal',
    productHeading: 'Product',
    companyHeading: 'Company',
    terms: 'Terms',
    privacy: 'Privacy',
    acceptableUse: 'Acceptable use',
    refunds: 'Refunds',
    cookies: 'Cookie choices',
    status: 'Status',
    support: 'Support',
    allRightsReserved: 'All rights reserved.',
  },
};

/**
 * The catalogue shape every locale must satisfy.
 *
 * Derived from the English catalogue so the two can never drift: a new key in
 * English becomes a required key everywhere else.
 *
 * Note the absence of `as const`. With it, `typeof enCA` would carry the
 * English string *literals*, and the French catalogue would only typecheck if
 * it were an identical copy of the English one.
 */
export type Messages = typeof enCA;
