import { RepositoryError, type DataStore } from '../repositories';
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
} from '../types';

/**
 * In-memory DataStore.
 *
 * Purpose: run the full service layer in tests and in local development
 * without a database. It enforces the same invariants the database does —
 * cross-tenant reads return nothing, captured turns are immutable, audit events
 * are append-only — so a test passing here means the service logic is right,
 * not that the store was permissive.
 *
 * It is NOT a production store: there is no durability, no concurrency control
 * and no RLS. `createDataStore()` selects it only when no database is
 * configured.
 */

interface TenantOwned {
  id: string;
  organizationId: string;
}

/** Collection with tenant-scoped access baked in. */
class Collection<T extends TenantOwned> {
  protected readonly items = new Map<string, T>();

  all(): T[] {
    return [...this.items.values()];
  }

  /**
   * Get by ID *within* an organization. A matching ID in another tenant
   * returns null rather than throwing, mirroring how RLS makes the row simply
   * not exist for that caller.
   */
  get(organizationId: string, id: string): T | null {
    const found = this.items.get(id);
    if (!found || found.organizationId !== organizationId) return null;
    return structuredClone(found);
  }

  where(organizationId: string, predicate: (item: T) => boolean): T[] {
    return this.all()
      .filter((item) => item.organizationId === organizationId)
      .filter(predicate)
      .map((item) => structuredClone(item));
  }

  insert(item: T): T {
    if (this.items.has(item.id)) {
      throw new RepositoryError(`Duplicate id ${item.id}`, 'CONFLICT');
    }
    this.items.set(item.id, structuredClone(item));
    return structuredClone(item);
  }

  patch(organizationId: string, id: string, patch: Partial<T>): T {
    const existing = this.items.get(id);
    if (!existing || existing.organizationId !== organizationId) {
      throw new RepositoryError(`No such record ${id}`, 'NOT_FOUND');
    }
    // organizationId is never patchable: moving a row between tenants is not a
    // supported operation.
    const { organizationId: _ignored, ...safePatch } = patch as Partial<T> & {
      organizationId?: string;
    };
    const next = { ...existing, ...safePatch } as T;
    this.items.set(id, next);
    return structuredClone(next);
  }

  clear(): void {
    this.items.clear();
  }
}

export interface MemoryState {
  profiles: Map<string, Profile>;
  organizations: Map<string, Organization>;
  memberships: Membership[];
  projects: Collection<Project>;
  aiSystems: Collection<AiSystem>;
  authorizations: Collection<AuthorizationAttestation>;
  knowledgeSources: Collection<KnowledgeSource>;
  scenarios: Map<string, ScenarioTemplate>;
  auditPlans: Collection<AuditPlan>;
  planScenarios: Collection<PlanScenario>;
  runs: Collection<TestRun>;
  testCases: Collection<TestCase>;
  turns: ConversationTurn[];
  evaluations: Collection<Evaluation>;
  dimensionScores: Collection<DimensionScoreRecord>;
  findings: Collection<Finding>;
  findingHistory: Array<{
    organizationId: string;
    findingId: string;
    oldStatus: Finding['status'] | null;
    newStatus: Finding['status'];
    actorId: string;
    reason: string | null;
    at: Date;
  }>;
  reports: Collection<Report>;
  reportAccess: Array<{
    organizationId: string;
    reportId: string;
    userId: string | null;
    action: string;
    at: Date;
  }>;
  comments: Collection<Comment>;
  notifications: Notification[];
  auditEvents: Array<AuditEvent & { createdAt: Date }>;
  usage: Map<string, number>;
}

export function createMemoryState(): MemoryState {
  return {
    profiles: new Map(),
    organizations: new Map(),
    memberships: [],
    projects: new Collection<Project>(),
    aiSystems: new Collection<AiSystem>(),
    authorizations: new Collection<AuthorizationAttestation>(),
    knowledgeSources: new Collection<KnowledgeSource>(),
    scenarios: new Map(),
    auditPlans: new Collection<AuditPlan>(),
    planScenarios: new Collection<PlanScenario>(),
    runs: new Collection<TestRun>(),
    testCases: new Collection<TestCase>(),
    turns: [],
    evaluations: new Collection<Evaluation>(),
    dimensionScores: new Collection<DimensionScoreRecord>(),
    findings: new Collection<Finding>(),
    findingHistory: [],
    reports: new Collection<Report>(),
    reportAccess: [],
    comments: new Collection<Comment>(),
    notifications: [],
    auditEvents: [],
    usage: new Map(),
  };
}

function usageKey(organizationId: string, metric: string, start: Date): string {
  return `${organizationId}:${metric}:${start.toISOString()}`;
}

export function createMemoryDataStore(
  state: MemoryState = createMemoryState(),
): DataStore & { state: MemoryState } {
  return {
    state,

    profiles: {
      async findById(userId) {
        return state.profiles.get(userId) ?? null;
      },
      async findByEmail(email) {
        const normalized = email.trim().toLowerCase();
        return (
          [...state.profiles.values()].find(
            (p) => p.email.toLowerCase() === normalized,
          ) ?? null
        );
      },
      async upsert(profile) {
        state.profiles.set(profile.id, profile);
        return profile;
      },
    },

    organizations: {
      async findById(organizationId) {
        return state.organizations.get(organizationId) ?? null;
      },
      async findBySlug(slug) {
        return (
          [...state.organizations.values()].find((o) => o.slug === slug) ?? null
        );
      },
      async create(organization) {
        state.organizations.set(organization.id, organization);
        return organization;
      },
      async update(organizationId, patch) {
        const existing = state.organizations.get(organizationId);
        if (!existing) {
          throw new RepositoryError('No such organization', 'NOT_FOUND');
        }
        const next = { ...existing, ...patch, id: organizationId };
        state.organizations.set(organizationId, next);
        return next;
      },
    },

    memberships: {
      async listActiveForUser(userId) {
        return state.memberships.filter(
          (m) => m.userId === userId && m.revokedAt === null && m.acceptedAt,
        );
      },
      async findActive(organizationId, userId) {
        return (
          state.memberships.find(
            (m) =>
              m.organizationId === organizationId &&
              m.userId === userId &&
              m.revokedAt === null &&
              m.acceptedAt !== null,
          ) ?? null
        );
      },
      async listForOrganization(organizationId) {
        return state.memberships.filter(
          (m) => m.organizationId === organizationId,
        );
      },
      async create(membership) {
        state.memberships.push(membership);
        return membership;
      },
      async revoke(membershipId, at) {
        const found = state.memberships.find((m) => m.id === membershipId);
        if (found) found.revokedAt = at;
      },
    },

    projects: {
      async findById(organizationId, projectId) {
        return state.projects.get(organizationId, projectId);
      },
      async findByIdInternal(projectId) {
        return state.projects.all().find((p) => p.id === projectId) ?? null;
      },
      async listForOrganization(organizationId) {
        return state.projects.where(organizationId, () => true);
      },
      async listByStatus(statuses) {
        return state.projects
          .all()
          .filter((p) => statuses.includes(p.status))
          .map((p) => structuredClone(p));
      },
      async create(project) {
        return state.projects.insert(project);
      },
      async update(organizationId, projectId, patch) {
        return state.projects.patch(organizationId, projectId, patch);
      },
    },

    aiSystems: {
      async findByProject(organizationId, projectId) {
        return (
          state.aiSystems.where(
            organizationId,
            (s) => s.projectId === projectId,
          )[0] ?? null
        );
      },
      async upsert(system) {
        const existing = state.aiSystems.get(system.organizationId, system.id);
        return existing
          ? state.aiSystems.patch(system.organizationId, system.id, system)
          : state.aiSystems.insert(system);
      },
    },

    authorizations: {
      async findActive(organizationId, projectId, now) {
        return (
          state.authorizations
            .where(
              organizationId,
              (a) =>
                a.projectId === projectId &&
                a.revokedAt === null &&
                (a.expiresAt === null || a.expiresAt > now),
            )
            .sort(
              (a, b) => b.acceptedAt.getTime() - a.acceptedAt.getTime(),
            )[0] ?? null
        );
      },
      async listForProject(organizationId, projectId) {
        return state.authorizations.where(
          organizationId,
          (a) => a.projectId === projectId,
        );
      },
      async create(attestation) {
        return state.authorizations.insert(attestation);
      },
      async revoke(id, at, reason) {
        const found = state.authorizations.all().find((a) => a.id === id);
        if (!found)
          throw new RepositoryError('No such attestation', 'NOT_FOUND');
        state.authorizations.patch(found.organizationId, id, {
          revokedAt: at,
          revokedReason: reason,
        });
      },
    },

    knowledgeSources: {
      async listForProject(organizationId, projectId) {
        return state.knowledgeSources.where(
          organizationId,
          (s) => s.projectId === projectId,
        );
      },
      async create(source) {
        return state.knowledgeSources.insert(source);
      },
    },

    scenarios: {
      async listPublished(filter) {
        return [...state.scenarios.values()].filter(
          (s) =>
            s.status === 'published' &&
            (!filter?.locale || s.locale === filter.locale) &&
            (!filter?.category || s.category === filter.category),
        );
      },
      async findById(id) {
        return state.scenarios.get(id) ?? null;
      },
      async findLatest(familyId, locale) {
        return (
          [...state.scenarios.values()]
            .filter(
              (s) =>
                s.familyId === familyId &&
                s.locale === locale &&
                s.status === 'published',
            )
            .sort((a, b) => b.version - a.version)[0] ?? null
        );
      },
      async create(template) {
        state.scenarios.set(template.id, template);
        return template;
      },
    },

    auditPlans: {
      async findById(organizationId, planId) {
        return state.auditPlans.get(organizationId, planId);
      },
      async listForProject(organizationId, projectId) {
        return state.auditPlans.where(
          organizationId,
          (p) => p.projectId === projectId,
        );
      },
      async create(plan) {
        return state.auditPlans.insert(plan);
      },
      async update(organizationId, planId, patch) {
        return state.auditPlans.patch(organizationId, planId, patch);
      },
      async listScenarios(organizationId, planId) {
        return state.planScenarios
          .where(organizationId, (s) => s.auditPlanId === planId)
          .sort((a, b) => a.sequence - b.sequence);
      },
      async addScenario(scenario) {
        return state.planScenarios.insert(scenario);
      },
      async removeScenario(organizationId, scenarioId) {
        const found = state.planScenarios.get(organizationId, scenarioId);
        if (found) {
          state.planScenarios.patch(organizationId, scenarioId, {
            auditPlanId: '__removed__',
          });
        }
      },
    },

    runs: {
      async findById(organizationId, runId) {
        return state.runs.get(organizationId, runId);
      },
      async listForProject(organizationId, projectId) {
        return state.runs.where(
          organizationId,
          (r) => r.projectId === projectId,
        );
      },
      async create(run) {
        return state.runs.insert(run);
      },
      async update(organizationId, runId, patch) {
        return state.runs.patch(organizationId, runId, patch);
      },
    },

    testCases: {
      async findById(organizationId, caseId) {
        return state.testCases.get(organizationId, caseId);
      },
      async listForRun(organizationId, runId) {
        return state.testCases.where(
          organizationId,
          (c) => c.testRunId === runId,
        );
      },
      async create(testCase) {
        return state.testCases.insert(testCase);
      },
      async update(organizationId, caseId, patch) {
        return state.testCases.patch(organizationId, caseId, patch);
      },
      async listTurns(organizationId, caseId) {
        return state.turns
          .filter(
            (t) =>
              t.organizationId === organizationId && t.testCaseId === caseId,
          )
          .sort((a, b) => a.sequence - b.sequence)
          .map((t) => structuredClone(t));
      },
      async appendTurn(turn) {
        // FR-RUN-005: captured content is immutable. Rewriting an existing
        // (case, sequence) is refused here exactly as the database trigger
        // refuses it.
        const clash = state.turns.find(
          (t) =>
            t.testCaseId === turn.testCaseId && t.sequence === turn.sequence,
        );
        if (clash) {
          throw new RepositoryError(
            'Captured conversation content is immutable.',
            'IMMUTABLE',
          );
        }
        state.turns.push(structuredClone(turn));
        return turn;
      },
    },

    evaluations: {
      async findByTestCase(organizationId, caseId) {
        return (
          state.evaluations.where(
            organizationId,
            (e) => e.testCaseId === caseId,
          )[0] ?? null
        );
      },
      async create(evaluation) {
        return state.evaluations.insert(evaluation);
      },
      async update(organizationId, evaluationId, patch) {
        return state.evaluations.patch(organizationId, evaluationId, patch);
      },
      async listScores(organizationId, caseId) {
        return state.dimensionScores.where(
          organizationId,
          (s) => s.testCaseId === caseId,
        );
      },
      async upsertScore(score) {
        const existing = state.dimensionScores.where(
          score.organizationId,
          (s) =>
            s.testCaseId === score.testCaseId &&
            s.dimension === score.dimension,
        )[0];
        if (existing) {
          return state.dimensionScores.patch(
            score.organizationId,
            existing.id,
            score,
          );
        }
        return state.dimensionScores.insert(score);
      },
    },

    findings: {
      async findById(organizationId, findingId) {
        return state.findings.get(organizationId, findingId);
      },
      async listForRun(organizationId, runId) {
        return state.findings.where(
          organizationId,
          (f) => f.testRunId === runId,
        );
      },
      async listForProject(organizationId, projectId) {
        return state.findings.where(
          organizationId,
          (f) => f.projectId === projectId,
        );
      },
      async create(finding) {
        return state.findings.insert(finding);
      },
      async update(organizationId, findingId, patch) {
        return state.findings.patch(organizationId, findingId, patch);
      },
      async recordStatusChange(entry) {
        state.findingHistory.push(entry);
      },
    },

    reports: {
      async findById(organizationId, reportId) {
        return state.reports.get(organizationId, reportId);
      },
      async listForProject(organizationId, projectId) {
        return state.reports.where(
          organizationId,
          (r) => r.projectId === projectId,
        );
      },
      async listForRun(organizationId, runId) {
        return state.reports.where(
          organizationId,
          (r) => r.testRunId === runId,
        );
      },
      async create(report) {
        return state.reports.insert(report);
      },
      async update(organizationId, reportId, patch) {
        const existing = state.reports.get(organizationId, reportId);
        if (!existing) {
          throw new RepositoryError('No such report', 'NOT_FOUND');
        }
        // FR-RPT-004: a released report is immutable except for the supersede
        // pointer and status. Mirrors the database trigger.
        if (existing.status === 'released') {
          const forbidden: Array<keyof Report> = [
            'contentSnapshot',
            'score',
            'grade',
            'parityIndex',
          ];
          for (const key of forbidden) {
            if (patch[key] !== undefined && patch[key] !== existing[key]) {
              throw new RepositoryError(
                'A released report is immutable. Issue a correction as a new version.',
                'IMMUTABLE',
              );
            }
          }
        }
        return state.reports.patch(organizationId, reportId, patch);
      },
      async recordAccess(entry) {
        state.reportAccess.push(entry);
      },
    },

    comments: {
      async listForObject(organizationId, objectType, objectId, visibility) {
        return state.comments.where(
          organizationId,
          (c) =>
            c.objectType === objectType &&
            c.objectId === objectId &&
            (visibility === 'all' || c.visibility === visibility),
        );
      },
      async create(comment) {
        return state.comments.insert(comment);
      },
    },

    notifications: {
      async listForUser(userId, unreadOnly) {
        return state.notifications
          .filter((n) => n.userId === userId)
          .filter((n) => !unreadOnly || n.readAt === null)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      async create(notification) {
        state.notifications.push(notification);
        return notification;
      },
      async markRead(userId, notificationId, at) {
        const found = state.notifications.find(
          (n) => n.id === notificationId && n.userId === userId,
        );
        if (found) found.readAt = at;
      },
    },

    auditEvents: {
      async record(event) {
        state.auditEvents.push({ ...event, createdAt: new Date() });
      },
      async list(filter) {
        return state.auditEvents
          .filter(
            (e) =>
              (!filter.organizationId ||
                e.organizationId === filter.organizationId) &&
              (!filter.action || e.action === filter.action) &&
              (!filter.from || e.createdAt >= filter.from) &&
              (!filter.to || e.createdAt <= filter.to),
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, filter.limit);
      },
    },

    usage: {
      async getConsumed(organizationId, metric, periodStart) {
        return (
          state.usage.get(usageKey(organizationId, metric, periodStart)) ?? 0
        );
      },
      async increment(
        organizationId,
        metric,
        periodStart,
        _periodEnd,
        quantity,
      ) {
        const key = usageKey(organizationId, metric, periodStart);
        state.usage.set(key, (state.usage.get(key) ?? 0) + quantity);
      },
    },
  };
}
