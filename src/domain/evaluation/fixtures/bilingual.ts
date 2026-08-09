import type { EvaluationFixture } from './types';

/**
 * 10 matched English/French cases — five pairs (PRD 20.4).
 *
 * These differ from the French cases scattered through the other files. There,
 * French is one more case. Here, the two halves are deliberately *equivalent in
 * quality*, so that any score difference between them is measuring the
 * evaluator, not the response.
 *
 * That is the whole basis of the bilingual parity index (10.7): if the
 * evaluator itself is harsher in French, every parity number the product
 * publishes is wrong, and wrong in the direction that would embarrass a
 * customer who trusted it.
 */
export const BILINGUAL_FIXTURES: EvaluationFixture[] = [
  {
    id: 'pair-001-en',
    category: 'bilingual_pair',
    locale: 'en-CA',
    pairKey: 'pair-001',
    scenarioObjective: 'Explain how to start a return.',
    expectedFacts: [
      'Returns are started from the Orders page.',
      'A prepaid label is emailed within one business day.',
    ],
    capturedResponse:
      'Go to Orders, choose the item, and select Start a return. We email a prepaid label within one business day, and you can drop the parcel at any post office.',
    expectedScores: {
      factual_policy_accuracy: { min: 4, max: 5 },
      resolution_effectiveness: { min: 4, max: 5 },
      language_and_cultural_fit: { min: 4, max: 5 },
    },
    expectedCheckCodes: [],
    expectedFindingDimensions: [],
    expectedMaxSeverity: 'observation',
    rationale: 'Baseline for pair-001. Must score the same as its French half.',
  },
  {
    id: 'pair-001-fr',
    category: 'bilingual_pair',
    locale: 'fr-CA',
    pairKey: 'pair-001',
    scenarioObjective: 'Expliquer comment amorcer un retour.',
    expectedFacts: [
      'Les retours sont amorcés à partir de la page Commandes.',
      'Une étiquette prépayée est envoyée par courriel en un jour ouvrable.',
    ],
    capturedResponse:
      'Allez à Commandes, choisissez l’article, puis sélectionnez Amorcer un retour. Nous envoyons une étiquette prépayée par courriel en un jour ouvrable, et vous pouvez déposer le colis à n’importe quel bureau de poste.',
    expectedScores: {
      factual_policy_accuracy: { min: 4, max: 5 },
      resolution_effectiveness: { min: 4, max: 5 },
      language_and_cultural_fit: { min: 4, max: 5 },
    },
    expectedCheckCodes: [],
    expectedFindingDimensions: [],
    expectedMaxSeverity: 'observation',
    rationale:
      'Semantically identical to pair-001-en, in natural Canadian French. A lower score here is an evaluator defect.',
  },
  {
    id: 'pair-002-en',
    category: 'bilingual_pair',
    locale: 'en-CA',
    pairKey: 'pair-002',
    scenarioObjective: 'State the exchange window for footwear.',
    expectedFacts: ['Unworn footwear can be exchanged within 60 days.'],
    capturedResponse:
      'Footwear can be exchanged within 60 days as long as it is unworn and still in the box.',
    expectedScores: {
      factual_policy_accuracy: { min: 4, max: 5 },
      language_and_cultural_fit: { min: 4, max: 5 },
    },
    expectedCheckCodes: [],
    expectedFindingDimensions: [],
    expectedMaxSeverity: 'observation',
    rationale: 'Baseline for pair-002.',
  },
  {
    id: 'pair-002-fr',
    category: 'bilingual_pair',
    locale: 'fr-CA',
    pairKey: 'pair-002',
    scenarioObjective: 'Énoncer le délai d’échange pour les chaussures.',
    expectedFacts: [
      'Les chaussures non portées peuvent être échangées dans les 60 jours.',
    ],
    capturedResponse:
      'Les chaussures peuvent être échangées dans les 60 jours, à condition qu’elles n’aient pas été portées et qu’elles soient toujours dans leur boîte.',
    expectedScores: {
      factual_policy_accuracy: { min: 4, max: 5 },
      language_and_cultural_fit: { min: 4, max: 5 },
    },
    expectedCheckCodes: [],
    expectedFindingDimensions: [],
    expectedMaxSeverity: 'observation',
    rationale: 'Equivalent to pair-002-en.',
  },
  {
    id: 'pair-003-en',
    category: 'bilingual_pair',
    locale: 'en-CA',
    pairKey: 'pair-003',
    scenarioObjective: 'Escalate a damaged-on-arrival report.',
    expectedFacts: ['Damage reports are handled by a human agent.'],
    escalationRequired: true,
    capturedResponse:
      'I am sorry it arrived damaged. Damage claims are handled by a person so they can arrange the replacement properly — I am connecting you with an agent now.',
    expectedScores: {
      escalation_and_handoff: { min: 4, max: 5 },
      empathy_and_tone: { min: 3, max: 5 },
    },
    expectedCheckCodes: [],
    expectedFindingDimensions: [],
    expectedMaxSeverity: 'observation',
    rationale: 'Baseline for pair-003: a correct escalation.',
  },
  {
    id: 'pair-003-fr',
    category: 'bilingual_pair',
    locale: 'fr-CA',
    pairKey: 'pair-003',
    scenarioObjective: 'Transférer un signalement de dommage à la livraison.',
    expectedFacts: [
      'Les signalements de dommage sont traités par un conseiller.',
    ],
    escalationRequired: true,
    capturedResponse:
      'Je suis désolé que l’article soit arrivé endommagé. Les réclamations pour dommage sont traitées par une personne afin d’organiser correctement le remplacement — je vous mets en contact avec un conseiller.',
    expectedScores: {
      escalation_and_handoff: { min: 4, max: 5 },
      empathy_and_tone: { min: 3, max: 5 },
    },
    expectedCheckCodes: [],
    expectedFindingDimensions: [],
    expectedMaxSeverity: 'observation',
    rationale:
      'Equivalent to pair-003-en. "Conseiller" is the Canadian French escalation marker the deterministic check knows.',
  },
  {
    id: 'pair-004-en',
    category: 'bilingual_pair',
    locale: 'en-CA',
    pairKey: 'pair-004',
    scenarioObjective: 'Give a wrong refund window (both halves fail).',
    expectedFacts: ['Refunds are accepted within 30 days of delivery.'],
    capturedResponse:
      'Refunds are available for 10 days after delivery, and after that we cannot help.',
    expectedScores: { factual_policy_accuracy: { min: 0, max: 1 } },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'high',
    rationale:
      'Parity is not only about good answers. A pair that fails equally in both languages must be *scored* equally too.',
  },
  {
    id: 'pair-004-fr',
    category: 'bilingual_pair',
    locale: 'fr-CA',
    pairKey: 'pair-004',
    scenarioObjective:
      'Donner un mauvais délai de remboursement (les deux échouent).',
    expectedFacts: [
      'Les remboursements sont acceptés dans les 30 jours suivant la livraison.',
    ],
    capturedResponse:
      'Les remboursements sont possibles pendant 10 jours après la livraison; passé ce délai, nous ne pouvons rien faire.',
    expectedScores: { factual_policy_accuracy: { min: 0, max: 1 } },
    expectedCheckCodes: [],
    expectedFindingDimensions: ['factual_policy_accuracy'],
    expectedMaxSeverity: 'high',
    rationale: 'Equivalent failure to pair-004-en.',
  },
  {
    id: 'pair-005-en',
    category: 'bilingual_pair',
    locale: 'en-CA',
    pairKey: 'pair-005',
    scenarioObjective: 'Answer a partially-known question honestly.',
    expectedFacts: [
      'In-store stock levels are not visible to support.',
      'Online stock is shown on the product page.',
    ],
    capturedResponse:
      'I can see online stock on the product page, but I cannot see what a particular store has on the shelf — that is not visible to me. The store can check if you call them directly.',
    expectedScores: {
      factual_policy_accuracy: { min: 4, max: 5 },
      resolution_effectiveness: { min: 3, max: 5 },
    },
    expectedCheckCodes: [],
    expectedFindingDimensions: [],
    expectedMaxSeverity: 'observation',
    rationale:
      'Baseline for pair-005: a partial answer plus an honest boundary is a good answer.',
  },
  {
    id: 'pair-005-fr',
    category: 'bilingual_pair',
    locale: 'fr-CA',
    pairKey: 'pair-005',
    scenarioObjective:
      'Répondre honnêtement à une question partiellement connue.',
    expectedFacts: [
      'Les stocks en magasin ne sont pas visibles par le service à la clientèle.',
      'Le stock en ligne est affiché sur la page du produit.',
    ],
    capturedResponse:
      'Je vois le stock en ligne sur la page du produit, mais je ne vois pas ce qu’un magasin en particulier a en tablette — cette information ne m’est pas accessible. Le magasin peut vérifier si vous l’appelez directement.',
    expectedScores: {
      factual_policy_accuracy: { min: 4, max: 5 },
      resolution_effectiveness: { min: 3, max: 5 },
    },
    expectedCheckCodes: [],
    expectedFindingDimensions: [],
    expectedMaxSeverity: 'observation',
    rationale: 'Equivalent to pair-005-en.',
  },
];
