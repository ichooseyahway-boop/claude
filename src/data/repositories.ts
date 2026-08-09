import type {
  AiSystem,
  AuditEvent,
  AuditPlan,
  AuthorizationAttestation,
  Comment,
  ConversationTurn,
  DimensionScoreRecord,
  Evaluation,
  Finding,
  KnowledgeSource,
  Membership,
  Notification,
  Organization,
  PlanScenario,
  Profile,
  Project,
  Report,
  ScenarioTemplate,
  TestCase,
  TestRun,
} from './types';

/**
 * Repository interfaces.
 *
 * PRD ref: 18.5 ("Domain logic separated from UI and provider SDKs").
 *
 * Every method that reads tenant-owned data takes an `organizationId`
 * explicitly. This is deliberate: PRD 16.2 requires that "service-role code
 * paths validate explicit organization scope", and a signature that cannot be
 * called without naming the tenant makes an accidental cross-tenant query a
 * compile error rather than a security incident.
 *
 * Row-level security remains the backstop. This is defence in depth, not a
 * replacement for it.
 */

export interface ProfileRepository {
  findById(userId: string): Promise<Profile | null>;
  findByEmail(email: string): Promise<Profile | null>;
  upsert(profile: Profile): Promise<Profile>;
}

export interface OrganizationRepository {
  findById(organizationId: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  create(organization: Organization): Promise<Organization>;
  update(
    organizationId: string,
    patch: Partial<Organization>,
  ): Promise<Organization>;
}

export interface MembershipRepository {
  /** Active (accepted, non-revoked) memberships for a user. */
  listActiveForUser(userId: string): Promise<Membership[]>;
  findActive(
    organizationId: string,
    userId: string,
  ): Promise<Membership | null>;
  listForOrganization(organizationId: string): Promise<Membership[]>;
  create(membership: Membership): Promise<Membership>;
  revoke(membershipId: string, at: Date): Promise<void>;
}

export interface ProjectRepository {
  findById(organizationId: string, projectId: string): Promise<Project | null>;
  /** Internal-only lookup used by the operations queue, across tenants. */
  findByIdInternal(projectId: string): Promise<Project | null>;
  listForOrganization(organizationId: string): Promise<Project[]>;
  listByStatus(statuses: Project['status'][]): Promise<Project[]>;
  create(project: Project): Promise<Project>;
  update(
    organizationId: string,
    projectId: string,
    patch: Partial<Project>,
  ): Promise<Project>;
}

export interface AiSystemRepository {
  findByProject(
    organizationId: string,
    projectId: string,
  ): Promise<AiSystem | null>;
  upsert(system: AiSystem): Promise<AiSystem>;
}

export interface AuthorizationRepository {
  /** The current, non-revoked, non-expired attestation for a project. */
  findActive(
    organizationId: string,
    projectId: string,
    now: Date,
  ): Promise<AuthorizationAttestation | null>;
  listForProject(
    organizationId: string,
    projectId: string,
  ): Promise<AuthorizationAttestation[]>;
  create(
    attestation: AuthorizationAttestation,
  ): Promise<AuthorizationAttestation>;
  revoke(id: string, at: Date, reason: string): Promise<void>;
}

export interface KnowledgeSourceRepository {
  listForProject(
    organizationId: string,
    projectId: string,
  ): Promise<KnowledgeSource[]>;
  create(source: KnowledgeSource): Promise<KnowledgeSource>;
}

export interface ScenarioRepository {
  listPublished(filter?: {
    locale?: string;
    category?: string;
  }): Promise<ScenarioTemplate[]>;
  findById(id: string): Promise<ScenarioTemplate | null>;
  /** Highest published version of a family in a locale. */
  findLatest(
    familyId: string,
    locale: string,
  ): Promise<ScenarioTemplate | null>;
  create(template: ScenarioTemplate): Promise<ScenarioTemplate>;
}

export interface AuditPlanRepository {
  findById(organizationId: string, planId: string): Promise<AuditPlan | null>;
  listForProject(
    organizationId: string,
    projectId: string,
  ): Promise<AuditPlan[]>;
  create(plan: AuditPlan): Promise<AuditPlan>;
  update(
    organizationId: string,
    planId: string,
    patch: Partial<AuditPlan>,
  ): Promise<AuditPlan>;
  listScenarios(
    organizationId: string,
    planId: string,
  ): Promise<PlanScenario[]>;
  addScenario(scenario: PlanScenario): Promise<PlanScenario>;
  removeScenario(organizationId: string, scenarioId: string): Promise<void>;
}

export interface RunRepository {
  findById(organizationId: string, runId: string): Promise<TestRun | null>;
  listForProject(organizationId: string, projectId: string): Promise<TestRun[]>;
  create(run: TestRun): Promise<TestRun>;
  update(
    organizationId: string,
    runId: string,
    patch: Partial<TestRun>,
  ): Promise<TestRun>;
}

export interface TestCaseRepository {
  findById(organizationId: string, caseId: string): Promise<TestCase | null>;
  listForRun(organizationId: string, runId: string): Promise<TestCase[]>;
  create(testCase: TestCase): Promise<TestCase>;
  update(
    organizationId: string,
    caseId: string,
    patch: Partial<TestCase>,
  ): Promise<TestCase>;

  listTurns(
    organizationId: string,
    caseId: string,
  ): Promise<ConversationTurn[]>;
  /**
   * Append a captured turn.
   *
   * Implementations MUST reject a write to an existing (caseId, sequence):
   * captured content is immutable (FR-RUN-005).
   */
  appendTurn(turn: ConversationTurn): Promise<ConversationTurn>;
}

export interface EvaluationRepository {
  findByTestCase(
    organizationId: string,
    caseId: string,
  ): Promise<Evaluation | null>;
  create(evaluation: Evaluation): Promise<Evaluation>;
  update(
    organizationId: string,
    evaluationId: string,
    patch: Partial<Evaluation>,
  ): Promise<Evaluation>;

  listScores(
    organizationId: string,
    caseId: string,
  ): Promise<DimensionScoreRecord[]>;
  upsertScore(score: DimensionScoreRecord): Promise<DimensionScoreRecord>;
}

export interface FindingRepository {
  findById(organizationId: string, findingId: string): Promise<Finding | null>;
  listForRun(organizationId: string, runId: string): Promise<Finding[]>;
  listForProject(organizationId: string, projectId: string): Promise<Finding[]>;
  create(finding: Finding): Promise<Finding>;
  update(
    organizationId: string,
    findingId: string,
    patch: Partial<Finding>,
  ): Promise<Finding>;
  recordStatusChange(entry: {
    organizationId: string;
    findingId: string;
    oldStatus: Finding['status'] | null;
    newStatus: Finding['status'];
    actorId: string;
    reason: string | null;
    at: Date;
  }): Promise<void>;
}

export interface ReportRepository {
  findById(organizationId: string, reportId: string): Promise<Report | null>;
  listForProject(organizationId: string, projectId: string): Promise<Report[]>;
  listForRun(organizationId: string, runId: string): Promise<Report[]>;
  create(report: Report): Promise<Report>;
  update(
    organizationId: string,
    reportId: string,
    patch: Partial<Report>,
  ): Promise<Report>;
  recordAccess(entry: {
    organizationId: string;
    reportId: string;
    userId: string | null;
    action: 'viewed' | 'downloaded' | 'exported';
    at: Date;
  }): Promise<void>;
}

export interface CommentRepository {
  listForObject(
    organizationId: string,
    objectType: Comment['objectType'],
    objectId: string,
    /** Client callers pass 'customer' so internal notes are never fetched. */
    visibility: Comment['visibility'] | 'all',
  ): Promise<Comment[]>;
  create(comment: Comment): Promise<Comment>;
}

export interface NotificationRepository {
  listForUser(userId: string, unreadOnly: boolean): Promise<Notification[]>;
  create(notification: Notification): Promise<Notification>;
  markRead(userId: string, notificationId: string, at: Date): Promise<void>;
}

export interface AuditEventRepository {
  /** Append-only. There is deliberately no update or delete. */
  record(event: AuditEvent): Promise<void>;
  list(filter: {
    organizationId?: string;
    action?: string;
    from?: Date;
    to?: Date;
    limit: number;
  }): Promise<Array<AuditEvent & { createdAt: Date }>>;
}

export interface UsageRepository {
  /** Consumed units for the current cycle. */
  getConsumed(
    organizationId: string,
    metric: string,
    periodStart: Date,
  ): Promise<number>;
  increment(
    organizationId: string,
    metric: string,
    periodStart: Date,
    periodEnd: Date,
    quantity: number,
  ): Promise<void>;
}

/** Everything a service might need, assembled once per request. */
export interface DataStore {
  profiles: ProfileRepository;
  organizations: OrganizationRepository;
  memberships: MembershipRepository;
  projects: ProjectRepository;
  aiSystems: AiSystemRepository;
  authorizations: AuthorizationRepository;
  knowledgeSources: KnowledgeSourceRepository;
  scenarios: ScenarioRepository;
  auditPlans: AuditPlanRepository;
  runs: RunRepository;
  testCases: TestCaseRepository;
  evaluations: EvaluationRepository;
  findings: FindingRepository;
  reports: ReportRepository;
  comments: CommentRepository;
  notifications: NotificationRepository;
  auditEvents: AuditEventRepository;
  usage: UsageRepository;
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'IMMUTABLE'
      | 'CROSS_TENANT'
      | 'NOT_CONFIGURED',
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}
