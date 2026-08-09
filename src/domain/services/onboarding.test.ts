import { beforeEach, describe, expect, it } from 'vitest';
import {
  addKnowledgeSource,
  decideScope,
  getOnboardingStatus,
  saveSystemProfile,
  signAuthorization,
  submitOnboarding,
  revokeAuthorization,
  type AttestationInput,
  type SystemProfileInput,
} from './onboarding';
import {
  ORG_ID,
  OTHER_ORG_ID,
  PROJECT_ID,
  createHarness,
  makeActor,
  seedProject,
  type Harness,
} from './test-harness';

const systemInput: SystemProfileInput = {
  displayName: 'Website help assistant',
  systemOwnerName: 'Dana Owner',
  environment: 'staging',
  channel: 'web_chat',
  supportedLocales: ['en-CA', 'fr-CA'],
  escalationRules: 'Offer a human after two failed attempts.',
  authorizedHosts: ['api.example.ca'],
};

const attestationInput: AttestationInput = {
  systemId: 'system_1',
  authorizedHosts: ['api.example.ca'],
  locales: ['en-CA', 'fr-CA'],
  restrictedTopics: [],
  prohibitedData: [],
  confirmations: {
    ownsOrAuthorized: true,
    scopeAndEndpointsAuthorized: true,
    noRealSensitiveData: true,
    noThirdPartyCredentials: true,
    acceptsRateAndTimingLimits: true,
    understandsNotLegalCertification: true,
  },
};

let harness: Harness;
const clientOwner = makeActor('client_owner');
const analyst = makeActor('analyst');
const otherClient = makeActor('client_owner', {
  userId: 'user_other',
  organizationId: OTHER_ORG_ID,
});

async function completeOnboarding(h: Harness): Promise<void> {
  const ctx = h.as(clientOwner);
  await saveSystemProfile(ctx, ORG_ID, PROJECT_ID, systemInput);
  await signAuthorization(ctx, ORG_ID, PROJECT_ID, attestationInput);
  await addKnowledgeSource(ctx, ORG_ID, PROJECT_ID, {
    title: 'Refund policy v4.2',
    sourceType: 'pdf',
    storageKey: 'org_1/policies/refund-v4.2.pdf',
    authorityRank: 1,
  });
}

beforeEach(async () => {
  harness = createHarness();
  await seedProject(harness);
});

describe('getOnboardingStatus', () => {
  it('reports every incomplete step with what is missing', async () => {
    const result = await getOnboardingStatus(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.canSubmit).toBe(false);
    const system = result.value.steps.find((s) => s.key === 'system');
    expect(system?.complete).toBe(false);
    expect(system?.missing).toContain('system_record');
  });

  it('becomes submittable once every prerequisite is complete', async () => {
    await completeOnboarding(harness);
    const result = await getOnboardingStatus(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.canSubmit).toBe(true);
  });

  it('denies a member of another organization', async () => {
    const result = await getOnboardingStatus(
      harness.as(otherClient),
      ORG_ID,
      PROJECT_ID,
    );
    expect(result).toMatchObject({ ok: false, code: 'NOT_A_MEMBER' });
  });
});

describe('saveSystemProfile', () => {
  it('normalizes and stores authorized hosts', async () => {
    const result = await saveSystemProfile(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      { ...systemInput, authorizedHosts: ['  API.Example.CA  ', ''] },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.authorizedHosts).toEqual(['api.example.ca']);
  });

  it('rejects a full URL where a host is expected', async () => {
    // The host list feeds the SSRF allowlist; a malformed entry there becomes a
    // security control failure at execution time.
    const result = await saveSystemProfile(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      { ...systemInput, authorizedHosts: ['https://api.example.ca/chat'] },
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('refuses edits after scope has been accepted', async () => {
    harness = createHarness();
    await seedProject(harness, { onboardingAccepted: true });
    const result = await saveSystemProfile(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      systemInput,
    );
    expect(result).toMatchObject({ ok: false, code: 'INVALID_STATE' });
  });

  it('denies a client viewer', async () => {
    const viewer = makeActor('client_viewer');
    const result = await saveSystemProfile(
      harness.as(viewer),
      ORG_ID,
      PROJECT_ID,
      systemInput,
    );
    expect(result).toMatchObject({ ok: false, code: 'ROLE_NOT_PERMITTED' });
  });
});

describe('signAuthorization', () => {
  it('records a signed attestation with an expiry', async () => {
    const result = await signAuthorization(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      attestationInput,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.signerUserId).toBe(clientOwner.userId);
    expect(result.value.expiresAt).not.toBeNull();
    expect(result.value.revokedAt).toBeNull();
  });

  it('refuses a partially confirmed attestation', async () => {
    // FR-ONB-002: every statement must be confirmed. Partial is not weaker
    // authorization; it is none.
    const result = await signAuthorization(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      {
        ...attestationInput,
        confirmations: {
          ...attestationInput.confirmations,
          ownsOrAuthorized: false,
        },
      },
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
    if (result.ok) return;
    expect(result.details).toMatchObject({ unconfirmed: ['ownsOrAuthorized'] });
  });

  it('refuses an attestation with no authorized host', async () => {
    const result = await signAuthorization(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      { ...attestationInput, authorizedHosts: [] },
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('refuses to authorize languages the package does not cover', async () => {
    harness = createHarness();
    await seedProject(harness, {
      packageCode: 'essential_audit',
      locales: ['en-CA'],
    });
    const result = await signAuthorization(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      { ...attestationInput, locales: ['en-CA', 'fr-CA'] },
    );
    expect(result).toMatchObject({
      ok: false,
      code: 'ENTITLEMENT_EXHAUSTED',
    });
  });

  it('does not let a contributor sign the authorization', async () => {
    const contributor = makeActor('client_contributor');
    const result = await signAuthorization(
      harness.as(contributor),
      ORG_ID,
      PROJECT_ID,
      attestationInput,
    );
    expect(result).toMatchObject({ ok: false, code: 'ROLE_NOT_PERMITTED' });
  });

  it('writes a high-risk audit event', async () => {
    await signAuthorization(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      attestationInput,
    );
    const events = await harness.context.data.auditEvents.list({ limit: 10 });
    const event = events.find(
      (e) => e.action === 'project.authorization_signed',
    );
    expect(event?.riskLevel).toBe('high');
  });
});

describe('revokeAuthorization', () => {
  it('revokes with a reason and clears the active attestation', async () => {
    const signed = await signAuthorization(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      attestationInput,
    );
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;

    const result = await revokeAuthorization(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      signed.value.id,
      'System decommissioned.',
    );
    expect(result.ok).toBe(true);

    const active = await harness.context.data.authorizations.findActive(
      ORG_ID,
      PROJECT_ID,
      harness.context.now(),
    );
    expect(active).toBeNull();
  });

  it('requires a reason', async () => {
    const result = await revokeAuthorization(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      'attestation_x',
      '   ',
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });
});

describe('addKnowledgeSource', () => {
  it('stores an upload as pending scan', async () => {
    // 16.1: uploads are not usable until scanning completes.
    const result = await addKnowledgeSource(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      {
        title: 'Refund policy',
        sourceType: 'pdf',
        storageKey: 'org_1/policies/refund.pdf',
        authorityRank: 1,
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scanStatus).toBe('pending');
  });

  it('requires a file or a URL', async () => {
    const result = await addKnowledgeSource(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      { title: 'Nothing', sourceType: 'pdf', authorityRank: 1 },
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('rejects an out-of-range authority rank', async () => {
    const result = await addKnowledgeSource(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      {
        title: 'Policy',
        sourceType: 'url',
        sourceUrl: 'https://example.ca/policy',
        authorityRank: 9,
      },
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });
});

describe('submitOnboarding', () => {
  it('moves the project to scope review when complete', async () => {
    await completeOnboarding(harness);
    const result = await submitOnboarding(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('scope_review');
    expect(result.value.onboardingCompletedAt).not.toBeNull();
  });

  it('lists what is missing when incomplete', async () => {
    const result = await submitOnboarding(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
    );
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
    if (result.ok) return;
    expect(
      (result.details as { missing: string[] }).missing.length,
    ).toBeGreaterThan(0);
  });
});

describe('decideScope', () => {
  beforeEach(async () => {
    await completeOnboarding(harness);
    await submitOnboarding(harness.as(clientOwner), ORG_ID, PROJECT_ID);
  });

  it('accepts scope and moves the project to planning', async () => {
    const result = await decideScope(harness.as(analyst), ORG_ID, PROJECT_ID, {
      decision: 'accept',
      customerExplanation: 'Scope confirmed. Testing begins Monday.',
      internalNotes: 'Customer has a staging environment.',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('planning');
    expect(result.value.onboardingAcceptedAt).not.toBeNull();
  });

  it('refuses to accept scope without an active authorization', async () => {
    const attestations =
      await harness.context.data.authorizations.listForProject(
        ORG_ID,
        PROJECT_ID,
      );
    for (const attestation of attestations) {
      await harness.context.data.authorizations.revoke(
        attestation.id,
        harness.context.now(),
        'test',
      );
    }

    const result = await decideScope(harness.as(analyst), ORG_ID, PROJECT_ID, {
      decision: 'accept',
      customerExplanation: 'Looks fine.',
    });
    expect(result).toMatchObject({
      ok: false,
      code: 'AUTHORIZATION_NOT_ACTIVE',
    });
  });

  it('requires a customer-facing explanation for every decision', async () => {
    const result = await decideScope(harness.as(analyst), ORG_ID, PROJECT_ID, {
      decision: 'accept',
      customerExplanation: '   ',
    });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('requires a reason code when declining', async () => {
    const result = await decideScope(harness.as(analyst), ORG_ID, PROJECT_ID, {
      decision: 'decline',
      customerExplanation: 'This falls outside what we can safely assess.',
    });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
  });

  it('declines with a reason and records a medium-risk audit event', async () => {
    const result = await decideScope(harness.as(analyst), ORG_ID, PROJECT_ID, {
      decision: 'decline',
      customerExplanation:
        'This system makes lending decisions, which is outside our current expertise.',
      declineReason: 'high_risk_regulated_use',
      internalNotes: 'Refer back if we build a regulated-decision procedure.',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('scope_declined');

    const events = await harness.context.data.auditEvents.list({ limit: 10 });
    const event = events.find((e) => e.action === 'project.scope_decline');
    expect(event?.riskLevel).toBe('medium');
    expect(event?.metadata).toMatchObject({
      declineReason: 'high_risk_regulated_use',
    });
  });

  it('returns the project to onboarding when changes are requested', async () => {
    const result = await decideScope(harness.as(analyst), ORG_ID, PROJECT_ID, {
      decision: 'request_changes',
      customerExplanation: 'Please add the escalation policy document.',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('onboarding');
    expect(result.value.onboardingCompletedAt).toBeNull();
    expect(result.value.blockedReason).toBe('waiting_on_customer');
  });

  it('does not let a client decide their own scope', async () => {
    const result = await decideScope(
      harness.as(clientOwner),
      ORG_ID,
      PROJECT_ID,
      { decision: 'accept', customerExplanation: 'Approved by me.' },
    );
    expect(result).toMatchObject({ ok: false, code: 'ROLE_NOT_PERMITTED' });
  });

  it('never stores internal notes in the customer-visible summary', async () => {
    await decideScope(harness.as(analyst), ORG_ID, PROJECT_ID, {
      decision: 'accept',
      customerExplanation: 'Scope confirmed.',
      internalNotes: 'SECRET: customer seems disorganized.',
    });
    const project = await harness.context.data.projects.findById(
      ORG_ID,
      PROJECT_ID,
    );
    expect(project?.scopeSummary).toBe('Scope confirmed.');
    expect(JSON.stringify(project)).not.toContain('SECRET');
  });
});
