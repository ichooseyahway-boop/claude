/**
 * Launch package catalogue (PRD 6.1-6.4).
 *
 * PRD 6 requires prices to live in configuration and in the payment provider's
 * price records, never hard-coded into business logic. The amounts here are
 * the *display* reference used by the pricing page and to seed
 * `service_packages`; the charge is always created from the provider price ID.
 * Nothing in `src/domain` makes a decision based on these numbers.
 */

import { REFERENCE_ENTITLEMENTS, type Entitlement, type PackageCode } from './entitlements';

export interface ServicePackage {
  readonly code: PackageCode;
  readonly billingType: 'one_time' | 'subscription' | 'quote';
  /** Integer cents. `null` for a sales-assisted quote (PRD 6.4). */
  readonly referenceAmountCents: number | null;
  readonly currency: 'CAD';
  readonly entitlement: Entitlement;
  readonly displayOrder: number;
  readonly highlight: boolean;
  /** The provider price ID is injected from configuration at runtime. */
  readonly providerPriceIdEnvVar: string;
}

export const SERVICE_PACKAGES: readonly ServicePackage[] = Object.freeze([
  {
    code: 'essential_audit',
    billingType: 'one_time',
    referenceAmountCents: 49_500,
    currency: 'CAD',
    entitlement: REFERENCE_ENTITLEMENTS.essential_audit,
    displayOrder: 1,
    highlight: false,
    providerPriceIdEnvVar: 'STRIPE_PRICE_ESSENTIAL_AUDIT',
  },
  {
    code: 'bilingual_pro_audit',
    billingType: 'one_time',
    referenceAmountCents: 175_000,
    currency: 'CAD',
    entitlement: REFERENCE_ENTITLEMENTS.bilingual_pro_audit,
    displayOrder: 2,
    highlight: true,
    providerPriceIdEnvVar: 'STRIPE_PRICE_BILINGUAL_PRO_AUDIT',
  },
  {
    code: 'continuous_assurance',
    billingType: 'subscription',
    referenceAmountCents: 69_900,
    currency: 'CAD',
    entitlement: REFERENCE_ENTITLEMENTS.continuous_assurance,
    displayOrder: 3,
    highlight: false,
    providerPriceIdEnvVar: 'STRIPE_PRICE_CONTINUOUS_ASSURANCE',
  },
  {
    code: 'enterprise_managed',
    billingType: 'quote',
    // PRD 6.4 is sales-assisted and invoiced; there is no self-serve price.
    referenceAmountCents: null,
    currency: 'CAD',
    entitlement: REFERENCE_ENTITLEMENTS.enterprise_managed,
    displayOrder: 4,
    highlight: false,
    providerPriceIdEnvVar: 'STRIPE_PRICE_ENTERPRISE_MANAGED',
  },
]);

export function packageByCode(code: PackageCode): ServicePackage | undefined {
  return SERVICE_PACKAGES.find((servicePackage) => servicePackage.code === code);
}

/**
 * Package copy, kept beside the message catalogues rather than inside them
 * because the inclusion lists differ in length per package and are easier to
 * keep in sync when they sit next to the entitlement they describe.
 */
export interface PackageCopy {
  readonly name: string;
  readonly summary: string;
  readonly includes: readonly string[];
}

export const PACKAGE_COPY: Readonly<
  Record<'en-CA' | 'fr-CA', Readonly<Record<PackageCode, PackageCopy>>>
> = Object.freeze({
  'en-CA': {
    essential_audit: {
      name: 'Essential Audit',
      summary: 'One system, one language, a focused first look.',
      includes: [
        'One customer-facing AI system',
        'One language',
        'Up to 25 approved scenarios',
        'Manual or authorized API response capture',
        'Core scorecard',
        'Up to five prioritized findings',
        'Web report and downloadable PDF',
        'Five-business-day target after onboarding is complete',
        'One correction request for factual errors within seven days',
      ],
    },
    bilingual_pro_audit: {
      name: 'Bilingual Pro Audit',
      summary: 'English and Canadian French, compared directly, with a findings call.',
      includes: [
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
    },
    continuous_assurance: {
      name: 'Continuous Assurance',
      summary: 'Monthly reassessment, so a change to your system does not go unnoticed.',
      includes: [
        'One system, up to 100 scenarios per monthly cycle',
        'Scheduled monthly reassessment',
        'Change-over-time dashboard',
        'Alerts on new critical and high findings',
        'Bilingual parity tracking when configured',
        'One quarterly 45-minute review',
        'Report archive',
        'Configurable usage cap with paid overages',
      ],
    },
    enterprise_managed: {
      name: 'Enterprise Managed Assurance',
      summary: 'Multiple systems, procurement documentation and negotiated service levels.',
      includes: [
        'Configurable system count',
        'Negotiated service levels',
        'Custom scenarios for your industry',
        'Procurement and vendor-review documentation',
        'Optional single sign-on',
        'Longer evidence retention',
        'Dedicated reporting',
      ],
    },
  },
  'fr-CA': {
    essential_audit: {
      name: 'Audit Essentiel',
      summary: 'Un système, une langue : un premier examen ciblé.',
      includes: [
        'Un système d’IA en contact avec la clientèle',
        'Une langue',
        "Jusqu'à 25 scénarios approuvés",
        'Saisie des réponses manuelle ou par API autorisée',
        'Fiche de notation de base',
        "Jusqu'à cinq constats prioritaires",
        'Rapport Web et PDF téléchargeable',
        'Délai cible de cinq jours ouvrables après le démarrage',
        'Une demande de correction des erreurs factuelles dans les sept jours',
      ],
    },
    bilingual_pro_audit: {
      name: 'Audit Pro bilingue',
      summary:
        'Anglais et français canadien, comparés directement, avec un appel de présentation des constats.',
      includes: [
        'Un système d’IA en contact avec la clientèle',
        'Anglais (Canada) et français (Canada)',
        "Jusqu'à 75 scénarios, dont des paires bilingues équivalentes",
        'Fiche de notation, indice de parité et constats classés par gravité',
        "Jusqu'à quinze constats prioritaires",
        'Sections de rapport pour la direction et pour les équipes techniques',
        'Un appel de 45 minutes sur les constats',
        "Un retest d'au plus 20 scénarios échoués dans les 30 jours",
        'Délai cible de cinq jours ouvrables après le démarrage',
      ],
    },
    continuous_assurance: {
      name: 'Surveillance continue',
      summary: 'Une réévaluation mensuelle, pour qu’un changement ne passe pas inaperçu.',
      includes: [
        "Un système, jusqu'à 100 scénarios par cycle mensuel",
        'Réévaluation mensuelle planifiée',
        'Tableau de bord de l’évolution dans le temps',
        'Alertes sur les nouveaux constats critiques et élevés',
        'Suivi de la parité bilingue, si configuré',
        'Une révision trimestrielle de 45 minutes',
        'Archives des rapports',
        'Plafond d’utilisation configurable avec dépassements facturés',
      ],
    },
    enterprise_managed: {
      name: 'Assurance gérée – Entreprise',
      summary:
        'Plusieurs systèmes, documentation d’approvisionnement et niveaux de service négociés.',
      includes: [
        'Nombre de systèmes configurable',
        'Niveaux de service négociés',
        'Scénarios personnalisés pour votre secteur',
        'Documentation d’approvisionnement et d’évaluation des fournisseurs',
        'Authentification unique en option',
        'Conservation prolongée des preuves',
        'Rapports dédiés',
      ],
    },
  },
});
