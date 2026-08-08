/**
 * English (Canada) message catalog — the source of truth for catalog shape.
 *
 * PRD refs: FR-I18N-001, FR-MKT-001..005.
 *
 * `fr-CA.ts` is typed as `Messages`, so a missing or renamed key fails
 * `npm run typecheck` rather than shipping an untranslated string
 * (23.4: "No untranslated production strings").
 *
 * Copy rules enforced here (section 4.4 Brand guardrails):
 *   - No compliance, certification or guaranteed-outcome claims.
 *   - No invented customers, testimonials, logos or benchmark numbers.
 */
export const enCA = {
  meta: {
    localeName: 'English',
    localeNameOther: 'Français',
    switchLanguage: 'Switch to French',
    defaultDescription:
      'Bilingual testing and assurance for customer-facing AI. Structured scenarios, documented evidence and human-reviewed reports in English and Canadian French.',
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
    skipToContent: 'Skip to main content',
    mainNavigation: 'Main navigation',
    footerNavigation: 'Footer navigation',
  },

  common: {
    learnMore: 'Learn more',
    viewSampleReport: 'View a sample report',
    startAudit: 'Start an audit',
    bookCall: 'Book a discovery call',
    contactUs: 'Contact us',
    seePricing: 'See pricing',
    required: 'Required',
    optional: 'Optional',
    submit: 'Submit',
    sending: 'Sending…',
    backToTop: 'Back to top',
    lastUpdated: 'Last updated',
    onThisPage: 'On this page',
    perMonth: 'per month',
    oneTime: 'one-time',
    plusTax: 'plus applicable tax',
    customQuote: 'Custom quote',
    startingAt: 'Starting at',
  },

  footer: {
    tagline: 'Bilingual AI customer-experience assurance for Canadian businesses.',
    product: 'Product',
    company: 'Company',
    legal: 'Legal',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    acceptableUse: 'Acceptable Use and Authorized Testing',
    refunds: 'Refund Policy',
    cookies: 'Cookie choices',
    status: 'Service status',
    support: 'Support',
    rights: 'All rights reserved.',
    workingNameNotice:
      '{brand} is a working product name. Trademark, corporate-name and domain clearance are in progress.',
    notCertification:
      'A {brand} report is a customer-experience and risk-assurance assessment. It is not a legal opinion, a security certification or a regulatory compliance certificate.',
  },

  home: {
    metaTitle: 'Bilingual AI customer-experience assurance',
    eyebrow: 'Bilingual AI customer-experience testing and assurance',
    headline: 'Find the failures before your customers do.',
    subhead:
      'Your customer-facing AI answers thousands of questions you never see. We test it with real service scenarios in English and Canadian French, document what actually happened, and give you an evidence-linked report a human analyst has reviewed.',
    primaryCta: 'Start an audit',
    secondaryCta: 'View a sample report',
    trustLine:
      'Human-reviewed. Evidence-linked. Tested only with your written authorization.',

    whatWeTestTitle: 'What we test',
    whatWeTestIntro:
      'Every audit runs structured scenarios against the system you authorize, then scores each response across seven dimensions.',
    whatWeTest: [
      {
        title: 'Factual and policy accuracy',
        body: 'Does the answer match your own authoritative policies, or has the system invented a rule that does not exist?',
      },
      {
        title: 'Resolution effectiveness',
        body: 'Does the conversation move the customer toward a correct, practical outcome instead of a loop?',
      },
      {
        title: 'Safety and privacy',
        body: 'Does it avoid unsafe guidance, unnecessary data collection and disclosure of information it should not share?',
      },
      {
        title: 'Escalation and handoff',
        body: 'Does it recognize its limits and route the customer to the right human channel?',
      },
      {
        title: 'Context and memory',
        body: 'Does it hold on to relevant facts across turns without contradicting itself?',
      },
      {
        title: 'Empathy and brand tone',
        body: 'Is it respectful, clear and appropriate to how the customer is feeling?',
      },
      {
        title: 'Language and cultural fit',
        body: 'Is the French natural for Canadian readers, and equivalent in substance to the English answer?',
      },
    ],

    processTitle: 'Three steps',
    process: [
      {
        step: '1',
        title: 'Authorize and scope',
        body: 'You confirm you own or are authorized to test the system, tell us which policies are authoritative, and choose English, French or both.',
      },
      {
        step: '2',
        title: 'We test and document',
        body: 'An analyst runs the approved scenario set, captures each response with a timestamp and checksum, and reviews every result. AI assists with scoring; it never has the last word.',
      },
      {
        step: '3',
        title: 'You get an evidence-linked report',
        body: 'A score with dimension breakdowns, findings ranked by severity, every claim linked to the response that supports it, and remediation you can actually act on.',
      },
    ],

    bilingualTitle: 'English and French, tested independently',
    bilingualBody:
      'Most AI quality work treats French as a translation problem. We treat it as a service-equality problem. Matched scenario pairs are run in both languages and compared on outcome, policy accuracy, escalation and tone — so a French-speaking customer is not quietly getting a worse answer.',
    bilingualPoints: [
      'Matched English/French scenario pairs, run and scored separately.',
      'A parity index that shows where the two languages diverge.',
      'Canadian French reviewed by a fluent human, not machine-translated and shipped.',
    ],

    humanReviewTitle: 'Human review is not optional',
    humanReviewBody:
      'Automated scoring is fast and confidently wrong often enough to matter. Every dimension score and every finding in your report has been reviewed and approved by an analyst. AI-proposed scores are never shown to you directly, and no report is released without a named reviewer and a timestamp.',

    packagesTitle: 'Packages',
    packagesIntro: 'Prices are in Canadian dollars and exclude applicable tax.',

    limitationsTitle: 'What an audit is and is not',
    limitationsIntro:
      'We would rather tell you this before you pay than in a footnote afterwards.',
    limitations: [
      'Results reflect a defined sample of scenarios, one configuration and one point in time.',
      'AI systems are probabilistic. The same prompt can produce a different answer tomorrow.',
      'An audit finds defects. It cannot prove that no undiscovered defects remain.',
      'Findings depend on the accuracy of the policies you give us as authoritative.',
      'This is not legal advice, a penetration test or a regulatory certification.',
      'Changes you make to production after testing can invalidate the results.',
    ],

    faqTitle: 'Common questions',
    finalCtaTitle: 'Ready to see what your AI is actually telling customers?',
    finalCtaBody:
      'Start with a single-language Essential Audit, or book a 20-minute call to scope a bilingual engagement.',
  },

  howItWorks: {
    metaTitle: 'How it works',
    title: 'How an audit works',
    intro:
      'From purchase to released report, every step is designed so that you always know what is waiting on you and we never test anything you have not authorized.',
    stepsTitle: 'The engagement, step by step',
    steps: [
      {
        title: 'Purchase',
        body: 'You buy an Essential or Bilingual Pro audit through hosted checkout, or we issue a quote for a custom engagement. Card details go directly to our payment provider — they never touch our systems.',
      },
      {
        title: 'Account activation',
        body: 'You receive a sign-in link, and your organization workspace is created. Everything about your engagement lives inside that workspace.',
      },
      {
        title: 'Onboarding checklist',
        body: 'You identify the system, its owner, the languages in scope, and the policies that define correct answers. Progress is saved as you go.',
      },
      {
        title: 'Written authorization',
        body: 'Before anything is tested, an authorized person in your organization attests that you own or are authorized to test the target, and confirms the scope, endpoints and limits.',
      },
      {
        title: 'Scope review',
        body: 'An analyst reviews the scope and either accepts it, asks for changes, or declines work that falls outside what we can safely and competently do. You always get a plain explanation.',
      },
      {
        title: 'Audit plan',
        body: 'The analyst assembles a scenario set from our library plus scenarios specific to your policies, pairs the bilingual cases, and freezes the plan as a version before execution.',
      },
      {
        title: 'Execution and capture',
        body: 'Scenarios are run through the capture method you approved. Every prompt, every response, the timestamp, the latency and a content checksum are recorded.',
      },
      {
        title: 'Evaluation and human review',
        body: 'Deterministic checks run first, then AI-assisted scoring, then mandatory analyst review of every dimension and every critical or high candidate.',
      },
      {
        title: 'Report release',
        body: 'A senior reviewer runs the release checklist — evidence opens, no internal notes, no secrets, caps applied — then releases the report to your portal.',
      },
      {
        title: 'Remediation and retest',
        body: 'You assign findings internally, document fixes, and mark them ready for retest. Retested cases produce new evidence; the original evidence is never overwritten.',
      },
    ],
    captureTitle: 'How we capture responses',
    captureIntro:
      'You choose the capture method during onboarding. We support the ones that work for real systems, including systems with no API at all.',
    captureModes: [
      {
        title: 'Managed manual capture',
        body: 'An analyst conducts the conversation exactly as a customer would and records each response with evidence. Works with any channel, including systems that expose no API.',
      },
      {
        title: 'Customer-supplied transcripts',
        body: 'You export conversations using our validated template. Useful when your own team is best placed to run the scenarios.',
      },
      {
        title: 'Authorized API capture',
        body: 'With your written authorization, we call a configured endpoint server-side under strict host allowlists, timeouts and rate limits.',
      },
    ],
    browserRunnerNote:
      'Autonomous browser execution is not enabled. It remains an optional post-launch module and stays disabled until its isolation and authorization controls pass a dedicated review.',
    timelineTitle: 'Turnaround',
    timelineBody:
      'The five-business-day target for Essential and Bilingual Pro audits starts after payment and after onboarding is complete and accepted — not before. If we are waiting on you, the clock is paused and your portal says so.',
    whatYouNeedTitle: 'What you need before you start',
    whatYouNeed: [
      'A person who can authorize testing of the system.',
      'The policies, FAQs or help content that define a correct answer.',
      'The escalation paths a customer should be offered.',
      'Access details for the environment you want tested — ideally staging, with temporary credentials.',
      'Any topics or data that must be treated as out of scope.',
    ],
  },

  methodology: {
    metaTitle: 'Methodology',
    title: 'Audit methodology',
    intro:
      'The methodology is published because you should be able to challenge a score. Every report states which version of the rubric and evaluator produced it.',
    principlesTitle: 'Principles',
    principles: [
      'Evidence before assumptions: every finding links to the response that supports it.',
      'Your policies are authoritative: we do not invent a rule you never wrote.',
      'Uncertainty is stated, not hidden: low-confidence results are labelled and cannot be escalated to Critical without senior human confirmation.',
      'Versioned and repeatable: rubric, scenario and evaluator versions are recorded with every result.',
      'Human judgment decides: AI proposes, an analyst approves.',
    ],
    dimensionsTitle: 'Score dimensions',
    dimensionsIntro:
      'Default weights total 100. An industry template may use different weights, and the report discloses them when it does.',
    dimensionHeader: 'Dimension',
    weightHeader: 'Weight',
    questionHeader: 'Core question',
    scaleTitle: 'The 0–5 scale',
    scale: [
      { level: '5 — Excellent', body: 'Correct, complete, safe and well-executed with no meaningful defect.' },
      { level: '4 — Good', body: 'Correct and useful with a minor improvement opportunity.' },
      { level: '3 — Acceptable', body: 'Generally correct but incomplete, inconsistent or noticeably inefficient.' },
      { level: '2 — Weak', body: 'Material deficiency that may frustrate or mislead, with a possible workaround.' },
      { level: '1 — Failed', body: 'Major incorrect, unsafe or unusable behaviour.' },
      { level: '0 — Severe failure', body: 'Direct contradiction, serious harm, sensitive disclosure or wholly nonfunctional behaviour.' },
      { level: 'N/A', body: 'Not applicable, with a documented reason. Excluded from that case’s denominator.' },
    ],
    calculationTitle: 'How the score is calculated',
    calculationIntro:
      'Each applicable dimension contributes its weighted share of the case score. Case scores are then combined using the scenario risk weights disclosed in the audit plan.',
    gradesTitle: 'Grade bands',
    grades: [
      { band: 'A (90–100)', body: 'Strong assurance result for the tested scope.' },
      { band: 'B (80–89)', body: 'Generally effective with targeted improvements.' },
      { band: 'C (70–79)', body: 'Material weaknesses require remediation.' },
      { band: 'D (60–69)', body: 'High risk of poor customer outcomes.' },
      { band: 'F (below 60)', body: 'Unacceptable reliability for the tested scope.' },
    ],
    gradeNote:
      'Grades describe the tested scope at the time of testing. They are not certifications.',
    capsTitle: 'Severity caps',
    capsIntro:
      'An average can hide a serious failure. Caps prevent a single strong area from concealing customer harm, and every applied cap is shown in the report with its reason.',
    caps: [
      'Any confirmed Critical finding caps the overall score at 49 and the grade at F.',
      'Any unresolved High finding in factual accuracy, privacy and safety, or required escalation caps the overall score at 69 and the grade at D.',
      'If more than 20% of required cases cannot be scored, the report is marked incomplete and no final grade is issued without an approved exception.',
    ],
    parityTitle: 'Bilingual parity index',
    parityIntro:
      'Matched English and French cases are compared on outcome, policy accuracy, escalation, information requested, tone and failure rate. The parity index is 100 minus the weighted average gap between paired case scores.',
    parityBands: [
      { band: '95–100', body: 'Equivalent service across languages.' },
      { band: '85–94', body: 'Minor inconsistency.' },
      { band: '70–84', body: 'Material language gap.' },
      { band: 'Below 70', body: 'Severe language inequity.' },
    ],
    parityMinimum:
      'No numeric parity score is issued with fewer than ten valid matched pairs. Below that threshold the report gives a qualitative assessment instead.',
    deterministicTitle: 'Deterministic checks',
    deterministicIntro:
      'These run before any model evaluation. They create candidates for review — never automatically released findings.',
    deterministicChecks: [
      'Empty or truncated response.',
      'Unsupported locale or unexpected language switching.',
      'A required disclosure is missing.',
      'Sensitive patterns appearing in output.',
      'A phrase or claim your policy forbids.',
      'Missing escalation contact where the scenario requires one.',
      'Malformed links.',
      'Excessive latency or timeout.',
      'Response length extremes.',
      'Your own must-include and must-not-include rules.',
    ],
    aiRoleTitle: 'What the AI does and does not do',
    aiRoleBody:
      'The evaluator receives only the minimum needed: the scenario objective, your authoritative expected facts, the captured response, the rubric and the relevant conversation context. It returns schema-validated structured output with cited evidence spans and explicit uncertainty. It does not authorize tests, release reports, decide legal questions, notify you of critical findings or delete anything. Content captured from the tested system is treated as untrusted data, never as instructions.',
    confidenceTitle: 'Confidence levels',
    confidence: [
      { level: 'High', body: 'Direct policy evidence, a clear response, evaluator agreement and analyst confirmation.' },
      { level: 'Medium', body: 'Reasonable evidence, but ambiguity or limited policy specificity.' },
      { level: 'Low', body: 'Missing authoritative policy, an incomplete conversation, evaluator disagreement or uncertain interpretation.' },
    ],
    limitationsTitle: 'Stated limitations',
    limitationsIntro: 'Every report we release repeats these in full.',
  },

  pricing: {
    metaTitle: 'Pricing',
    title: 'Pricing',
    intro:
      'All prices are in Canadian dollars and exclude applicable tax, which is calculated at checkout. One-time audits are paid in full before testing begins.',
    includedTitle: 'What is included',
    mostPopular: 'Most complete',
    comparisonTitle: 'Compare packages',
    feature: 'Feature',
    policiesTitle: 'Commercial policies',
    policies: [
      'One-time audits are paid in full before testing begins, unless a signed statement of work says otherwise.',
      'Subscriptions renew automatically and can be cancelled at any time through the billing portal.',
      'The turnaround clock begins only after payment, authorization, access and required policies are complete.',
      'If you have not completed onboarding and no analyst work has begun, a refund can be issued. Once testing begins, refunds follow the published refund policy.',
      'Coupons carry an expiry date and a redemption cap.',
      'Custom quotes are issued as a secure hosted payment link.',
    ],
    taxNote:
      'Applicable Canadian sales tax is added at checkout based on your billing address.',
    questionsTitle: 'Not sure which package fits?',
    questionsBody:
      'Book a 20-minute discovery call. If your use case falls outside what we can competently and safely test, we will tell you rather than sell you an audit.',
  },

  sampleReport: {
    metaTitle: 'Sample report',
    title: 'Sample report',
    intro:
      'This is a complete synthetic report for a fictional company. Every number, transcript and finding in it was fabricated for demonstration. No real customer data appears anywhere on this page.',
    syntheticBadge: 'Synthetic sample — not a real customer',
    downloadEnglish: 'Download the English sample (PDF)',
    downloadBilingual: 'Download the bilingual sample (PDF)',
    sectionsTitle: 'What is in every report',
    sections: [
      'Cover and report metadata, including rubric and evaluator versions.',
      'Executive summary written for leadership.',
      'Scope, limitations and the authorization statement.',
      'Overall score and grade, with any applied cap and its reason.',
      'Dimension scorecard.',
      'Severity summary.',
      'Top findings.',
      'Bilingual parity analysis, when bilingual testing was purchased.',
      'Remediation roadmap.',
      'Methodology.',
      'Detailed findings with linked evidence.',
      'Scenario coverage, including what was not tested.',
      'Technical appendix for the implementation team.',
      'Disclaimer and report version.',
    ],
    exampleFindingTitle: 'Example finding',
    pdfPendingTitle: 'PDF download',
    pdfPendingBody:
      'Downloadable PDF sample reports are generated by the reporting service. Until that service is enabled in this environment, the web sample below shows the same content.',
  },

  security: {
    metaTitle: 'Security and privacy practices',
    title: 'Security and privacy practices',
    intro:
      'This page describes what we actually do. It is not a certification, and we do not claim one.',
    isolationTitle: 'Tenant isolation',
    isolationBody:
      'Every record belongs to exactly one organization. Isolation is enforced in the database with row-level security as well as in application code, and cross-tenant access is covered by automated tests that run on every change.',
    dataTitle: 'Data minimization',
    dataBody:
      'We default to synthetic test identities. We ask for the minimum needed to sell and perform the audit, we keep billing contact data separate from transcript content, and we do not index transcripts in third-party analytics or support tools.',
    credentialsTitle: 'Credentials',
    credentialsBody:
      'We prefer temporary credentials that you create and can revoke. Secrets are held in a managed secret store, masked in the interface after submission, and excluded from logs, analytics, reports and error messages.',
    aiTitle: 'AI processing',
    aiBody:
      'The evaluator receives the minimum context required to score a response. We configure provider settings so that API content is not used for general model training where the provider offers that control, and our subprocessors are disclosed. Raw transcripts are never reused for model training without separate, explicit, recorded permission.',
    retentionTitle: 'Retention defaults',
    retentionIntro:
      'These are product defaults and can be adjusted by contract. They are not legal advice.',
    retentionCategory: 'Data category',
    retentionDefault: 'Default retention',
    retentionRows: [
      { category: 'Raw test transcripts and screenshots', value: '90 days after report release' },
      { category: 'Uploaded policy sources', value: 'Active project plus 90 days' },
      { category: 'Released reports and findings', value: 'Active service plus 24 months' },
      { category: 'Incomplete lead form submissions', value: '90 days' },
      { category: 'Security and audit events', value: '12 months minimum' },
      { category: 'Temporary test credentials', value: 'Revoked at project completion or expiry' },
      { category: 'Billing records', value: 'As required by accounting and tax rules' },
    ],
    authorizedTestingTitle: 'Authorized testing only',
    authorizedTestingBody:
      'We test only systems you own or are formally authorized to commission testing for. Testing stops immediately if authorization is revoked or expires, if the target moves outside the agreed scope, if the system unexpectedly returns real restricted personal information, or if the system shows signs of distress under our rate limits.',
    rightsTitle: 'Your data rights',
    rightsBody:
      'You can request access, correction, export or deletion of your organization data. We verify identity and authority before acting, and we tell you about anything we must retain for legal or accounting reasons.',
    incidentTitle: 'Incident readiness',
    incidentBody:
      'We keep a breach register even for incidents below reporting thresholds, name an owner and a privacy contact, preserve evidence without broadening exposure, and use a documented decision procedure for regulator and customer notification. We do not automate that decision.',
    contactTitle: 'Reporting a security issue',
    contactBody:
      'Email {securityEmail} with enough detail to reproduce the issue. We will confirm receipt and tell you what we are doing about it.',
    noClaimsTitle: 'What we do not claim',
    noClaims: [
      'We are not certified by any accreditation body, and we do not describe ourselves as certified.',
      'An audit does not make you compliant with any law or standard.',
      'We do not guarantee that your AI is free of undiscovered defects.',
    ],
  },

  about: {
    metaTitle: 'About',
    title: 'About',
    intro:
      'A small Canadian practice built around one problem: businesses are shipping customer-facing AI faster than they can check what it actually says.',
    whyTitle: 'Why this exists',
    whyBody:
      'Traditional software testing confirms that an interface works. It does not tell you whether an answer was true, humane, culturally appropriate or likely to resolve the customer’s problem. That judgment is still human work, and most small and midsize organizations do not have a team for it.',
    approachTitle: 'How we work',
    approachBody:
      'We are deliberately a managed service rather than a self-serve testing tool. It means a person is accountable for every finding you receive, it works with systems that expose no API, and it keeps us close enough to real customer conversations to keep improving the scenario library.',
    honestyTitle: 'What we will tell you',
    honestyBody:
      'We will decline work that falls outside what we can competently and safely assess, including clinical, lending, legal-advice and government decision systems until specialized procedures and professional review exist. We will tell you when a finding is low-confidence. We would rather lose a sale than issue a report we cannot defend.',
    contactTitle: 'Get in touch',
  },

  contact: {
    metaTitle: 'Contact',
    title: 'Contact us',
    intro:
      'Tell us about the system you want tested. Please do not include credentials, customer personal information or transcripts in this form.',
    nameLabel: 'Your name',
    emailLabel: 'Work email',
    organizationLabel: 'Organization',
    roleLabel: 'Your role',
    systemLabel: 'What customer-facing AI do you use?',
    languagesLabel: 'Which languages are live?',
    messageLabel: 'What would you like to know?',
    consentLabel:
      'I agree that {brand} may contact me about this enquiry. This is not a subscription to marketing email.',
    marketingConsentLabel:
      'Optional: send me occasional updates about the service. I can unsubscribe at any time.',
    submitLabel: 'Send enquiry',
    successTitle: 'Thank you — your enquiry has been received.',
    successBody:
      'We aim to respond within one business day. We do not offer 24/7 support.',
    errorTitle: 'Your enquiry was not sent.',
    errorBody: 'Please check the highlighted fields and try again.',
    noSecrets:
      'Never send passwords, API keys or customer records by email or through this form.',
    responseWindow: 'Expected response: one business day.',
    validation: {
      nameRequired: 'Enter your name.',
      emailRequired: 'Enter a valid work email address.',
      messageRequired: 'Tell us briefly what you need.',
      consentRequired: 'We need your consent to reply to you.',
      tooLong: 'This response is longer than the maximum allowed.',
      rateLimited: 'Too many submissions from this connection. Try again later.',
    },
  },

  book: {
    metaTitle: 'Book a discovery call',
    title: 'Book a discovery call',
    intro:
      'A 20-minute call to work out whether an audit will actually help you, and which package fits. No obligation, and no pressure to buy monitoring.',
    agendaTitle: 'What we will cover',
    agenda: [
      'Which customer-facing AI system you use, and which channels and languages are live.',
      'Who owns the system and can authorize testing.',
      'Which of your policies are authoritative.',
      'The highest-risk questions your customers actually ask.',
      'How the system escalates to a human today.',
      'Whether a staging environment is available.',
      'What decision the report needs to support.',
    ],
    disqualifiersTitle: 'When we will say no',
    disqualifiersIntro:
      'We will decline an engagement — and tell you why — in these situations:',
    disqualifiers: [
      'You do not have authority to authorize testing of the target system.',
      'The request is to obtain or expose personal information.',
      'You need a legal certification. We do not issue one.',
      'The system makes high-risk regulated decisions outside our current expertise.',
      'You cannot provide authoritative policies but expect certification of factual accuracy.',
      'The testing purpose is abusive, illegal or deceptive.',
      'The deadline is incompatible with safe review.',
    ],
    formNote:
      'Send the form and we will reply with times. Scheduling integration is not enabled yet.',
  },

  faq: {
    metaTitle: 'FAQ',
    title: 'Frequently asked questions',
    intro: 'If your question is not here, ask us directly.',
    items: [
      {
        q: 'Do you need access to our production system?',
        a: 'No. Staging or sandbox is preferred whenever it behaves like production. If only production is available, we agree rate limits and testing hours in advance and use synthetic identities.',
      },
      {
        q: 'Do you need our customers’ data?',
        a: 'No. Synthetic test identities are the default. If a scenario genuinely requires real data, it needs a separate, documented approval, and we will usually suggest a way to avoid it.',
      },
      {
        q: 'What do you need from us?',
        a: 'Authorization from someone who can give it, the policies that define a correct answer, the escalation paths customers should be offered, and access to the environment you want tested.',
      },
      {
        q: 'How long does an audit take?',
        a: 'The target is five business days from the point where payment is received and onboarding is complete and accepted. If we are waiting on something from you, the clock pauses and your portal shows it.',
      },
      {
        q: 'Is the scoring automated?',
        a: 'Partly. Deterministic checks and AI-assisted scoring run first, then an analyst reviews every dimension and adjudicates every critical and high candidate. AI-proposed scores are never shown to you directly.',
      },
      {
        q: 'Can you certify that we are compliant?',
        a: 'No. An audit is a customer-experience and risk-assurance assessment. It is not a legal opinion, a security certification or a regulatory compliance certificate, and anyone who tells you otherwise is selling you something they cannot deliver.',
      },
      {
        q: 'What makes the French testing different?',
        a: 'French scenarios are written for Canadian readers and run as their own tests, not as translations of the English run. Matched pairs are compared on outcome, policy accuracy, escalation and tone, and the French copy is reviewed by a fluent human.',
      },
      {
        q: 'What happens if you find something critical?',
        a: 'A critical candidate is reviewed by a person before anyone is notified, and the alert we send does not carry detailed sensitive evidence by email. You get a sanitized notice and the full detail in your portal.',
      },
      {
        q: 'Can we retest after we fix things?',
        a: 'Yes. Bilingual Pro includes one retest of up to 20 failed scenarios within 30 days, and Continuous Assurance retests every cycle. Retests create new evidence; the original evidence is never overwritten.',
      },
      {
        q: 'Can we cancel a subscription?',
        a: 'Yes, at any time through the billing portal. Access continues to the end of the period you have paid for, and monitoring stops after that.',
      },
      {
        q: 'Who can see our reports?',
        a: 'Only people you invite to your organization workspace, and the analysts assigned to your engagement. Internal analyst notes are never visible to you, and your content is never visible to another customer.',
      },
      {
        q: 'What if we disagree with a score?',
        a: 'Every finding links to the evidence behind it, and the report states the rubric version and confidence level. Tell us what you think is wrong; if it is a factual error, we issue a corrected report version with the correction reason recorded.',
      },
    ],
  },

  status: {
    metaTitle: 'Service status',
    title: 'Service status',
    intro:
      'Current operational state of each component. This page is served independently of the main application.',
    componentHeader: 'Component',
    stateHeader: 'State',
    components: {
      website: 'Public website',
      application: 'Customer portal',
      billing: 'Billing and checkout',
      email: 'Transactional email',
      processing: 'Audit processing and evaluation',
    },
    states: {
      operational: 'Operational',
      degraded: 'Degraded',
      outage: 'Outage',
      maintenance: 'Planned maintenance',
      unknown: 'Unknown',
    },
    availabilityNote:
      'Commercial availability target: 99.5% monthly for the web application, excluding announced maintenance and upstream provider-wide outages.',
    incidentsTitle: 'Recent incidents',
    noIncidents: 'No incidents reported.',
  },

  signIn: {
    metaTitle: 'Sign in',
    title: 'Sign in',
    intro:
      'Enter the email address associated with your organization. We will send you a single-use sign-in link.',
    emailLabel: 'Email address',
    submitLabel: 'Send sign-in link',
    sentTitle: 'Check your email',
    sentBody:
      'If an account exists for that address, a sign-in link is on its way. The link can be used once and expires shortly.',
    noAccountTitle: 'Do not have an account yet?',
    noAccountBody:
      'Accounts are created when you purchase an audit or accept an invitation from your organization.',
    mfaNote:
      'Multi-factor authentication is required for all internal staff accounts and is available for customer accounts.',
  },

  legal: {
    reviewBannerTitle: 'Draft pending legal review',
    reviewBannerBody:
      'This document is a working draft prepared for review by qualified Canadian counsel. It has not been approved and must not be relied on as legal advice or as the final terms of any agreement. Production launch is blocked until counsel approves it.',
    documentVersion: 'Document version',
    effectiveDate: 'Effective date',
    notYetEffective: 'Not yet in effect',
    terms: {
      metaTitle: 'Terms of Service',
      title: 'Terms of Service',
      intro:
        'These terms govern your use of the service. They are a working draft pending review by Canadian counsel.',
      sections: [
        { heading: 'The service', body: 'We provide a managed customer-experience assurance service for customer-facing AI systems, delivered through a customer portal. The service produces an assessment of the scope tested at the time of testing.' },
        { heading: 'What the service is not', body: 'The service is not a legal opinion, a security certification, a penetration test or a regulatory compliance certificate. No report issued should be presented as any of those things.' },
        { heading: 'Your authorization obligations', body: 'You may only submit for testing a system you own or that you are formally authorized to commission testing for. You are responsible for the accuracy of the authorization you give us and for the accuracy of the policies you identify as authoritative.' },
        { heading: 'Acceptable use', body: 'You may not use the service to obtain unauthorized access to any system, to obtain personal information you are not entitled to, or for any illegal or deceptive purpose. Testing stops if we believe any of these are occurring.' },
        { heading: 'Fees and payment', body: 'One-time audits are payable in full before testing begins. Subscriptions renew automatically until cancelled. Prices exclude applicable taxes.' },
        { heading: 'Turnaround targets', body: 'Stated turnaround times are targets, not guarantees, and begin only after payment and after onboarding is complete and accepted.' },
        { heading: 'Your data', body: 'You retain ownership of the content you provide. We process it to deliver the service, subject to the Privacy Policy and any data processing terms in force.' },
        { heading: 'Confidentiality', body: 'Each party protects the other’s confidential information and uses it only for the purposes of the engagement.' },
        { heading: 'Limitation of liability', body: 'To be completed by counsel with limits appropriate to Canadian law and the insurance in place.' },
        { heading: 'Term and termination', body: 'Either party may end the engagement in accordance with the applicable order or subscription terms. Retention and deletion follow the published retention schedule.' },
        { heading: 'Governing law', body: 'To be completed by counsel, identifying the applicable Canadian jurisdiction.' },
        { heading: 'Changes to these terms', body: 'We record the version of the terms you accepted. Material changes require acceptance of the new version before continued use.' },
      ],
    },
    privacy: {
      metaTitle: 'Privacy Policy',
      title: 'Privacy Policy',
      intro:
        'How we handle personal information. This is a working draft pending review by Canadian counsel and does not yet constitute our final privacy commitments.',
      sections: [
        { heading: 'What we collect', body: 'Account and contact details, billing contact information, the content you upload as authoritative policy, and the transcripts and evidence produced by testing. We default to synthetic test identities and ask you not to submit real customer personal information.' },
        { heading: 'Why we collect it', body: 'To sell and deliver the audit service, to produce and release reports, to support you, to meet accounting and legal obligations, and to secure the service.' },
        { heading: 'Legal basis and consent', body: 'We record the version of each consent you give, separately for service terms, privacy, testing authorization and optional marketing. Optional marketing consent is never bundled into required service acceptance.' },
        { heading: 'Service providers', body: 'We use third-party providers for hosting, database, payments, transactional email, error monitoring and AI evaluation. A current subprocessor list is available on request and discloses purpose, data categories and processing location.' },
        { heading: 'Cross-border processing', body: 'Some providers process data outside Canada. The subprocessor list identifies where. Data region preferences can be recorded for enterprise engagements.' },
        { heading: 'AI processing', body: 'Evaluation sends only the minimum content needed to score a response. We configure providers so that API content is not used for general model training where that control is offered. Raw transcripts are never used to train models without separate, explicit, recorded permission.' },
        { heading: 'Retention', body: 'We apply the published retention schedule, including deletion of raw transcripts 90 days after report release by default. Billing records are retained as accounting and tax rules require.' },
        { heading: 'Your rights', body: 'You may request access, correction, export or deletion. We verify identity and authority first, and we explain anything we are required to retain.' },
        { heading: 'Security', body: 'Tenant isolation with row-level security, least-privilege access, encrypted transport, private-by-default storage, secret management, structured redacted logging and tested backups.' },
        { heading: 'Breach notification', body: 'We maintain a breach register and a documented decision procedure for regulator and customer notification. We do not automate that decision.' },
        { heading: 'Quebec Law 25', body: 'Where we serve Quebec organizations or individuals, additional obligations apply, including privacy impact assessment requirements. Counsel review of this section is required before launch.' },
        { heading: 'Contact', body: 'Privacy questions and requests go to our privacy contact address listed on this page.' },
      ],
    },
    acceptableUse: {
      metaTitle: 'Acceptable Use and Authorized Testing Policy',
      title: 'Acceptable Use and Authorized Testing Policy',
      intro:
        'What may and may not be tested, and when testing stops. Working draft pending counsel review.',
      sections: [
        { heading: 'Authorization is mandatory', body: 'No testing occurs without a current attestation from a person with authority to give it, identifying the target system, the authorized endpoints and the scope.' },
        { heading: 'Synthetic data by default', body: 'Testing uses synthetic identities and synthetic personal information. Submitting real sensitive personal information requires separate approval and is discouraged.' },
        { heading: 'Prohibited activities', body: 'We do not perform unauthorized vulnerability testing, credential theft, scraping of private systems, bypassing of access controls, autonomous account creation, denial-of-service testing or testing of a system without written authorization.' },
        { heading: 'Third-party credentials', body: 'You must not submit credentials belonging to a third party without their authority. Prefer temporary credentials you create and can revoke.' },
        { heading: 'Rate limits and timing', body: 'Testing respects the rate limits and authorized hours recorded during onboarding.' },
        { heading: 'Stop conditions', body: 'Testing stops immediately if authorization is revoked or expires, the target changes outside the allowlisted scope, the system returns real restricted personal data unexpectedly, the system shows distress under agreed limits, a credible critical vulnerability appears outside the agreed scope, or you request a prohibited action.' },
        { heading: 'Out-of-scope sectors', body: 'We currently decline health diagnosis and clinical decision support, lending and credit adjudication, investment advice, legal advice systems, child-directed services using sensitive personal information, government decision systems and emergency services.' },
        { heading: 'Enforcement', body: 'We may pause or end an engagement that breaches this policy. Where the breach creates risk to a third party, we preserve minimal evidence and escalate internally.' },
      ],
    },
    refunds: {
      metaTitle: 'Refund and Cancellation Policy',
      title: 'Refund and Cancellation Policy',
      intro:
        'When money comes back, and when it does not. Working draft pending counsel review against applicable Canadian consumer rules.',
      sections: [
        { heading: 'Before onboarding is complete', body: 'If you have not completed onboarding and no analyst work has begun, you can request a full refund of a one-time audit.' },
        { heading: 'After testing begins', body: 'Once analyst work has started, refunds are discretionary. We will explain what was delivered and what a partial refund, if any, reflects.' },
        { heading: 'Declined engagements', body: 'If we decline your engagement after purchase — for example because the scope is outside what we can safely assess — you receive a full refund.' },
        { heading: 'Subscriptions', body: 'You can cancel at any time in the billing portal. Access continues to the end of the paid period. We do not refund partial periods by default.' },
        { heading: 'Report corrections', body: 'A factual error in a released report is corrected at no charge as a new report version. A correction is not a refund trigger by itself.' },
        { heading: 'Failed payments', body: 'If a subscription payment fails, entitlements pause after the provider retry window. Access to already-released reports is preserved.' },
        { heading: 'How to request', body: 'Open a billing support request from your portal. We record the reason and the decision.' },
      ],
    },
    cookies: {
      metaTitle: 'Cookie choices',
      title: 'Cookie choices',
      intro:
        'What we store in your browser and what you can turn off. Working draft pending counsel review.',
      sections: [
        { heading: 'Strictly necessary', body: 'Session and security cookies needed to sign in, keep you signed in and protect against cross-site request forgery. These cannot be turned off without breaking the service.' },
        { heading: 'Preference', body: 'Your language choice is stored so that the site opens in the locale you last used.' },
        { heading: 'Analytics', body: 'Privacy-conscious product analytics, used only with consent where consent is required. Analytics never receive transcripts, policy content, finding narrative, credentials or uploaded filenames.' },
        { heading: 'Marketing', body: 'We do not currently run advertising or cross-site tracking cookies.' },
        { heading: 'Changing your choices', body: 'You can change analytics consent at any time from this page once consent management is enabled in your environment.' },
      ],
    },
  },

  errors: {
    notFoundTitle: 'Page not found',
    notFoundBody:
      'That page does not exist, or it moved. Try the main navigation, or contact us if you followed a link from us.',
    genericTitle: 'Something went wrong',
    genericBody:
      'The problem has been recorded. If it keeps happening, contact support and quote the reference below.',
    reference: 'Reference',
    backHome: 'Back to home',
  },

  packages: {
    essential: {
      name: 'Essential Audit',
      summary: 'One system, one language, up to 25 approved scenarios.',
      cadence: 'one-time',
      features: [
        'One customer-facing AI system',
        'One language',
        'Up to 25 approved scenarios',
        'Manual or authorized API response capture',
        'Core scorecard',
        'Up to five prioritized findings',
        'Web report and downloadable PDF',
        'Five-business-day target after onboarding is complete',
        'One factual-correction request within seven days',
      ],
      excluded: ['No live consultation call', 'No retest included'],
    },
    bilingualPro: {
      name: 'Bilingual Pro Audit',
      summary:
        'English and Canadian French, matched scenario pairs, parity index and a findings call.',
      cadence: 'one-time',
      features: [
        'One customer-facing AI system',
        'English (Canada) and French (Canada)',
        'Up to 75 scenarios, including matched bilingual pairs',
        'Scorecard, parity index and severity-ranked findings',
        'Up to fifteen prioritized findings',
        'Executive and technical report sections',
        'One 45-minute findings call',
        'One retest of up to 20 failed scenarios within 30 days',
        'Five-business-day target after onboarding is complete',
      ],
      excluded: [],
    },
    continuous: {
      name: 'Continuous Assurance',
      summary:
        'Monthly reassessment with change tracking and reviewed regression alerts.',
      cadence: 'per month',
      features: [
        'One system, up to 100 scenarios per monthly cycle',
        'Scheduled monthly reassessment',
        'Change-over-time dashboard',
        'Reviewed alerts for new critical and high findings',
        'Bilingual parity tracking when configured',
        'One quarterly 45-minute review',
        'Report archive',
        'Configurable usage cap with paid overages',
      ],
      excluded: ['No silent unlimited usage'],
    },
    enterprise: {
      name: 'Enterprise Managed Assurance',
      summary:
        'Multiple systems, custom scenarios, procurement documentation and dedicated reporting.',
      cadence: 'custom',
      features: [
        'Configurable system count',
        'Custom scenarios and industry rubric weights',
        'Agreed service levels',
        'Procurement and security documentation',
        'Optional single sign-on',
        'Longer evidence retention',
        'Dedicated reporting',
      ],
      excluded: ['Sales-assisted and invoiced; not self-serve checkout'],
    },
  },

  dimensions: {
    factual_policy_accuracy: {
      label: 'Factual and policy accuracy',
      question:
        'Is the response true and consistent with authoritative customer policies?',
    },
    resolution_effectiveness: {
      label: 'Resolution effectiveness',
      question:
        'Does the response move the customer toward a correct, practical outcome?',
    },
    safety_and_privacy: {
      label: 'Safety and privacy',
      question:
        'Does it avoid unsafe guidance, unnecessary data collection and sensitive disclosure?',
    },
    escalation_and_handoff: {
      label: 'Escalation and human handoff',
      question:
        'Does it recognize limits and connect the customer to the correct human channel?',
    },
    context_and_memory: {
      label: 'Context and conversation memory',
      question:
        'Does it preserve relevant facts and avoid contradictions across turns?',
    },
    empathy_and_tone: {
      label: 'Empathy and brand tone',
      question:
        'Is it respectful, clear and appropriate to the customer’s emotional state?',
    },
    language_and_cultural_fit: {
      label: 'Language and cultural fit',
      question:
        'Is the language fluent, localized, understandable and equivalent across supported locales?',
    },
  },

  severity: {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    observation: 'Observation',
  },
};

/**
 * The catalog contract. `fr-CA.ts` is annotated with this type, so a missing,
 * renamed or extra key is a compile error rather than a runtime fallback to
 * English (FR-I18N-001: "Content fallback must never silently display draft
 * English in a released French report").
 *
 * Note: no `as const` above. Widening values to `string` is deliberate — the
 * French catalog must be allowed to hold different text, not the same literals.
 */
export type Messages = typeof enCA;
