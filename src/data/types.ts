import type { Dimension } from '@/domain/scoring/dimensions';
import type { Confidence, FindingStatus, Severity } from '@/domain/findings/findings';
import type { RunState } from '@/domain/runs/state-machine';
import type { Entitlement } from '@/domain/entitlements/entitlements';
import type { Locale } from '@/lib/i18n';

/**
 * Domain entity types.
 *
 * These mirror the section 12 data model but are expressed in application
 * terms, not database rows: repositories translate between the two. That is
 * what lets the services be tested against an in-memory store and run against
 * PostgreSQL unchanged.
 *
 * Dates are `Date` here and `timestamptz` in the database. Money is minor units
 * (cents) everywhere, never a float.
 */

export type MembershipRole =
  | 'platform_owner'
  | 'analyst'
  | 'senior_analyst'
  | 'client_owner'
  | 'client_contributor'
  | 'client_viewer'
  | 'billing_admin';

export const INTERNAL_ROLES: readonly MembershipRole[] = [
  'platform_owner',
  'analyst',
  'senior_analyst',
];

export const CLIENT_ROLES: readonly MembershipRole[] = [
  'client_owner',
  'client_contributor',
  'client_viewer',
  'billing_admin',
];

export function isInternalRole(role: MembershipRole): boolean {
  return INTERNAL_ROLES.includes(role);
}

export interface Profile {
  id: string;
  displayName: string;
  email: string;
  locale: Locale;
  timezone: string;
  mfaEnrolledAt: Date | null;
  status: 'active' | 'suspended' | 'deleted';
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  billingEmail: string | null;
  privacyContactEmail: string | null;
  defaultLocale: Locale;
  status: 'active' | 'suspended' | 'closed';
  createdAt: Date;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: MembershipRole;
  /** Null means every project in the organization (7.2). */
  projectScope: string[] | null;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}

export type ProjectStatus =
  | 'onboarding'
  | 'scope_review'
  | 'scope_declined'
  | 'planning'
  | 'executing'
  | 'analyst_review'
  | 'release_review'
  | 'released'
  | 'blocked'
  | 'closed';

export interface Project {
  id: string;
  organizationId: string;
  orderId: string | null;
  subscriptionId: string | null;
  name: string;
  packageCode: string;
  entitlement: Entitlement;
  locales: Locale[];
  status: ProjectStatus;
  dueDate: Date | null;
  assignedAnalystId: string | null;
  scopeSummary: string | null;
  blockedReason: string | null;
  onboardingCompletedAt: Date | null;
  onboardingAcceptedAt: Date | null;
  createdAt: Date;
}

export interface AiSystem {
  id: string;
  organizationId: string;
  projectId: string;
  displayName: string;
  systemOwnerName: string | null;
  environment: 'production' | 'staging' | 'sandbox';
  channel: 'web_chat' | 'help_centre' | 'email' | 'messaging' | 'api';
  vendorModel: string | null;
  supportedLocales: Locale[];
  disclosureText: string | null;
  escalationRules: string | null;
  serviceHours: string | null;
  knownLimitations: string | null;
  dataCategories: string[];
  authorizedHosts: string[];
  rateLimitPerMinute: number | null;
}

export interface AuthorizationAttestation {
  id: string;
  organizationId: string;
  projectId: string;
  signerUserId: string;
  documentVersion: string;
  scope: {
    systemId: string;
    authorizedHosts: string[];
    locales: Locale[];
    restrictedTopics: string[];
    prohibitedData: string[];
  };
  acceptedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
}

export interface KnowledgeSource {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  sourceType: 'pdf' | 'docx' | 'txt' | 'csv' | 'url';
  storageKey: string | null;
  sourceUrl: string | null;
  effectiveDate: Date | null;
  authorityRank: number;
  version: string | null;
  checksum: string | null;
  scanStatus: 'pending' | 'clean' | 'infected' | 'failed';
  uploadedBy: string | null;
  createdAt: Date;
}

export interface ScenarioTemplate {
  id: string;
  familyId: string;
  version: number;
  locale: Locale;
  title: string;
  objective: string;
  category: string;
  riskWeight: 1 | 1.5 | 2;
  body: {
    turns: Array<{ role: 'tester'; content: string }>;
  };
  evaluationRules: {
    mustInclude?: string[];
    mustNotInclude?: string[];
    requiredDisclosures?: string[];
    forbiddenPhrases?: string[];
    escalationRequired?: boolean;
    requiresPolicySource?: boolean;
  };
  tags: string[];
  status: 'draft' | 'published' | 'retired';
  bilingualPairKey: string | null;
}

export interface AuditPlan {
  id: string;
  organizationId: string;
  projectId: string;
  version: number;
  status: 'draft' | 'approved' | 'superseded';
  scenarioLimit: number;
  changeReason: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
}

export interface PlanScenario {
  id: string;
  organizationId: string;
  auditPlanId: string;
  scenarioTemplateId: string | null;
  customScenario: ScenarioTemplate['body'] | null;
  locale: Locale;
  sequence: number;
  riskWeight: 1 | 1.5 | 2;
  /** Shared by the English and French halves of a matched pair (10.7). */
  bilingualPairId: string | null;
  customerFacts: Record<string, string>;
  expectedOutcomes: string[];
}

export interface TestRun {
  id: string;
  organizationId: string;
  projectId: string;
  auditPlanId: string;
  runType: 'initial' | 'retest' | 'monitoring';
  state: RunState;
  baselineRunId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  releasedAt: Date | null;
  rubricVersion: string | null;
  evaluatorVersion: string | null;
  aiCostMinor: number;
  analystMinutes: number;
  createdAt: Date;
}

export type CaptureMode =
  | 'manual'
  | 'customer_upload'
  | 'api_adapter'
  | 'browser_runner';

export interface TestCase {
  id: string;
  organizationId: string;
  testRunId: string;
  planScenarioId: string;
  locale: Locale;
  state: 'pending' | 'captured' | 'evaluated' | 'reviewed' | 'unscorable';
  captureMode: CaptureMode;
  startedAt: Date | null;
  completedAt: Date | null;
  latencyMs: number | null;
  executionError: string | null;
  approvedScore: number | null;
  approvedConfidence: Confidence | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
}

export interface ConversationTurn {
  id: string;
  organizationId: string;
  testCaseId: string;
  sequence: number;
  role: 'tester' | 'system';
  /** Immutable once written (FR-RUN-005). */
  originalContent: string;
  checksum: string;
  characterCount: number;
  capturedAt: Date;
}

export interface DimensionScoreRecord {
  id: string;
  organizationId: string;
  testCaseId: string;
  evaluationId: string | null;
  dimension: Dimension;
  weight: number;
  proposedScore: number | null;
  approvedScore: number | null;
  notApplicableReason: string | null;
  rationale: string | null;
  confidence: Confidence | null;
  approvedBy: string | null;
  approvedAt: Date | null;
}

export interface Evaluation {
  id: string;
  organizationId: string;
  testCaseId: string;
  evaluationVersionId: string;
  /** Never client-visible (FR-EVAL-001). */
  proposedOutput: unknown;
  validationStatus: 'pending' | 'valid' | 'invalid' | 'manual_review';
  retryCount: number;
  costMinor: number;
  latencyMs: number | null;
  humanReviewStatus: 'required' | 'in_review' | 'approved' | 'overridden';
  overrideReason: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export interface Finding {
  id: string;
  organizationId: string;
  projectId: string;
  testRunId: string;
  reference: string;
  severity: Severity;
  dimension: Dimension;
  locale: Locale | null;
  status: FindingStatus;
  title: string;
  summary: string;
  expectedBehaviour: string;
  observedBehaviour: string;
  customerImpact: string;
  rootCauseHypothesis: string | null;
  recommendedRemediation: string;
  verificationMethod: string | null;
  confidence: Confidence;
  /** Never rendered in a customer-facing view (FR-FND-001, FR-PORT-002). */
  internalNotes: string | null;
  customerVisibleNotes: string | null;
  ownerUserId: string | null;
  dueDate: Date | null;
  humanConfirmedBy: string | null;
  seniorConfirmedBy: string | null;
  evidence: FindingEvidenceRef[];
  createdAt: Date;
}

export interface FindingEvidenceRef {
  testCaseId: string | null;
  knowledgeSourceId: string | null;
  spans: Array<{ turn: number; start: number; end: number }>;
}

/**
 * A finding as a client is permitted to see it.
 *
 * `internalNotes` is structurally absent, not merely undefined — a client-facing
 * mapper that forgets to strip it will not compile.
 */
export type ClientFinding = Omit<Finding, 'internalNotes'>;

export interface Report {
  id: string;
  organizationId: string;
  projectId: string;
  testRunId: string;
  familyId: string;
  version: number;
  localeMode: 'en' | 'fr' | 'bilingual';
  status: 'draft' | 'in_review' | 'approved' | 'released' | 'superseded';
  score: number | null;
  grade: string | null;
  parityIndex: number | null;
  capApplied: string | null;
  incomplete: boolean;
  contentSnapshot: unknown;
  correctionReason: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  releasedBy: string | null;
  releasedAt: Date | null;
  supersededById: string | null;
  createdAt: Date;
}

export interface Comment {
  id: string;
  organizationId: string;
  objectType: 'finding' | 'project' | 'report' | 'test_case';
  objectId: string;
  authorId: string;
  visibility: 'internal' | 'customer';
  content: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  organizationId: string | null;
  userId: string;
  category: string;
  contentKey: string;
  contentParams: Record<string, string>;
  targetPath: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface AuditEvent {
  actorType: 'user' | 'system' | 'provider';
  actorId: string | null;
  organizationId: string | null;
  action: string;
  objectType: string | null;
  objectId: string | null;
  outcome: 'success' | 'denied' | 'error';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  correlationId: string | null;
  metadata: Record<string, string | number>;
}
