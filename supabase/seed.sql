-- BotAssure CX - development seed data
--
-- PRD refs: 1.2 (development seed data), 21.2 ("Seed scripts never run
-- automatically in production"), Appendix A (launch scenario taxonomy).
--
-- SAFETY: this script refuses to run against a database flagged as production.
-- Everything it inserts is synthetic (14.6: "Local: synthetic data only").
--
-- SCENARIO LIBRARY STATUS: Appendix A requires at least 80 published templates
-- at launch, in matched English/French pairs. This seed contains 12 matched
-- pairs (24 templates) covering every category in FR-SCN-002. The remaining
-- templates are analyst content, not code, and are tracked as an open launch
-- item in PRD_TRACEABILITY.md.

do $$
begin
  if current_setting('app.environment', true) = 'production' then
    raise exception
      'Seed data must never be loaded into production (PRD 21.2).';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Service packages
--
-- Reference amounts mirror src/config/packages.ts. Provider price IDs are left
-- null: they are environment-specific and must be set from the billing
-- provider's dashboard, never hard-coded (PRD 1.1.12).
-- ---------------------------------------------------------------------------

insert into service_packages
  (code, name_en, name_fr, description_en, description_fr, billing_type,
   reference_amount_minor, entitlement, self_serve_checkout, display_order)
values
  ('essential_audit', 'Essential Audit', 'Audit Essentiel',
   'One system, one language, up to 25 approved scenarios.',
   'Un système, une langue, jusqu''à 25 scénarios approuvés.',
   'one_time', 49500,
   '{"systems":1,"localeScope":"single","scenariosPerCycle":25,"reportsPerCycle":1,"retestsPerCycle":0,"retestScenarioLimit":0,"retestWindowDays":0,"monitoringFrequency":"none","userSeats":3,"evidenceRetentionDays":90,"supportLevel":"standard","maxPrioritizedFindings":5,"overagesAllowed":false}'::jsonb,
   true, 1),

  ('bilingual_pro_audit', 'Bilingual Pro Audit', 'Audit Pro bilingue',
   'English and Canadian French, matched scenario pairs and a parity index.',
   'Anglais et français canadien, paires de scénarios appariées et indice de parité.',
   'one_time', 175000,
   '{"systems":1,"localeScope":"bilingual","scenariosPerCycle":75,"reportsPerCycle":1,"retestsPerCycle":1,"retestScenarioLimit":20,"retestWindowDays":30,"monitoringFrequency":"none","userSeats":5,"evidenceRetentionDays":90,"supportLevel":"standard","maxPrioritizedFindings":15,"overagesAllowed":false}'::jsonb,
   true, 2),

  ('continuous_assurance', 'Continuous Assurance', 'Assurance continue',
   'Monthly reassessment with change tracking and reviewed regression alerts.',
   'Réévaluation mensuelle avec suivi des changements et alertes de régression révisées.',
   'recurring', 69900,
   '{"systems":1,"localeScope":"bilingual","scenariosPerCycle":100,"reportsPerCycle":1,"retestsPerCycle":1,"retestScenarioLimit":20,"retestWindowDays":30,"monitoringFrequency":"monthly","userSeats":10,"evidenceRetentionDays":180,"supportLevel":"priority","maxPrioritizedFindings":15,"overagesAllowed":true}'::jsonb,
   true, 3),

  ('enterprise_managed', 'Enterprise Managed Assurance', 'Assurance gérée Entreprise',
   'Multiple systems, custom scenarios and dedicated reporting. Sales-assisted.',
   'Plusieurs systèmes, scénarios sur mesure et rapports dédiés. Accompagné par les ventes.',
   'quote', 250000,
   '{"systems":3,"localeScope":"bilingual","scenariosPerCycle":200,"reportsPerCycle":2,"retestsPerCycle":2,"retestScenarioLimit":50,"retestWindowDays":60,"monitoringFrequency":"custom","userSeats":25,"evidenceRetentionDays":365,"supportLevel":"enterprise","maxPrioritizedFindings":30,"overagesAllowed":true}'::jsonb,
   false, 4)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Evaluator version
-- ---------------------------------------------------------------------------

insert into evaluation_versions
  (rubric_version, prompt_version, provider, model_identifier,
   json_schema_version, parameters)
values
  ('default@1.0.0', 'evaluator@1.0.0', 'unconfigured', 'unconfigured', '1.0',
   '{"temperature":0,"maxOutputTokens":2000}'::jsonb)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Scenario templates
--
-- The library lives in `src/data/scenario-library.ts` and the SQL is generated
-- from it into `seed_scenarios.sql` — 86 templates in 43 matched pairs, covering
-- every Appendix A topic. It is a separate file because it is generated: mixing
-- generated and hand-written statements in one file invites someone to edit the
-- generated half and lose the change on the next run.
--
-- Apply it after this file:
--   psql "$DATABASE_URL" -f supabase/seed_scenarios.sql
--
-- Regenerate with:
--   node scripts/generate-scenario-seed.mjs
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- Feature flags (development defaults)
--
-- Every higher-risk capability is seeded OFF, matching src/config/feature-flags.ts.
-- ---------------------------------------------------------------------------

insert into feature_flags (key, environment, enabled, change_reason) values
  ('browser_runner', 'development', false, 'P1; blocked on threat-model review (FR-RUN-006).'),
  ('api_capture_adapter', 'development', false, 'Requires SSRF guard verification and an active attestation.'),
  ('ai_evaluation', 'development', false, 'No AI provider configured.'),
  ('scheduled_monitoring', 'development', false, 'Requires authorization re-confirmation per cycle.'),
  ('report_share_links', 'development', false, 'P1 (FR-RPT-005).'),
  ('customer_mfa_enforcement', 'development', false, 'P1 (FR-AUTH-002).'),
  ('analytics', 'development', false, 'Off until consent handling is in place.')
on conflict (key, environment) do nothing;
