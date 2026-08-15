import { z } from "zod";

/**
 * Onboarding validation (PRD FR-ONB-001..003). Drafts may be partial
 * (save-and-resume); completion requires the essentials plus explicit consent
 * to Terms, Privacy, and the prohibited-content guidance (FR-ONB-002).
 */

export const childSchema = z.object({
  display_name: z.string().trim().min(1, "Add a nickname or initials").max(60),
  school_label: z.string().trim().max(120).optional().or(z.literal("")),
  grade_label: z.string().trim().max(60).optional().or(z.literal("")),
});

// Common IANA-ish timezone guard (lenient — we only need something sane).
const timezone = z.string().trim().min(1).max(64);

export const onboardingDataSchema = z.object({
  account_name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  timezone: timezone.optional(),
  children: z.array(childSchema).max(6).optional(),
  coparent_email: z
    .string()
    .trim()
    .email()
    .max(200)
    .optional()
    .or(z.literal("")),
  calendar_preference: z.string().trim().max(40).optional(),
  reminder_preference: z.string().trim().max(40).optional(),
  known_senders: z.string().trim().max(2000).optional(),
  // Consent is captured at completion time (see completeSchema), never in a
  // partial draft, so it is intentionally not part of the draft data shape.
});

export const saveDraftSchema = z.object({
  step: z.number().int().min(0).max(10),
  data: onboardingDataSchema,
});

/** Stricter requirements enforced only at completion time. */
export const completeSchema = z.object({
  data: onboardingDataSchema.extend({
    account_name: z.string().trim().min(1, "Your name is required").max(120),
    email: z.string().trim().email("A valid email is required").max(200),
    timezone,
    children: z.array(childSchema).min(1, "Add at least one child").max(6),
    consent: z.object({
      terms: z.literal(true),
      privacy: z.literal(true),
      prohibited: z.literal(true),
    }),
  }),
});

export type OnboardingDataInput = z.infer<typeof onboardingDataSchema>;
