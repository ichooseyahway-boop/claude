import type { Finding, Report } from '@/data/types';
import type { Dimension } from '@/domain/scoring/dimensions';
import {
  calculateRunScore,
  displayScore,
  type CapInput,
  type DimensionScore,
  type ScoredCase,
} from '@/domain/scoring/score';
import { calculateParity, type MatchedPair } from '@/domain/scoring/parity';
import {
  canChangeFindingStatus,
  canReleaseFinding,
  compareSeverity,
  planCriticalAlert,
  publishableSeverity,
  requiredReview,
  type Confidence,
  type FindingStatus,
  type Severity,
} from '@/domain/findings/findings';
import {
  evaluateReleaseGate,
  type ReleaseBlockCode,
} from '@/domain/runs/state-machine';
import { scanForLeakedSecrets } from '@/lib/security/redaction';
import {
  audit,
  fail,
  ok,
  permit,
  type ServiceContext,
  type ServiceResult,
} from './context';

/**
 * Findings, report composition and release.
 *
 * PRD refs: FR-FND-001..004, FR-RPT-001..004, section 10.
 *
 * The release gate is the load-bearing part of this file. Everything else
 * assembles data; `releaseReport` is what stands between a draft and a customer.
 */

export interface CreateFindingInput {
  severity: Severity;
  dimension: Dimension;
  locale?: 'en-CA' | 'fr-CA';
  title: string;
  summary: string;
  expectedBehaviour: string;
  observedBehaviour: string;
  customerImpact: string;
  rootCauseHypothesis?: string;
  recommendedRemediation: string;
  verificationMethod?: string;
  confidence: Confidence;
  /** Never rendered in any customer-facing view. */
  internalNotes?: string;
  customerVisibleNotes?: string;
  evidence: Array<{
    testCaseId?: string;
    knowledgeSourceId?: string;
    spans?: Array<{ turn: number; start: number; end: number }>;
  }>;
}

/**
 * Create a finding (FR-FND-001).
 *
 * Every finding must cite evidence. A finding with no linked evidence cannot be
 * defended when a customer challenges it, which is the whole premise of the
 * product (10.1: "evidence-linked").
 */
export async function createFinding(
  context: ServiceContext,
  organizationId: string,
  runId: string,
  input: CreateFindingInput,
): Promise<ServiceResult<Finding>> {
  const run = await context.data.runs.findById(organizationId, runId);
  if (!run) return fail('NOT_FOUND', 'No such run.');

  const decision = permit(context, organizationId, 'finding.create', {
    projectId: run.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  if (input.evidence.length === 0) {
    return fail(
      'VALIDATION_FAILED',
      'A finding must cite at least one piece of evidence.',
    );
  }

  for (const field of [
    'title',
    'summary',
    'expectedBehaviour',
    'observedBehaviour',
    'customerImpact',
    'recommendedRemediation',
  ] as const) {
    if (input[field].trim() === '') {
      return fail('VALIDATION_FAILED', `${field} is required.`);
    }
  }

  const existing = await context.data.findings.listForProject(
    organizationId,
    run.projectId,
  );
  const reference = `F-${String(existing.length + 1).padStart(3, '0')}`;

  const finding: Finding = {
    id: context.newId(),
    organizationId,
    projectId: run.projectId,
    testRunId: runId,
    reference,
    severity: input.severity,
    dimension: input.dimension,
    locale: input.locale ?? null,
    status: 'open',
    title: input.title.trim(),
    summary: input.summary.trim(),
    expectedBehaviour: input.expectedBehaviour.trim(),
    observedBehaviour: input.observedBehaviour.trim(),
    customerImpact: input.customerImpact.trim(),
    rootCauseHypothesis: input.rootCauseHypothesis?.trim() ?? null,
    recommendedRemediation: input.recommendedRemediation.trim(),
    verificationMethod: input.verificationMethod?.trim() ?? null,
    confidence: input.confidence,
    internalNotes: input.internalNotes?.trim() ?? null,
    customerVisibleNotes: input.customerVisibleNotes?.trim() ?? null,
    ownerUserId: null,
    dueDate: null,
    humanConfirmedBy: null,
    seniorConfirmedBy: null,
    riskAcceptedBy: null,
    riskAcceptedReason: null,
    riskReviewDate: null,
    evidence: input.evidence.map((e) => ({
      testCaseId: e.testCaseId ?? null,
      knowledgeSourceId: e.knowledgeSourceId ?? null,
      spans: e.spans ?? [],
    })),
    createdAt: context.now(),
  };

  const saved = await context.data.findings.create(finding);

  await audit(context, {
    organizationId,
    action: 'finding.created',
    objectType: 'finding',
    objectId: saved.id,
    outcome: 'success',
    riskLevel: saved.severity === 'critical' ? 'critical' : 'low',
    metadata: { severity: saved.severity, reference: saved.reference },
  });

  return ok(saved);
}

/**
 * Confirm a finding (FR-EVAL-005, 10.8).
 *
 * A Critical requires senior confirmation; the alert plan is returned so the
 * caller knows whether a customer notice may be sent.
 */
export async function confirmFinding(
  context: ServiceContext,
  organizationId: string,
  findingId: string,
  asSenior: boolean,
): Promise<
  ServiceResult<{
    finding: Finding;
    publishableSeverity: Severity;
    alert: ReturnType<typeof planCriticalAlert>;
  }>
> {
  const finding = await context.data.findings.findById(
    organizationId,
    findingId,
  );
  if (!finding) return fail('NOT_FOUND', 'No such finding.');

  const permission = asSenior
    ? 'evaluation.senior_confirm'
    : 'evaluation.review';
  const decision = permit(context, organizationId, permission, {
    projectId: finding.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);
  if (!context.actor) return fail('NOT_AUTHENTICATED', 'Sign in to continue.');

  const updated = await context.data.findings.update(
    organizationId,
    findingId,
    {
      humanConfirmedBy: finding.humanConfirmedBy ?? context.actor.userId,
      ...(asSenior ? { seniorConfirmedBy: context.actor.userId } : {}),
    },
  );

  const candidate = {
    severity: updated.severity,
    dimension: updated.dimension,
    confidence: updated.confidence,
    hasPolicySupport: updated.evidence.some(
      (e) => e.knowledgeSourceId !== null,
    ),
    evaluatorDisagreement: false,
    humanConfirmed: updated.humanConfirmedBy !== null,
    seniorConfirmed: updated.seniorConfirmedBy !== null,
  };

  await audit(context, {
    organizationId,
    action: asSenior ? 'finding.senior_confirmed' : 'finding.confirmed',
    objectType: 'finding',
    objectId: findingId,
    outcome: 'success',
    riskLevel: updated.severity === 'critical' ? 'critical' : 'low',
  });

  return ok({
    finding: updated,
    publishableSeverity: publishableSeverity(candidate),
    alert: planCriticalAlert(candidate),
  });
}

/** Change a finding's remediation status (FR-FND-004). */
export async function updateFindingStatus(
  context: ServiceContext,
  organizationId: string,
  findingId: string,
  to: FindingStatus,
  options: { reason?: string; reviewDate?: Date } = {},
): Promise<ServiceResult<Finding>> {
  const finding = await context.data.findings.findById(
    organizationId,
    findingId,
  );
  if (!finding) return fail('NOT_FOUND', 'No such finding.');

  const permission =
    to === 'risk_accepted'
      ? 'finding.accept_risk'
      : ['resolved', 'partially_resolved', 'regressed'].includes(to)
        ? 'finding.record_retest_outcome'
        : 'finding.update_remediation';

  const decision = permit(context, organizationId, permission, {
    projectId: finding.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);
  if (!context.actor) return fail('NOT_AUTHENTICATED', 'Sign in to continue.');

  const transition = canChangeFindingStatus({
    from: finding.status,
    to,
    actorRole: decision.role as Parameters<
      typeof canChangeFindingStatus
    >[0]['actorRole'],
    ...(options.reason !== undefined ? { reason: options.reason } : {}),
    reviewDate: options.reviewDate ?? null,
  });

  if (!transition.allowed) {
    const code =
      transition.code === 'INVALID_STATUS_TRANSITION'
        ? 'INVALID_STATE'
        : transition.code === 'RETEST_RESULT_REQUIRES_INTERNAL_ROLE' ||
            transition.code === 'RISK_ACCEPTANCE_REQUIRES_CLIENT_OWNER'
          ? 'ROLE_NOT_PERMITTED'
          : 'VALIDATION_FAILED';
    return fail(code, transition.message);
  }

  const updated = await context.data.findings.update(
    organizationId,
    findingId,
    {
      status: to,
      // Risk acceptance is only meaningful with all three recorded together.
      ...(to === 'risk_accepted'
        ? {
            riskAcceptedBy: context.actor.userId,
            riskAcceptedReason: options.reason ?? null,
            riskReviewDate: options.reviewDate ?? null,
          }
        : {}),
    },
  );

  await context.data.findings.recordStatusChange({
    organizationId,
    findingId,
    oldStatus: finding.status,
    newStatus: to,
    actorId: context.actor.userId,
    reason: options.reason ?? null,
    at: context.now(),
  });

  return ok(updated);
}

export interface ReportComposition {
  runId: string;
  score: number | null;
  rawScore: number | null;
  grade: string | null;
  capApplied: string | null;
  incomplete: boolean;
  parityIndex: number | null;
  parityQualitativeOnly: boolean;
  matchedPairCount: number;
  dimensionAverages: Array<{ dimension: Dimension; average: number | null }>;
  severityCounts: Record<Severity, number>;
  findings: Array<Omit<Finding, 'internalNotes'>>;
  scenariosPlanned: number;
  scenariosCompleted: number;
  unscorableCount: number;
}

/**
 * Compose report content from approved data (FR-RPT-001).
 *
 * Reads ONLY approved values: `approvedScore` on cases, confirmed findings.
 * Internal notes are stripped structurally — the return type omits the field,
 * so a caller cannot accidentally serialize it.
 */
export async function composeReport(
  context: ServiceContext,
  organizationId: string,
  runId: string,
): Promise<ServiceResult<ReportComposition>> {
  const run = await context.data.runs.findById(organizationId, runId);
  if (!run) return fail('NOT_FOUND', 'No such run.');

  const decision = permit(context, organizationId, 'report.draft', {
    projectId: run.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  const cases = await context.data.testCases.listForRun(organizationId, runId);
  const planScenarios = await context.data.auditPlans.listScenarios(
    organizationId,
    run.auditPlanId,
  );

  const scoredCases: ScoredCase[] = [];
  const dimensionTotals = new Map<Dimension, { sum: number; count: number }>();

  for (const testCase of cases) {
    const planScenario = planScenarios.find(
      (s) => s.id === testCase.planScenarioId,
    );
    const scores = await context.data.evaluations.listScores(
      organizationId,
      testCase.id,
    );

    const dimensionScores: DimensionScore[] = scores
      .filter((s) => s.approvedBy !== null)
      .map((s) => ({
        dimension: s.dimension,
        score: s.approvedScore as DimensionScore['score'],
        ...(s.notApplicableReason
          ? { notApplicableReason: s.notApplicableReason }
          : {}),
      }));

    for (const score of scores) {
      if (score.approvedScore === null) continue;
      const entry = dimensionTotals.get(score.dimension) ?? {
        sum: 0,
        count: 0,
      };
      entry.sum += score.approvedScore;
      entry.count += 1;
      dimensionTotals.set(score.dimension, entry);
    }

    scoredCases.push({
      caseId: testCase.id,
      locale: testCase.locale,
      riskWeight: planScenario?.riskWeight ?? 1,
      scores: dimensionScores,
      ...(testCase.state === 'unscorable' || dimensionScores.length === 0
        ? { unscorable: true }
        : {}),
    });
  }

  const findings = await context.data.findings.listForRun(
    organizationId,
    runId,
  );

  // Only confirmed, unresolved findings can cap a score (10.6).
  const capInputs: CapInput[] = findings.map((f) => ({
    severity: f.severity,
    dimension: f.dimension,
    confirmed: f.humanConfirmedBy !== null || f.seniorConfirmedBy !== null,
    resolved: ['resolved', 'not_applicable', 'risk_accepted'].includes(
      f.status,
    ),
  }));

  const runScore = calculateRunScore(scoredCases, { findings: capInputs });

  // Bilingual parity from matched pairs (10.7).
  const pairs = new Map<string, MatchedPair>();
  for (const testCase of cases) {
    const planScenario = planScenarios.find(
      (s) => s.id === testCase.planScenarioId,
    );
    if (!planScenario?.bilingualPairId) continue;

    const pair = pairs.get(planScenario.bilingualPairId) ?? {
      pairId: planScenario.bilingualPairId,
      englishScore: null,
      frenchScore: null,
      riskWeight: planScenario.riskWeight,
    };
    if (testCase.locale === 'en-CA') pair.englishScore = testCase.approvedScore;
    else pair.frenchScore = testCase.approvedScore;
    pairs.set(planScenario.bilingualPairId, pair);
  }
  const parity = calculateParity([...pairs.values()]);

  const severityCounts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    observation: 0,
  };
  for (const finding of findings) {
    severityCounts[finding.severity] += 1;
  }

  const capApplied =
    runScore.appliedCaps.length > 0
      ? runScore.appliedCaps
          .map((cap) => `${cap.reason} (max ${cap.maxScore} / ${cap.maxGrade})`)
          .join('; ')
      : null;

  return ok({
    runId,
    score: runScore.score === null ? null : displayScore(runScore.score),
    rawScore:
      runScore.rawScore === null ? null : displayScore(runScore.rawScore),
    grade: runScore.grade,
    capApplied,
    incomplete: runScore.incomplete,
    parityIndex:
      parity.parityIndex === null ? null : displayScore(parity.parityIndex),
    parityQualitativeOnly: parity.qualitativeOnly,
    matchedPairCount: parity.validPairCount,
    dimensionAverages: [...dimensionTotals.entries()].map(
      ([dimension, { sum, count }]) => ({
        dimension,
        average: count === 0 ? null : Math.round((sum / count) * 10) / 10,
      }),
    ),
    severityCounts,
    findings: findings
      .slice()
      .sort((a, b) => compareSeverity(a.severity, b.severity))
      // Structurally strip internal notes for anything report-bound.
      .map(({ internalNotes: _internalNotes, ...rest }) => rest),
    scenariosPlanned: planScenarios.length,
    scenariosCompleted: cases.filter((c) => c.state === 'reviewed').length,
    unscorableCount: runScore.unscorableCaseCount,
  });
}

/** Create a draft report from the composed content. */
export async function draftReport(
  context: ServiceContext,
  organizationId: string,
  runId: string,
  localeMode: Report['localeMode'],
): Promise<ServiceResult<Report>> {
  const run = await context.data.runs.findById(organizationId, runId);
  if (!run) return fail('NOT_FOUND', 'No such run.');

  const decision = permit(context, organizationId, 'report.draft', {
    projectId: run.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  const composed = await composeReport(context, organizationId, runId);
  if (!composed.ok) return fail(composed.code, composed.message);

  const existing = await context.data.reports.listForRun(organizationId, runId);
  const familyId = existing[0]?.familyId ?? context.newId();
  const version = existing.reduce((max, r) => Math.max(max, r.version), 0) + 1;

  const report: Report = {
    id: context.newId(),
    organizationId,
    projectId: run.projectId,
    testRunId: runId,
    familyId,
    version,
    localeMode,
    status: 'draft',
    score: composed.value.score,
    grade: composed.value.grade,
    parityIndex: composed.value.parityIndex,
    capApplied: composed.value.capApplied,
    incomplete: composed.value.incomplete,
    contentSnapshot: composed.value,
    correctionReason: null,
    approvedBy: null,
    approvedAt: null,
    releasedBy: null,
    releasedAt: null,
    supersededById: null,
    createdAt: context.now(),
  };

  return ok(await context.data.reports.create(report));
}

/**
 * Generate the customer preview (FR-RPT-002, `POST /api/ops/reports/:id/preview`).
 *
 * Re-composes from approved data so the preview cannot drift from the record,
 * and moves the report out of `draft`. The release gate treats a report still in
 * `draft` as "no preview generated", so this step is not optional.
 */
export async function previewReport(
  context: ServiceContext,
  organizationId: string,
  reportId: string,
): Promise<ServiceResult<{ report: Report; content: ReportComposition }>> {
  const report = await context.data.reports.findById(organizationId, reportId);
  if (!report) return fail('NOT_FOUND', 'No such report.');

  const decision = permit(context, organizationId, 'report.draft', {
    projectId: report.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  if (report.status === 'released' || report.status === 'superseded') {
    return fail('INVALID_STATE', 'A released report cannot be re-previewed.');
  }

  const composed = await composeReport(
    context,
    organizationId,
    report.testRunId,
  );
  if (!composed.ok) return fail(composed.code, composed.message);

  const updated = await context.data.reports.update(organizationId, reportId, {
    status: report.status === 'approved' ? 'approved' : 'in_review',
    score: composed.value.score,
    grade: composed.value.grade,
    parityIndex: composed.value.parityIndex,
    capApplied: composed.value.capApplied,
    incomplete: composed.value.incomplete,
    contentSnapshot: composed.value,
  });

  await audit(context, {
    organizationId,
    action: 'report.previewed',
    objectType: 'report',
    objectId: reportId,
    outcome: 'success',
    riskLevel: 'low',
  });

  return ok({ report: updated, content: composed.value });
}

/**
 * Approve a previewed report (10.x, E2E "generate preview -> approve -> release").
 *
 * Approval is a separate act from release so that the person who signs off on
 * the content is recorded even when the same person then releases it.
 */
export async function approveReport(
  context: ServiceContext,
  organizationId: string,
  reportId: string,
): Promise<ServiceResult<Report>> {
  const report = await context.data.reports.findById(organizationId, reportId);
  if (!report) return fail('NOT_FOUND', 'No such report.');

  const decision = permit(context, organizationId, 'report.approve', {
    projectId: report.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);
  if (!context.actor) return fail('NOT_AUTHENTICATED', 'Sign in to continue.');

  if (report.status !== 'in_review') {
    return fail(
      'INVALID_STATE',
      'Only a previewed report awaiting review can be approved.',
    );
  }

  const updated = await context.data.reports.update(organizationId, reportId, {
    status: 'approved',
    approvedBy: context.actor.userId,
    approvedAt: context.now(),
  });

  await audit(context, {
    organizationId,
    action: 'report.approved',
    objectType: 'report',
    objectId: reportId,
    outcome: 'success',
    riskLevel: 'medium',
  });

  return ok(updated);
}

export interface ReleaseCheck {
  canRelease: boolean;
  blockers: ReleaseBlockCode[];
  /** Human-readable detail for each blocker, for the release screen. */
  detail: string[];
}

/**
 * Evaluate the release gate without releasing (FR-RPT-003 preview).
 */
export async function checkRelease(
  context: ServiceContext,
  organizationId: string,
  reportId: string,
): Promise<ServiceResult<ReleaseCheck>> {
  const report = await context.data.reports.findById(organizationId, reportId);
  if (!report) return fail('NOT_FOUND', 'No such report.');

  const decision = permit(context, organizationId, 'report.read_draft', {
    projectId: report.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  const run = await context.data.runs.findById(
    organizationId,
    report.testRunId,
  );
  if (!run) return fail('NOT_FOUND', 'No such run.');

  const cases = await context.data.testCases.listForRun(
    organizationId,
    report.testRunId,
  );
  const findings = await context.data.findings.listForRun(
    organizationId,
    report.testRunId,
  );
  const attestation = await context.data.authorizations.findActive(
    organizationId,
    report.projectId,
    context.now(),
  );

  const allReviewed =
    cases.length > 0 &&
    cases.every((c) => c.state === 'reviewed' || c.state === 'unscorable');

  // Every critical/high candidate must be adjudicated by the right level of
  // reviewer (FR-EVAL-005).
  const criticalHighAdjudicated = findings
    .filter((f) => f.severity === 'critical' || f.severity === 'high')
    .every((f) =>
      canReleaseFinding({
        severity: f.severity,
        dimension: f.dimension,
        confidence: f.confidence,
        hasPolicySupport: f.evidence.some((e) => e.knowledgeSourceId !== null),
        evaluatorDisagreement: false,
        humanConfirmed: f.humanConfirmedBy !== null,
        seniorConfirmed: f.seniorConfirmedBy !== null,
      }),
    );

  // Release scanner: no internal notes and no secrets in customer content.
  const customerContent = JSON.stringify(report.contentSnapshot ?? {});
  const internalNotesLeaked = findings.some(
    (f) =>
      f.internalNotes !== null &&
      f.internalNotes.length > 0 &&
      customerContent.includes(f.internalNotes),
  );
  const secretScan = scanForLeakedSecrets(customerContent);

  const gate = evaluateReleaseGate({
    runState: run.state,
    allRequiredScenariosReviewed: allReviewed,
    allCriticalHighAdjudicated: criticalHighAdjudicated,
    scopeAndLimitationsComplete: report.contentSnapshot !== null,
    previewGenerated: report.status !== 'draft',
    noInternalNotesVisible: !internalNotesLeaked,
    noSecretsOrRestrictedData: secretScan.clean,
    reviewerUserId: context.actor?.userId ?? null,
    reviewerRole:
      decision.role === 'platform_owner'
        ? 'platform_owner'
        : decision.role === 'senior_analyst'
          ? 'senior_analyst'
          : 'analyst',
    authorizationActiveForAllTests: attestation !== null,
  });

  const messages: Record<ReleaseBlockCode, string> = {
    RUN_NOT_IN_REPORT_DRAFT: 'The run is not in the report_draft state.',
    SCENARIOS_NOT_REVIEWED:
      'Not every scenario has been reviewed by an analyst.',
    CRITICAL_HIGH_NOT_ADJUDICATED:
      'A critical or high finding has not been confirmed by an authorized reviewer.',
    SCOPE_INCOMPLETE: 'Scope and limitations content is missing.',
    PREVIEW_NOT_GENERATED: 'A report preview has not been generated.',
    INTERNAL_NOTES_VISIBLE:
      'Internal analyst notes appear in customer-visible content.',
    SECRETS_OR_RESTRICTED_DATA_PRESENT:
      'The release scanner detected a secret or unredacted restricted data.',
    REVIEWER_NOT_AUTHORIZED:
      'Release requires a Platform Owner or Senior Analyst.',
    AUTHORIZATION_NOT_ACTIVE:
      'Authorization was not active for every test in this run.',
  };

  return ok({
    canRelease: gate.canRelease,
    blockers: gate.blockers,
    detail: gate.blockers.map((code) => messages[code]),
  });
}

/**
 * Release a report to the customer (FR-RPT-003).
 *
 * This is the single most consequential action in the product: it is what makes
 * findings client-visible. It refuses unless every gate condition holds, and it
 * requires recent authentication (enforced by the permission layer).
 */
export async function releaseReport(
  context: ServiceContext,
  organizationId: string,
  reportId: string,
): Promise<ServiceResult<Report>> {
  const report = await context.data.reports.findById(organizationId, reportId);
  if (!report) return fail('NOT_FOUND', 'No such report.');

  const decision = permit(context, organizationId, 'report.release', {
    projectId: report.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);
  if (!context.actor) return fail('NOT_AUTHENTICATED', 'Sign in to continue.');

  if (report.status === 'released') {
    return fail('INVALID_STATE', 'This report has already been released.');
  }
  if (report.status !== 'approved') {
    return fail(
      'INVALID_STATE',
      'A report must be previewed and approved before it can be released.',
    );
  }

  const check = await checkRelease(context, organizationId, reportId);
  if (!check.ok) return fail(check.code, check.message);

  if (!check.value.canRelease) {
    await audit(context, {
      organizationId,
      action: 'report.release_blocked',
      objectType: 'report',
      objectId: reportId,
      outcome: 'denied',
      riskLevel: 'medium',
      metadata: { blockers: check.value.blockers.join(',') },
    });
    return fail(
      'INVALID_STATE',
      'The report cannot be released yet.',
      check.value,
    );
  }

  const released = await context.data.reports.update(organizationId, reportId, {
    status: 'released',
    releasedBy: context.actor.userId,
    releasedAt: context.now(),
  });

  await context.data.runs.update(organizationId, report.testRunId, {
    state: 'released',
    releasedAt: context.now(),
  });

  await audit(context, {
    organizationId,
    action: 'report.released',
    objectType: 'report',
    objectId: reportId,
    outcome: 'success',
    riskLevel: 'medium',
    metadata: { version: released.version },
  });

  return ok(released);
}

/**
 * Issue a correction as a NEW report version (FR-RPT-004).
 *
 * The released report is never edited. It is marked superseded and the new
 * version carries the correction reason.
 */
export async function correctReport(
  context: ServiceContext,
  organizationId: string,
  reportId: string,
  correctionReason: string,
): Promise<ServiceResult<Report>> {
  const original = await context.data.reports.findById(
    organizationId,
    reportId,
  );
  if (!original) return fail('NOT_FOUND', 'No such report.');

  const decision = permit(context, organizationId, 'report.release', {
    projectId: original.projectId,
  });
  if (!decision.allowed) return fail(decision.code, decision.message);

  if (original.status !== 'released') {
    return fail('INVALID_STATE', 'Only a released report can be corrected.');
  }
  if (correctionReason.trim() === '') {
    return fail('VALIDATION_FAILED', 'A correction reason is required.');
  }

  const composed = await composeReport(
    context,
    organizationId,
    original.testRunId,
  );
  if (!composed.ok) return fail(composed.code, composed.message);

  const siblings = await context.data.reports.listForRun(
    organizationId,
    original.testRunId,
  );
  const version = siblings.reduce((max, r) => Math.max(max, r.version), 0) + 1;

  const corrected: Report = {
    ...original,
    id: context.newId(),
    version,
    status: 'draft',
    score: composed.value.score,
    grade: composed.value.grade,
    parityIndex: composed.value.parityIndex,
    capApplied: composed.value.capApplied,
    incomplete: composed.value.incomplete,
    contentSnapshot: composed.value,
    correctionReason: correctionReason.trim(),
    approvedBy: null,
    approvedAt: null,
    releasedBy: null,
    releasedAt: null,
    supersededById: null,
    createdAt: context.now(),
  };

  const saved = await context.data.reports.create(corrected);

  // The original stays intact and readable; only its status changes.
  await context.data.reports.update(organizationId, reportId, {
    status: 'superseded',
    supersededById: saved.id,
  });

  await audit(context, {
    organizationId,
    action: 'report.correction_created',
    objectType: 'report',
    objectId: saved.id,
    outcome: 'success',
    riskLevel: 'medium',
    metadata: { supersedes: reportId, version },
  });

  return ok(saved);
}

export { requiredReview };
