import type { Locale } from '@/lib/i18n';
import type {
  AiSystem,
  AuthorizationAttestation,
  KnowledgeSource,
  Project,
} from '@/data/types';
import { checkLocaleScope } from '@/domain/entitlements/entitlements';
import {
  audit,
  fail,
  ok,
  permit,
  type ServiceContext,
  type ServiceResult,
} from './context';

/**
 * Onboarding, authorization and scope review.
 *
 * PRD refs: FR-ONB-001..005, FR-SYS-001, section 8.2 and 8.3.
 */

export const ATTESTATION_DOCUMENT_VERSION = 'authorization@1.0.0';

/** Default validity of an attestation before it must be renewed (FR-ONB-002). */
export const ATTESTATION_VALIDITY_DAYS = 90;

export type OnboardingStepKey =
  | 'organization'
  | 'system'
  | 'languages'
  | 'authorization'
  | 'capture_method'
  | 'knowledge_sources'
  | 'escalation'
  | 'submission';

export interface OnboardingStep {
  key: OnboardingStepKey;
  complete: boolean;
  /** What the customer still has to do. Empty when complete. */
  missing: string[];
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  completeCount: number;
  totalCount: number;
  canSubmit: boolean;
  submittedAt: Date | null;
  acceptedAt: Date | null;
}

/**
 * Compute checklist state from stored data.
 *
 * PRD FR-ONB-001: "Display progress ... System validates completeness and
 * displays missing items." Deriving this rather than storing a progress flag
 * means the checklist cannot drift out of sync with reality.
 */
export async function getOnboardingStatus(
  context: ServiceContext,
  organizationId: string,
  projectId: string,
): Promise<ServiceResult<OnboardingStatus>> {
  const decision = permit(context, organizationId, 'project.read', {
    projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  const project = await context.data.projects.findById(
    organizationId,
    projectId,
  );
  if (!project) return fail('NOT_FOUND', 'No such project.');

  const organization =
    await context.data.organizations.findById(organizationId);
  const system = await context.data.aiSystems.findByProject(
    organizationId,
    projectId,
  );
  const attestation = await context.data.authorizations.findActive(
    organizationId,
    projectId,
    context.now(),
  );
  const sources = await context.data.knowledgeSources.listForProject(
    organizationId,
    projectId,
  );

  const steps: OnboardingStep[] = [
    {
      key: 'organization',
      complete: Boolean(organization?.legalName && organization?.billingEmail),
      missing: [
        ...(organization?.legalName ? [] : ['legal_name']),
        ...(organization?.billingEmail ? [] : ['billing_email']),
      ],
    },
    {
      key: 'system',
      complete: Boolean(system?.displayName && system?.systemOwnerName),
      missing: [
        ...(system ? [] : ['system_record']),
        ...(system && !system.systemOwnerName ? ['system_owner'] : []),
      ],
    },
    {
      key: 'languages',
      complete: project.locales.length > 0,
      missing: project.locales.length > 0 ? [] : ['locales'],
    },
    {
      key: 'authorization',
      complete: attestation !== null,
      missing: attestation ? [] : ['authorization_attestation'],
    },
    {
      key: 'capture_method',
      complete: Boolean(system?.channel),
      missing: system?.channel ? [] : ['capture_method'],
    },
    {
      key: 'knowledge_sources',
      // FR-ONB-004 + 16.3: sources are optional when structured expected
      // answers are sufficient, but at least one authoritative reference is
      // required before an accuracy claim can be evidenced.
      complete: sources.length > 0,
      missing: sources.length > 0 ? [] : ['authoritative_source'],
    },
    {
      key: 'escalation',
      complete: Boolean(system?.escalationRules),
      missing: system?.escalationRules ? [] : ['escalation_rules'],
    },
    {
      key: 'submission',
      complete: project.onboardingCompletedAt !== null,
      missing: project.onboardingCompletedAt ? [] : ['submit'],
    },
  ];

  const prerequisiteSteps = steps.filter((s) => s.key !== 'submission');
  const completeCount = steps.filter((s) => s.complete).length;

  return ok({
    steps,
    completeCount,
    totalCount: steps.length,
    canSubmit:
      prerequisiteSteps.every((s) => s.complete) &&
      project.onboardingCompletedAt === null,
    submittedAt: project.onboardingCompletedAt,
    acceptedAt: project.onboardingAcceptedAt,
  });
}

export interface SystemProfileInput {
  displayName: string;
  systemOwnerName: string;
  environment: AiSystem['environment'];
  channel: AiSystem['channel'];
  vendorModel?: string;
  supportedLocales: Locale[];
  disclosureText?: string;
  escalationRules?: string;
  serviceHours?: string;
  knownLimitations?: string;
  dataCategories?: string[];
  authorizedHosts: string[];
  rateLimitPerMinute?: number;
}

/**
 * Create or update the AI system profile (FR-SYS-001).
 */
export async function saveSystemProfile(
  context: ServiceContext,
  organizationId: string,
  projectId: string,
  input: SystemProfileInput,
): Promise<ServiceResult<AiSystem>> {
  const decision = permit(
    context,
    organizationId,
    'project.update_onboarding',
    { projectId },
  );
  if (!decision.allowed) return fail(decision.code, decision.message);

  const project = await context.data.projects.findById(
    organizationId,
    projectId,
  );
  if (!project) return fail('NOT_FOUND', 'No such project.');

  if (project.onboardingAcceptedAt !== null) {
    return fail(
      'INVALID_STATE',
      'Onboarding has been accepted. Changing scope requires a new authorization.',
    );
  }

  if (input.displayName.trim() === '') {
    return fail('VALIDATION_FAILED', 'A system name is required.');
  }

  // Hosts are the allowlist the SSRF guard checks against, so a malformed entry
  // here becomes a security control failure later.
  const hosts = input.authorizedHosts
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h.length > 0);

  for (const host of hosts) {
    if (host.includes('/') || host.includes(' ')) {
      return fail(
        'VALIDATION_FAILED',
        `"${host}" is not a valid host name. Enter a host such as api.example.ca, not a full URL.`,
      );
    }
  }

  const existing = await context.data.aiSystems.findByProject(
    organizationId,
    projectId,
  );

  const system: AiSystem = {
    id: existing?.id ?? context.newId(),
    organizationId,
    projectId,
    displayName: input.displayName.trim(),
    systemOwnerName: input.systemOwnerName.trim() || null,
    environment: input.environment,
    channel: input.channel,
    vendorModel: input.vendorModel?.trim() || null,
    supportedLocales: input.supportedLocales,
    disclosureText: input.disclosureText?.trim() || null,
    escalationRules: input.escalationRules?.trim() || null,
    serviceHours: input.serviceHours?.trim() || null,
    knownLimitations: input.knownLimitations?.trim() || null,
    dataCategories: input.dataCategories ?? [],
    authorizedHosts: hosts,
    rateLimitPerMinute: input.rateLimitPerMinute ?? null,
  };

  const saved = await context.data.aiSystems.upsert(system);

  await audit(context, {
    organizationId,
    action: 'project.system_profile_saved',
    objectType: 'ai_system',
    objectId: saved.id,
    outcome: 'success',
  });

  return ok(saved);
}

export interface AttestationInput {
  systemId: string;
  authorizedHosts: string[];
  locales: Locale[];
  restrictedTopics: string[];
  prohibitedData: string[];
  /** Every confirmation in FR-ONB-002 must be explicitly true. */
  confirmations: {
    ownsOrAuthorized: boolean;
    scopeAndEndpointsAuthorized: boolean;
    noRealSensitiveData: boolean;
    noThirdPartyCredentials: boolean;
    acceptsRateAndTimingLimits: boolean;
    understandsNotLegalCertification: boolean;
  };
}

/**
 * Sign the testing authorization attestation (FR-ONB-002).
 *
 * Every confirmation must be true. A partially signed attestation is not a
 * weaker authorization — it is no authorization, because the whole point is
 * that the signer accepted each specific statement.
 */
export async function signAuthorization(
  context: ServiceContext,
  organizationId: string,
  projectId: string,
  input: AttestationInput,
): Promise<ServiceResult<AuthorizationAttestation>> {
  const decision = permit(
    context,
    organizationId,
    'project.sign_authorization',
    { projectId },
  );
  if (!decision.allowed) return fail(decision.code, decision.message);
  if (!context.actor) return fail('NOT_AUTHENTICATED', 'Sign in to continue.');

  const project = await context.data.projects.findById(
    organizationId,
    projectId,
  );
  if (!project) return fail('NOT_FOUND', 'No such project.');

  const unconfirmed = Object.entries(input.confirmations)
    .filter(([, value]) => value !== true)
    .map(([key]) => key);

  if (unconfirmed.length > 0) {
    return fail(
      'VALIDATION_FAILED',
      'Every authorization statement must be confirmed.',
      { unconfirmed },
    );
  }

  if (input.authorizedHosts.length === 0) {
    return fail(
      'VALIDATION_FAILED',
      'At least one authorized host is required before testing can be scoped.',
    );
  }

  // The attestation cannot authorize languages the package does not cover.
  const localeCheck = checkLocaleScope(project.entitlement, input.locales);
  if (!localeCheck.allowed) {
    return fail('ENTITLEMENT_EXHAUSTED', localeCheck.message);
  }

  const now = context.now();
  const expiresAt = new Date(
    now.getTime() + ATTESTATION_VALIDITY_DAYS * 86_400_000,
  );

  const attestation: AuthorizationAttestation = {
    id: context.newId(),
    organizationId,
    projectId,
    signerUserId: context.actor.userId,
    documentVersion: ATTESTATION_DOCUMENT_VERSION,
    scope: {
      systemId: input.systemId,
      authorizedHosts: input.authorizedHosts.map((h) => h.trim().toLowerCase()),
      locales: input.locales,
      restrictedTopics: input.restrictedTopics,
      prohibitedData: input.prohibitedData,
    },
    acceptedAt: now,
    expiresAt,
    revokedAt: null,
    revokedReason: null,
  };

  const saved = await context.data.authorizations.create(attestation);

  await audit(context, {
    organizationId,
    action: 'project.authorization_signed',
    objectType: 'authorization_attestation',
    objectId: saved.id,
    outcome: 'success',
    riskLevel: 'high',
    metadata: { documentVersion: ATTESTATION_DOCUMENT_VERSION },
  });

  return ok(saved);
}

/** Revoke an attestation. Testing must stop immediately (16.9). */
export async function revokeAuthorization(
  context: ServiceContext,
  organizationId: string,
  projectId: string,
  attestationId: string,
  reason: string,
): Promise<ServiceResult<void>> {
  const decision = permit(
    context,
    organizationId,
    'project.revoke_authorization',
    { projectId },
  );
  if (!decision.allowed) return fail(decision.code, decision.message);

  if (reason.trim() === '') {
    return fail('VALIDATION_FAILED', 'A revocation reason is required.');
  }

  await context.data.authorizations.revoke(
    attestationId,
    context.now(),
    reason.trim(),
  );

  await audit(context, {
    organizationId,
    action: 'project.authorization_revoked',
    objectType: 'authorization_attestation',
    objectId: attestationId,
    outcome: 'success',
    riskLevel: 'high',
  });

  return ok(undefined);
}

export interface KnowledgeSourceInput {
  title: string;
  sourceType: KnowledgeSource['sourceType'];
  storageKey?: string;
  sourceUrl?: string;
  effectiveDate?: Date;
  authorityRank: number;
  version?: string;
  checksum?: string;
}

/** Register an uploaded or linked authoritative source (FR-ONB-004). */
export async function addKnowledgeSource(
  context: ServiceContext,
  organizationId: string,
  projectId: string,
  input: KnowledgeSourceInput,
): Promise<ServiceResult<KnowledgeSource>> {
  const decision = permit(context, organizationId, 'project.upload_source', {
    projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  if (!input.storageKey && !input.sourceUrl) {
    return fail('VALIDATION_FAILED', 'A file or a URL is required.');
  }
  if (input.authorityRank < 1 || input.authorityRank > 5) {
    return fail('VALIDATION_FAILED', 'Authority rank must be between 1 and 5.');
  }

  const source: KnowledgeSource = {
    id: context.newId(),
    organizationId,
    projectId,
    title: input.title.trim(),
    sourceType: input.sourceType,
    storageKey: input.storageKey ?? null,
    sourceUrl: input.sourceUrl ?? null,
    effectiveDate: input.effectiveDate ?? null,
    authorityRank: input.authorityRank,
    version: input.version ?? null,
    checksum: input.checksum ?? null,
    // Uploads are not usable until scanning completes (16.1).
    scanStatus: 'pending',
    uploadedBy: context.actor?.userId ?? null,
    createdAt: context.now(),
  };

  const saved = await context.data.knowledgeSources.create(source);

  await audit(context, {
    organizationId,
    action: 'project.source_uploaded',
    objectType: 'knowledge_source',
    objectId: saved.id,
    outcome: 'success',
    metadata: { sourceType: saved.sourceType },
  });

  return ok(saved);
}

/** Submit onboarding for analyst review (FR-ONB-001 step 9). */
export async function submitOnboarding(
  context: ServiceContext,
  organizationId: string,
  projectId: string,
): Promise<ServiceResult<Project>> {
  const decision = permit(
    context,
    organizationId,
    'project.submit_onboarding',
    { projectId },
  );
  if (!decision.allowed) return fail(decision.code, decision.message);

  const status = await getOnboardingStatus(context, organizationId, projectId);
  if (!status.ok) return fail(status.code, status.message);

  if (!status.value.canSubmit) {
    const missing = status.value.steps
      .filter((s) => !s.complete && s.key !== 'submission')
      .flatMap((s) => s.missing);
    return fail('VALIDATION_FAILED', 'Onboarding is not complete.', {
      missing,
    });
  }

  const updated = await context.data.projects.update(
    organizationId,
    projectId,
    {
      onboardingCompletedAt: context.now(),
      status: 'scope_review',
    },
  );

  await audit(context, {
    organizationId,
    action: 'project.onboarding_submitted',
    objectType: 'project',
    objectId: projectId,
    outcome: 'success',
  });

  return ok(updated);
}

export type ScopeDecision = 'accept' | 'request_changes' | 'decline';

export const DECLINE_REASONS = [
  'unauthorized_target',
  'high_risk_regulated_use',
  'prohibited_data',
  'unsafe_instructions',
  'unavailable_access',
  'service_mismatch',
] as const;

export type DeclineReason = (typeof DECLINE_REASONS)[number];

export interface ScopeDecisionInput {
  decision: ScopeDecision;
  /** Shown to the customer. Must be professional and specific. */
  customerExplanation: string;
  /** Never shown to the customer (FR-ONB-003). */
  internalNotes?: string;
  declineReason?: DeclineReason;
}

/**
 * Analyst scope review (FR-ONB-003).
 *
 * Accepting requires an ACTIVE authorization attestation. That check lives here
 * rather than only at execution time so an engagement cannot be accepted into
 * the delivery pipeline on the strength of an expired authorization.
 */
export async function decideScope(
  context: ServiceContext,
  organizationId: string,
  projectId: string,
  input: ScopeDecisionInput,
): Promise<ServiceResult<Project>> {
  const decision = permit(context, organizationId, 'project.decide_scope', {
    projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  const project = await context.data.projects.findById(
    organizationId,
    projectId,
  );
  if (!project) return fail('NOT_FOUND', 'No such project.');

  if (project.onboardingCompletedAt === null) {
    return fail(
      'INVALID_STATE',
      'Onboarding has not been submitted for review yet.',
    );
  }

  if (input.customerExplanation.trim() === '') {
    return fail(
      'VALIDATION_FAILED',
      'A customer-facing explanation is required for every scope decision.',
    );
  }

  if (input.decision === 'decline' && !input.declineReason) {
    return fail('VALIDATION_FAILED', 'A decline reason is required.');
  }

  if (input.decision === 'accept') {
    const attestation = await context.data.authorizations.findActive(
      organizationId,
      projectId,
      context.now(),
    );
    if (!attestation) {
      return fail(
        'AUTHORIZATION_NOT_ACTIVE',
        'Scope cannot be accepted without a current authorization attestation.',
      );
    }
  }

  const nextStatus: Project['status'] =
    input.decision === 'accept'
      ? 'planning'
      : input.decision === 'decline'
        ? 'scope_declined'
        : 'onboarding';

  const patch: Partial<Project> = {
    status: nextStatus,
    scopeSummary: input.customerExplanation.trim(),
    ...(input.decision === 'accept'
      ? { onboardingAcceptedAt: context.now() }
      : {}),
    ...(input.decision === 'request_changes'
      ? { onboardingCompletedAt: null, blockedReason: 'waiting_on_customer' }
      : { blockedReason: null }),
  };

  const updated = await context.data.projects.update(
    organizationId,
    projectId,
    patch,
  );

  await audit(context, {
    organizationId,
    action: `project.scope_${input.decision}`,
    objectType: 'project',
    objectId: projectId,
    outcome: 'success',
    riskLevel: input.decision === 'decline' ? 'medium' : 'low',
    ...(input.declineReason
      ? { metadata: { declineReason: input.declineReason } }
      : {}),
  });

  return ok(updated);
}
