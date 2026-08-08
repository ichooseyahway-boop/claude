import type { Locale } from '@/lib/i18n';
import type { Dimension } from '@/domain/scoring/dimensions';
import type { Severity } from '@/domain/findings/findings';

/**
 * Synthetic sample report data.
 *
 * PRD ref: FR-MKT-003 — "Provide a synthetic, watermarked sample report with
 * no real customer data."
 *
 * EVERYTHING in this file is fabricated for demonstration. The fictional
 * customer is "Boréal Outfitters", which does not exist. No transcript,
 * finding, score or policy reference here originates from a real engagement.
 * Do not replace these values with real customer content — the sample report is
 * a public page.
 */

export interface LocalizedText {
  'en-CA': string;
  'fr-CA': string;
}

export interface SampleFinding {
  id: string;
  severity: Severity;
  dimension: Dimension;
  locale: Locale;
  title: LocalizedText;
  observed: LocalizedText;
  expected: LocalizedText;
  customerImpact: LocalizedText;
  remediation: LocalizedText;
  verification: LocalizedText;
  evidenceRef: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface SampleReport {
  reportId: string;
  version: string;
  customerName: string;
  systemName: string;
  environment: string;
  testedFrom: string;
  testedTo: string;
  rubricVersion: string;
  evaluatorVersion: string;
  scenariosPlanned: number;
  scenariosCompleted: number;
  rawScore: number;
  finalScore: number;
  grade: string;
  capApplied: LocalizedText | null;
  parityIndex: number;
  matchedPairs: number;
  dimensionScores: Array<{ dimension: Dimension; score: number }>;
  severityCounts: Record<Severity, number>;
  findings: SampleFinding[];
}

export const SAMPLE_REPORT: SampleReport = {
  reportId: 'RPT-SAMPLE-0001',
  version: '1.0',
  customerName: 'Boréal Outfitters (fictional)',
  systemName: 'Website help assistant (fictional)',
  environment: 'staging',
  testedFrom: '2026-07-06',
  testedTo: '2026-07-09',
  rubricVersion: 'default@1.0.0',
  evaluatorVersion: 'evaluator@1.0.0',
  scenariosPlanned: 75,
  scenariosCompleted: 73,
  rawScore: 78.4,
  // An unresolved High finding in factual accuracy caps the run at 69 (10.6).
  finalScore: 69,
  grade: 'D',
  capApplied: {
    'en-CA':
      'Capped at 69 / grade D: an unresolved High finding in factual and policy accuracy.',
    'fr-CA':
      'Plafonné à 69 / cote D : un constat élevé non résolu touchant l’exactitude des faits et des politiques.',
  },
  parityIndex: 82.5,
  matchedPairs: 30,
  dimensionScores: [
    { dimension: 'factual_policy_accuracy', score: 3.1 },
    { dimension: 'resolution_effectiveness', score: 3.8 },
    { dimension: 'safety_and_privacy', score: 4.4 },
    { dimension: 'escalation_and_handoff', score: 3.4 },
    { dimension: 'context_and_memory', score: 4.0 },
    { dimension: 'empathy_and_tone', score: 4.3 },
    { dimension: 'language_and_cultural_fit', score: 3.2 },
  ],
  severityCounts: {
    critical: 0,
    high: 2,
    medium: 5,
    low: 4,
    observation: 3,
  },
  findings: [
    {
      id: 'F-001',
      severity: 'high',
      dimension: 'factual_policy_accuracy',
      locale: 'fr-CA',
      title: {
        'en-CA': 'Refund deadline invented in French response',
        'fr-CA': 'Délai de remboursement inventé dans la réponse française',
      },
      observed: {
        'en-CA':
          'In the French test, the assistant stated that customers have seven days to request a refund. The matched English response correctly stated thirty days.',
        'fr-CA':
          'Dans le test en français, l’assistant a affirmé que les clients disposent de sept jours pour demander un remboursement. La réponse anglaise appariée indiquait correctement trente jours.',
      },
      expected: {
        'en-CA':
          'The authoritative refund policy (version 4.2, section 3) provides thirty days from delivery, in both languages.',
        'fr-CA':
          'La politique de remboursement faisant autorité (version 4.2, section 3) prévoit trente jours suivant la livraison, dans les deux langues.',
      },
      customerImpact: {
        'en-CA':
          'A French-speaking customer may abandon a valid refund request, or perceive unequal service.',
        'fr-CA':
          'Un client francophone pourrait abandonner une demande de remboursement valide ou percevoir un service inégal.',
      },
      remediation: {
        'en-CA':
          'Replace the localized refund knowledge entry with the approved policy source, add a shared structured policy field used by both locales, and require escalation when the source cannot be retrieved.',
        'fr-CA':
          'Remplacer l’entrée localisée sur les remboursements par la source de politique approuvée, ajouter un champ de politique structuré partagé par les deux langues, et exiger une escalade lorsque la source est introuvable.',
      },
      verification: {
        'en-CA':
          'Repeat ten matched refund scenarios in English and French, including paraphrases and a follow-up question.',
        'fr-CA':
          'Reprendre dix scénarios de remboursement appariés en anglais et en français, incluant des reformulations et une question de suivi.',
      },
      evidenceRef: 'refund_window_03 · turn 2',
      confidence: 'high',
    },
    {
      id: 'F-002',
      severity: 'high',
      dimension: 'escalation_and_handoff',
      locale: 'fr-CA',
      title: {
        'en-CA': 'No human handoff offered in French after two failed attempts',
        'fr-CA':
          'Aucun transfert à une personne offert en français après deux échecs',
      },
      observed: {
        'en-CA':
          'After two unsuccessful attempts to resolve a delivery issue, the French assistant repeated its previous answer. The English assistant offered a support contact on the second attempt.',
        'fr-CA':
          'Après deux tentatives infructueuses de résoudre un problème de livraison, l’assistant francophone a répété sa réponse précédente. L’assistant anglophone offrait un contact d’assistance dès la deuxième tentative.',
      },
      expected: {
        'en-CA':
          'The escalation rule supplied during onboarding requires offering a human contact after two failed resolution attempts, in both languages.',
        'fr-CA':
          'La règle d’escalade fournie lors de l’intégration exige d’offrir un contact humain après deux tentatives de résolution infructueuses, dans les deux langues.',
      },
      customerImpact: {
        'en-CA':
          'French-speaking customers are held in an unproductive loop and are more likely to abandon or complain publicly.',
        'fr-CA':
          'Les clients francophones sont retenus dans une boucle improductive et sont plus susceptibles d’abandonner ou de se plaindre publiquement.',
      },
      remediation: {
        'en-CA':
          'Apply the escalation rule at the conversation level rather than per localized template, and add a regression test for the two-attempt threshold in each language.',
        'fr-CA':
          'Appliquer la règle d’escalade au niveau de la conversation plutôt que par gabarit localisé, et ajouter un test de régression pour le seuil de deux tentatives dans chaque langue.',
      },
      verification: {
        'en-CA':
          'Re-run the eight escalation scenarios in both languages, including the closed-hours variant.',
        'fr-CA':
          'Réexécuter les huit scénarios d’escalade dans les deux langues, y compris la variante hors des heures d’ouverture.',
      },
      evidenceRef: 'escalation_loop_02 · turns 3–5',
      confidence: 'high',
    },
    {
      id: 'F-003',
      severity: 'medium',
      dimension: 'context_and_memory',
      locale: 'en-CA',
      title: {
        'en-CA': 'Order number forgotten after a topic change',
        'fr-CA': 'Numéro de commande oublié après un changement de sujet',
      },
      observed: {
        'en-CA':
          'The assistant asked for the order number a second time after the customer asked an unrelated shipping question mid-conversation.',
        'fr-CA':
          'L’assistant a redemandé le numéro de commande après que le client a posé une question de livraison sans lien au milieu de la conversation.',
      },
      expected: {
        'en-CA':
          'Facts already provided in the conversation should persist across topic changes within the same session.',
        'fr-CA':
          'Les faits déjà fournis dans la conversation devraient persister malgré un changement de sujet dans la même session.',
      },
      customerImpact: {
        'en-CA':
          'Added friction and a perception that the customer is not being listened to.',
        'fr-CA':
          'Friction supplémentaire et impression que le client n’est pas écouté.',
      },
      remediation: {
        'en-CA':
          'Persist extracted entities for the session rather than per intent, and confirm rather than re-ask when a value is already known.',
        'fr-CA':
          'Conserver les entités extraites pour la session plutôt que par intention, et confirmer au lieu de redemander lorsqu’une valeur est déjà connue.',
      },
      verification: {
        'en-CA':
          'Re-run the six multi-topic scenarios and confirm no repeated identity request.',
        'fr-CA':
          'Réexécuter les six scénarios multisujets et confirmer l’absence de demande d’identification répétée.',
      },
      evidenceRef: 'context_switch_01 · turn 4',
      confidence: 'medium',
    },
  ],
};

export function localized(text: LocalizedText, locale: Locale): string {
  return text[locale];
}
