/**
 * Feature flags.
 *
 * PRD refs: 1.1.5 ("Use feature flags for unfinished or higher-risk functions.
 * An incomplete feature must be disabled in production"), FR-OPS-004,
 * FR-RUN-004 (global execution kill switch), FR-SYS-002 (browser runner is
 * feature-flagged until its security gates pass).
 *
 * Defaults are the SAFE state. A flag that is missing from the environment is
 * off, so a forgotten configuration value cannot silently enable an unfinished
 * or higher-risk capability in production.
 */

export type FeatureFlagKey =
  | 'browser_runner'
  | 'api_capture_adapter'
  | 'ai_evaluation'
  | 'scheduled_monitoring'
  | 'report_share_links'
  | 'customer_mfa_enforcement'
  | 'analytics';

interface FlagDefinition {
  key: FeatureFlagKey;
  envVar: string;
  defaultEnabled: boolean;
  description: string;
}

const FLAGS: Record<FeatureFlagKey, FlagDefinition> = {
  browser_runner: {
    key: 'browser_runner',
    envVar: 'FEATURE_BROWSER_RUNNER',
    defaultEnabled: false,
    description:
      'Isolated Playwright execution. P1 only; must not be enabled before the dedicated threat-model review passes (FR-RUN-006).',
  },
  api_capture_adapter: {
    key: 'api_capture_adapter',
    envVar: 'FEATURE_API_CAPTURE',
    defaultEnabled: false,
    description:
      'Server-side authorized API capture. Requires the SSRF guard and an active authorization attestation (FR-RUN-003).',
  },
  ai_evaluation: {
    key: 'ai_evaluation',
    envVar: 'FEATURE_AI_EVALUATION',
    defaultEnabled: false,
    description:
      'AI-assisted scoring proposals. Analyst review remains mandatory regardless of this flag (FR-EVAL-001).',
  },
  scheduled_monitoring: {
    key: 'scheduled_monitoring',
    envVar: 'FEATURE_SCHEDULED_MONITORING',
    defaultEnabled: false,
    description:
      'Subscription monitoring cycles. Requires confirmed active authorization before each cycle (8.5).',
  },
  report_share_links: {
    key: 'report_share_links',
    envVar: 'FEATURE_REPORT_SHARE_LINKS',
    defaultEnabled: false,
    description: 'Expiring, revocable report links. P1 (FR-RPT-005).',
  },
  customer_mfa_enforcement: {
    key: 'customer_mfa_enforcement',
    envVar: 'FEATURE_CUSTOMER_MFA_ENFORCEMENT',
    defaultEnabled: false,
    description:
      'Organization-enforced customer MFA. P1; internal MFA is mandatory and not flag-controlled (FR-AUTH-002).',
  },
  analytics: {
    key: 'analytics',
    envVar: 'FEATURE_ANALYTICS',
    defaultEnabled: false,
    description:
      'Privacy-conscious product analytics. Off until consent handling is in place (19.4).',
  },
};

/**
 * The global execution kill switch (FR-RUN-004).
 *
 * Engaged means: no new outbound test execution. Report access, billing
 * administration and sign-in continue to work.
 */
export function isExecutionKillSwitchEngaged(): boolean {
  return process.env.EXECUTION_KILL_SWITCH === 'true';
}

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  const flag = FLAGS[key];
  const raw = process.env[flag.envVar];
  if (raw === undefined) return flag.defaultEnabled;
  return raw === 'true';
}

export function allFlags(): Array<FlagDefinition & { enabled: boolean }> {
  return Object.values(FLAGS).map((flag) => ({
    ...flag,
    enabled: isFeatureEnabled(flag.key),
  }));
}
