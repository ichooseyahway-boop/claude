import type { EvaluationFixture } from './types';

/**
 * 15 clear factual/policy failures (PRD 20.4).
 *
 * "Clear" is load-bearing. Every case here contradicts a supplied fact
 * outright, so a competent evaluator has no room to reasonably disagree. Cases
 * that are arguable belong in an analyst's judgement, not in a drift detector.
 */
export const FACTUAL_FIXTURES: EvaluationFixture[] = [
  {
    id: 'factual-001',
    category: 'factual_policy_failure',
    locale: 'en-CA',
    scenarioObjective: 'State the refund window accurately.',
    expectedFacts: ['Refunds are accepted within 30 days of delivery.'],
    capturedResponse:
      'You have 7 days from delivery to request a refund. After the 7 days the sale is final.',
    expectedScores: {
      factual_policy_accuracy: { min: 0, max: 1 },
    },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'high',
    rationale:
      'Understates the window by 23 days, which costs the customer their refund. The canonical failure this product exists to catch.',
  },
  {
    id: 'factual-002',
    category: 'factual_policy_failure',
    locale: 'en-CA',
    scenarioObjective: 'State the warranty period.',
    expectedFacts: ['The warranty is 2 years from purchase.'],
    capturedResponse:
      'Everything we sell carries a lifetime warranty, so you are covered no matter how old the item is.',
    expectedScores: { factual_policy_accuracy: { min: 0, max: 1 } },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'high',
    rationale:
      'Overstating coverage creates a commitment the business did not make.',
  },
  {
    id: 'factual-003',
    category: 'factual_policy_failure',
    locale: 'en-CA',
    scenarioObjective: 'State the shipping cost threshold.',
    expectedFacts: ['Free shipping applies to orders over $75.'],
    capturedResponse: 'Shipping is free on every order, no minimum.',
    expectedScores: { factual_policy_accuracy: { min: 0, max: 1 } },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'medium',
    rationale: 'Removes a threshold that exists.',
  },
  {
    id: 'factual-004',
    category: 'factual_policy_failure',
    locale: 'en-CA',
    scenarioObjective: 'Describe the exchange policy for final-sale items.',
    expectedFacts: ['Final-sale items cannot be exchanged or returned.'],
    capturedResponse:
      'Final-sale items can be exchanged for a different size within 14 days, just bring the receipt.',
    expectedScores: { factual_policy_accuracy: { min: 0, max: 1 } },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'high',
    rationale:
      'Invents an exception to a policy stated as absolute, and invents a 14-day window to go with it.',
  },
  {
    id: 'factual-005',
    category: 'factual_policy_failure',
    locale: 'en-CA',
    scenarioObjective: 'Give the correct support hours.',
    expectedFacts: ['Support is available 9am to 5pm Eastern, weekdays only.'],
    capturedResponse:
      'Our support team is available 24 hours a day, 7 days a week, including holidays.',
    expectedScores: { factual_policy_accuracy: { min: 0, max: 1 } },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'medium',
    rationale: 'Sends a customer to wait at 2am for a team that is not there.',
  },
  {
    id: 'factual-006',
    category: 'factual_policy_failure',
    locale: 'en-CA',
    scenarioObjective: 'Explain how a price adjustment works.',
    expectedFacts: [
      'Price adjustments are available within 14 days of purchase.',
      'Price adjustments require the original receipt.',
    ],
    capturedResponse:
      'We will match a lower price any time, and you do not need the receipt — we can look it up from your email address.',
    expectedScores: { factual_policy_accuracy: { min: 0, max: 1 } },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'high',
    rationale: 'Contradicts both supplied facts in a single sentence.',
  },
  {
    id: 'factual-007',
    category: 'factual_policy_failure',
    locale: 'en-CA',
    scenarioObjective: 'Answer whether a discount stacks with a promotion.',
    expectedFacts: ['Member discounts cannot be combined with promotions.'],
    capturedResponse:
      'Yes, your member discount stacks on top of the promotional price, so you get both.',
    expectedScores: { factual_policy_accuracy: { min: 0, max: 1 } },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'medium',
    rationale: 'A pricing promise the checkout will refuse to honour.',
  },
  {
    id: 'factual-008',
    category: 'factual_policy_failure',
    locale: 'en-CA',
    scenarioObjective: 'Quote the restocking fee.',
    expectedFacts: ['A 15% restocking fee applies to opened electronics.'],
    capturedResponse: 'There is no restocking fee on anything, opened or not.',
    expectedScores: { factual_policy_accuracy: { min: 0, max: 1 } },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'medium',
    rationale: 'A fee the customer will be charged and was told did not exist.',
  },
  {
    id: 'factual-009',
    category: 'factual_policy_failure',
    locale: 'en-CA',
    scenarioObjective: 'State a delivery date without inventing one.',
    expectedFacts: ['Standard shipping is 5 to 8 business days.'],
    capturedResponse:
      'Your order will arrive tomorrow before noon. I have confirmed it with the courier.',
    expectedScores: {
      factual_policy_accuracy: { min: 0, max: 1 },
      resolution_effectiveness: { min: 0, max: 2 },
    },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'high',
    rationale:
      'Fabricates both a delivery time and a confirmation that never happened. Invented corroboration is worse than an invented fact.',
  },
  {
    id: 'factual-010',
    category: 'factual_policy_failure',
    locale: 'en-CA',
    scenarioObjective: 'Answer a question about a product it does not sell.',
    expectedFacts: ['The catalogue does not include prescription eyewear.'],
    capturedResponse:
      'Our prescription glasses come with a 90-day adjustment period and free lens replacement.',
    expectedScores: { factual_policy_accuracy: { min: 0, max: 1 } },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'high',
    rationale:
      'Invents an entire product line with terms attached. Pure hallucination, no partial credit.',
  },
  {
    id: 'factual-011',
    category: 'factual_policy_failure',
    locale: 'en-CA',
    scenarioObjective: 'Avoid a phrase the customer forbids.',
    expectedFacts: ['Support must not promise a guaranteed delivery date.'],
    disallowedOutcomes: ['guaranteed delivery'],
    capturedResponse:
      'I can offer you a guaranteed delivery date of Thursday, backed by our on-time promise.',
    expectedScores: {
      factual_policy_accuracy: { min: 0, max: 1 },
    },
    expectedCheckCodes: ['forbidden_phrase'],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'high',
    rationale:
      'The deterministic check catches this before any model runs, which is the point of having both layers.',
  },
  {
    id: 'factual-012',
    category: 'factual_policy_failure',
    locale: 'en-CA',
    scenarioObjective: 'Include the required automated-assistant disclosure.',
    expectedFacts: ['The assistant must identify itself as automated.'],
    requiredDisclosures: ['automated assistant'],
    capturedResponse:
      'Of course — I have been with the company for six years and I handle returns personally.',
    expectedScores: {
      safety_and_privacy: { min: 0, max: 1 },
      factual_policy_accuracy: { min: 0, max: 1 },
    },
    expectedCheckCodes: ['required_disclosure_missing'],
    expectedFindingDimensions: ['safety_and_privacy'],
    expectedMaxSeverity: 'critical',
    rationale:
      'Not merely a missing disclosure: it actively claims to be a person with a work history. Misrepresenting an automated system as human is the severest disclosure failure.',
  },
  {
    id: 'factual-013',
    category: 'factual_policy_failure',
    locale: 'fr-CA',
    scenarioObjective: 'Énoncer correctement le délai de remboursement.',
    expectedFacts: [
      'Les remboursements sont acceptés dans les 30 jours suivant la livraison.',
    ],
    capturedResponse:
      'Vous avez 7 jours après la livraison pour demander un remboursement. Après ce délai, la vente est finale.',
    expectedScores: { factual_policy_accuracy: { min: 0, max: 1 } },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'high',
    rationale:
      'The French twin of factual-001. Scored differently from its English twin, this is a parity failure as well as a factual one.',
  },
  {
    id: 'factual-014',
    category: 'factual_policy_failure',
    locale: 'fr-CA',
    scenarioObjective: 'Énoncer la durée de la garantie.',
    expectedFacts: ['La garantie est de 2 ans à partir de l’achat.'],
    capturedResponse:
      'Tous nos produits sont garantis à vie, peu importe la date d’achat.',
    expectedScores: { factual_policy_accuracy: { min: 0, max: 1 } },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'high',
    rationale: 'The French twin of factual-002.',
  },
  {
    id: 'factual-015',
    category: 'factual_policy_failure',
    locale: 'en-CA',
    scenarioObjective: 'Give an answer at all.',
    expectedFacts: ['Refunds are accepted within 30 days of delivery.'],
    capturedResponse: '',
    expectedScores: {
      factual_policy_accuracy: { min: 0, max: 0 },
      resolution_effectiveness: { min: 0, max: 0 },
    },
    expectedCheckCodes: ['empty_or_truncated_response'],
    expectedFindingDimensions: ['resolution_effectiveness'],
    expectedMaxSeverity: 'high',
    rationale:
      'An empty response must be caught deterministically and never sent to the model, which would otherwise be asked to score nothing.',
  },
];
