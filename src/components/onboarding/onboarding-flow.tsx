"use client";

import { useState } from "react";
import { ButtonLink, Button } from "@/components/shared/button";
import {
  Field,
  TextInput,
  Textarea,
  Select,
  Checkbox,
  RadioCard,
} from "@/components/shared/forms";
import {
  CheckCircleIcon,
  CloseIcon,
  LockIcon,
} from "@/components/shared/icons";
import { track } from "@/lib/analytics";
import { cx } from "@/lib/cx";
import type { OnboardingData } from "@/lib/database/types";

const TIMEZONES = [
  "America/St_Johns",
  "America/Halifax",
  "America/Toronto",
  "America/Winnipeg",
  "America/Edmonton",
  "America/Vancouver",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

interface ChildRow {
  display_name: string;
  school_label: string;
  grade_label: string;
}

interface FormState {
  account_name: string;
  email: string;
  timezone: string;
  children: ChildRow[];
  coparent_email: string;
  calendar_preference: string;
  reminder_preference: string;
  known_senders: string;
  consent: { terms: boolean; privacy: boolean; prohibited: boolean };
}

const STEPS = [
  "Your account",
  "Your children",
  "Preferences",
  "Confirm & start",
];

function emptyChild(): ChildRow {
  return { display_name: "", school_label: "", grade_label: "" };
}

export function OnboardingFlow({
  token,
  customerEmail,
  initial,
  maxChildren,
}: {
  token: string;
  customerEmail: string;
  initial: OnboardingData | null;
  maxChildren: number;
}) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [state, setState] = useState<FormState>(() => ({
    account_name: initial?.account_name ?? "",
    email: initial?.email || customerEmail || "",
    timezone: initial?.timezone ?? "America/Toronto",
    children:
      initial?.children && initial.children.length > 0
        ? initial.children.map((c) => ({
            display_name: c.display_name ?? "",
            school_label: c.school_label ?? "",
            grade_label: c.grade_label ?? "",
          }))
        : [emptyChild()],
    coparent_email: initial?.coparent_email ?? "",
    calendar_preference: initial?.calendar_preference ?? "",
    reminder_preference: initial?.reminder_preference ?? "",
    known_senders: initial?.known_senders ?? "",
    consent: { terms: false, privacy: false, prohibited: false },
  }));

  function patch(next: Partial<FormState>) {
    setState((s) => ({ ...s, ...next }));
  }
  function patchChild(i: number, next: Partial<ChildRow>) {
    setState((s) => ({
      ...s,
      children: s.children.map((c, idx) => (idx === i ? { ...c, ...next } : c)),
    }));
  }

  function toDraft(): OnboardingData {
    return {
      account_name: state.account_name || undefined,
      email: state.email || undefined,
      timezone: state.timezone,
      children: state.children
        .filter((c) => c.display_name.trim() || c.school_label.trim())
        .map((c) => ({
          display_name: c.display_name,
          school_label: c.school_label || undefined,
          grade_label: c.grade_label || undefined,
        })),
      coparent_email: state.coparent_email || undefined,
      calendar_preference: state.calendar_preference || undefined,
      reminder_preference: state.reminder_preference || undefined,
      known_senders: state.known_senders || undefined,
    };
  }

  async function saveDraft(nextStep: number) {
    setSaving(true);
    try {
      await fetch(`/api/onboarding/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save",
          step: nextStep,
          data: toDraft(),
        }),
      });
      setSavedAt(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch {
      // Draft-save failures are non-blocking; the user can still continue.
    } finally {
      setSaving(false);
    }
  }

  function validateStep(i: number): boolean {
    const e: Record<string, string> = {};
    if (i === 0) {
      if (!state.account_name.trim()) e.account_name = "Please add your name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim()))
        e.email = "Please enter a valid email.";
    }
    if (i === 1) {
      const named = state.children.filter((c) => c.display_name.trim());
      if (named.length === 0)
        e.children = "Add at least one child (a nickname or initials is fine).";
    }
    if (i === 3) {
      if (!state.consent.terms) e.terms = "Please accept the Terms.";
      if (!state.consent.privacy)
        e.privacy = "Please accept the Privacy Policy.";
      if (!state.consent.prohibited)
        e.prohibited = "Please confirm you understand what not to send.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function next() {
    setFormError(null);
    if (!validateStep(step)) return;
    const target = Math.min(step + 1, STEPS.length - 1);
    await saveDraft(target);
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setFormError(null);
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    setFormError(null);
    if (!validateStep(3)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/onboarding/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          data: {
            account_name: state.account_name.trim(),
            email: state.email.trim(),
            timezone: state.timezone,
            children: state.children
              .filter((c) => c.display_name.trim())
              .map((c) => ({
                display_name: c.display_name.trim(),
                school_label: c.school_label.trim(),
                grade_label: c.grade_label.trim(),
              })),
            coparent_email: state.coparent_email.trim(),
            calendar_preference: state.calendar_preference,
            reminder_preference: state.reminder_preference,
            known_senders: state.known_senders.trim(),
            consent: { terms: true, privacy: true, prohibited: true },
          },
        }),
      });
      const data: unknown = await res.json();
      if (res.ok && data && typeof data === "object" && "completed" in data) {
        track("onboarding_completed");
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setFormError(
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : "Something went wrong. Please review and try again.",
      );
    } catch {
      setFormError("We couldn’t submit your onboarding. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (done) return <SuccessScreen email={state.email} />;

  const namedCount = state.children.filter((c) => c.display_name.trim()).length;

  return (
    <div>
      {/* Stepper */}
      <ol
        className="mb-8 flex flex-wrap gap-2"
        aria-label="Onboarding progress"
      >
        {STEPS.map((label, i) => {
          const status =
            i < step ? "done" : i === step ? "current" : "upcoming";
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-current={status === "current" ? "step" : undefined}
                className={cx(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.82rem] font-medium",
                  status === "current" && "bg-ink text-paper",
                  status === "done" &&
                    "bg-[var(--sage-soft)] text-[var(--sage)]",
                  status === "upcoming" &&
                    "bg-[var(--surface-sunken)] text-ink-faint",
                )}
              >
                <span className="tnum">
                  {status === "done" ? <CheckCircleIcon size={15} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-paper p-6 sm:p-8">
        {/* Step 0 — Account */}
        {step === 0 && (
          <fieldset className="space-y-5">
            <legend className="text-[1.35rem] font-semibold text-ink">
              Let&rsquo;s set up your account
            </legend>
            <Field label="Your name" error={errors.account_name}>
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  value={state.account_name}
                  invalid={!!errors.account_name}
                  autoComplete="name"
                  onChange={(e) => patch({ account_name: e.target.value })}
                  placeholder="Alex Rivera"
                />
              )}
            </Field>
            <Field
              label="Email"
              hint="Where we send your briefings and updates."
              error={errors.email}
            >
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  type="email"
                  aria-describedby={describedBy}
                  value={state.email}
                  invalid={!!errors.email}
                  autoComplete="email"
                  onChange={(e) => patch({ email: e.target.value })}
                  placeholder="you@example.com"
                />
              )}
            </Field>
            <Field
              label="Time zone"
              hint="So dates and reminders land at the right local time."
            >
              {({ id }) => (
                <Select
                  id={id}
                  value={state.timezone}
                  onChange={(e) => patch({ timezone: e.target.value })}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace("America/", "").replace("_", " ")}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </fieldset>
        )}

        {/* Step 1 — Children */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[1.35rem] font-semibold text-ink">
                Who are we watching out for?
              </h2>
              <p className="mt-1.5 text-[0.94rem] text-ink-soft">
                A nickname or initials is all we need — no full legal names.
              </p>
            </div>
            {errors.children && (
              <p
                role="alert"
                className="text-[0.88rem] font-medium text-[var(--coral)]"
              >
                {errors.children}
              </p>
            )}
            <ul className="space-y-4">
              {state.children.map((child, i) => (
                <li
                  key={i}
                  className="rounded-[var(--radius-md)] border border-[var(--border)] bg-canvas p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[0.82rem] font-semibold uppercase tracking-wide text-ink-faint">
                      Child {i + 1}
                    </span>
                    {state.children.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            children: state.children.filter(
                              (_, idx) => idx !== i,
                            ),
                          })
                        }
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[0.82rem] text-ink-soft hover:bg-black/[0.04]"
                      >
                        <CloseIcon size={14} /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1.3fr_1.2fr_0.9fr]">
                    <Field
                      label="Nickname or initials"
                      htmlFor={`child-${i}-name`}
                    >
                      {({ id }) => (
                        <TextInput
                          id={id}
                          value={child.display_name}
                          onChange={(e) =>
                            patchChild(i, { display_name: e.target.value })
                          }
                          placeholder="R. or Sam"
                        />
                      )}
                    </Field>
                    <Field
                      label="School"
                      optional
                      htmlFor={`child-${i}-school`}
                    >
                      {({ id }) => (
                        <TextInput
                          id={id}
                          value={child.school_label}
                          onChange={(e) =>
                            patchChild(i, { school_label: e.target.value })
                          }
                          placeholder="Riverside Elementary"
                        />
                      )}
                    </Field>
                    <Field label="Grade" optional htmlFor={`child-${i}-grade`}>
                      {({ id }) => (
                        <TextInput
                          id={id}
                          value={child.grade_label}
                          onChange={(e) =>
                            patchChild(i, { grade_label: e.target.value })
                          }
                          placeholder="Grade 4"
                        />
                      )}
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
            {state.children.length < maxChildren && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  patch({ children: [...state.children, emptyChild()] })
                }
              >
                + Add another child
              </Button>
            )}
            <p className="text-[0.82rem] text-ink-faint">
              Your plan includes up to {maxChildren} children. Added{" "}
              {namedCount} so far.
            </p>
          </div>
        )}

        {/* Step 2 — Preferences */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-[1.35rem] font-semibold text-ink">
                A few preferences
              </h2>
              <p className="mt-1.5 text-[0.94rem] text-ink-soft">
                All optional — you can change any of this later.
              </p>
            </div>
            <Field
              label="Co-parent or caregiver email"
              optional
              hint="We’ll share the plan with them too. They see what you share, not every document."
            >
              {({ id, describedBy }) => (
                <TextInput
                  id={id}
                  type="email"
                  aria-describedby={describedBy}
                  value={state.coparent_email}
                  onChange={(e) => patch({ coparent_email: e.target.value })}
                  placeholder="partner@example.com"
                />
              )}
            </Field>

            <fieldset>
              <legend className="text-[0.92rem] font-medium text-ink">
                Calendar preference
              </legend>
              <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                {[
                  { v: "google", t: "Google Calendar" },
                  { v: "apple", t: "Apple Calendar" },
                  { v: "outlook", t: "Outlook" },
                  { v: "later", t: "I’ll decide later" },
                ].map((o) => (
                  <RadioCard
                    key={o.v}
                    name="calendar"
                    value={o.v}
                    checked={state.calendar_preference === o.v}
                    onChange={(v) => patch({ calendar_preference: v })}
                    title={o.t}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-[0.92rem] font-medium text-ink">
                Reminder rhythm
              </legend>
              <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
                {[
                  { v: "morning", t: "Morning digest" },
                  { v: "evening", t: "Evening digest" },
                  { v: "both", t: "Both" },
                ].map((o) => (
                  <RadioCard
                    key={o.v}
                    name="reminder"
                    value={o.v}
                    checked={state.reminder_preference === o.v}
                    onChange={(v) => patch({ reminder_preference: v })}
                    title={o.t}
                  />
                ))}
              </div>
            </fieldset>

            <Field
              label="Known school / activity sender addresses"
              optional
              hint="Emails you already receive school info from. Helps us recognise your sources."
            >
              {({ id, describedBy }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  value={state.known_senders}
                  onChange={(e) => patch({ known_senders: e.target.value })}
                  placeholder="office@riverside.example, coach@soccer.example"
                />
              )}
            </Field>
          </div>
        )}

        {/* Step 3 — Confirm */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[1.35rem] font-semibold text-ink">
                Confirm and start
              </h2>
              <p className="mt-1.5 text-[0.94rem] text-ink-soft">
                A quick review, then a few agreements and you&rsquo;re set.
              </p>
            </div>

            <dl className="grid gap-3 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-4 text-[0.9rem] sm:grid-cols-2">
              <Summary label="Name" value={state.account_name || "—"} />
              <Summary label="Email" value={state.email || "—"} />
              <Summary
                label="Time zone"
                value={state.timezone.replace("America/", "").replace("_", " ")}
              />
              <Summary label="Children" value={String(namedCount)} />
            </dl>

            <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--border)] p-4">
              <Checkbox
                checked={state.consent.terms}
                onChange={(e) =>
                  patch({
                    consent: { ...state.consent, terms: e.target.checked },
                  })
                }
                label={
                  <>
                    I agree to the{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      className="underline underline-offset-2"
                    >
                      Terms of Service
                    </a>
                    .
                  </>
                }
              />
              {errors.terms && <ConsentError msg={errors.terms} />}
              <Checkbox
                checked={state.consent.privacy}
                onChange={(e) =>
                  patch({
                    consent: { ...state.consent, privacy: e.target.checked },
                  })
                }
                label={
                  <>
                    I agree to the{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      className="underline underline-offset-2"
                    >
                      Privacy Policy
                    </a>
                    .
                  </>
                }
              />
              {errors.privacy && <ConsentError msg={errors.privacy} />}
              <Checkbox
                checked={state.consent.prohibited}
                onChange={(e) =>
                  patch({
                    consent: { ...state.consent, prohibited: e.target.checked },
                  })
                }
                label={
                  <>
                    I understand I should not send medical, custody, legal,
                    immigration, special-education, or financial-account
                    documents.
                  </>
                }
              />
              {errors.prohibited && <ConsentError msg={errors.prohibited} />}
            </div>

            {formError && (
              <p
                role="alert"
                className="rounded-md bg-[var(--coral-soft)] px-3 py-2.5 text-[0.9rem] text-[var(--coral)]"
              >
                {formError}
              </p>
            )}
          </div>
        )}

        {/* Nav */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-6">
          <div className="flex items-center gap-3">
            {step > 0 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={back}
                disabled={saving}
              >
                Back
              </Button>
            ) : (
              <span />
            )}
            {savedAt && (
              <span className="text-[0.8rem] text-ink-faint">
                Draft saved {savedAt}
              </span>
            )}
          </div>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next} disabled={saving} withArrow>
              {saving ? "Saving…" : "Continue"}
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={saving}>
              {saving ? "Submitting…" : "Finish onboarding"}
            </Button>
          )}
        </div>
      </div>

      <p className="mt-5 flex items-center justify-center gap-2 text-[0.82rem] text-ink-faint">
        <LockIcon size={14} className="text-[var(--sage)]" />
        Your progress is saved as you go. You can close this and resume from
        your emailed link.
      </p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-faint">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

function ConsentError({ msg }: { msg: string }) {
  return (
    <p
      role="alert"
      className="pl-8 text-[0.82rem] font-medium text-[var(--coral)]"
    >
      {msg}
    </p>
  );
}

function SuccessScreen({ email }: { email: string }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-paper p-8 text-center shadow-[var(--shadow-md)] sm:p-10">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--sage-soft)] text-[var(--sage)]">
        <CheckCircleIcon size={34} />
      </span>
      <h1 className="mt-6 text-[1.7rem] font-semibold text-ink">
        You&rsquo;re all set. Now send us your materials.
      </h1>
      <p className="mt-3 text-[1rem] leading-relaxed text-ink-soft">
        Your workspace is ready. The last step is to send the school, camp, and
        activity information you&rsquo;d like us to organize — forward emails or
        upload PDFs, screenshots, and photos of flyers.
      </p>
      <div className="mt-6 rounded-[var(--radius-md)] bg-[var(--sky)] px-5 py-4 text-left text-[0.92rem] text-[#2c4a63]">
        <p className="font-semibold">What happens next</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            We&rsquo;ll email {email || "you"} with exactly where to send
            materials.
          </li>
          <li>You forward or upload what you have — one batch or a few.</li>
          <li>
            We verify and deliver your calendar and action list in 24–48
            business hours.
          </li>
        </ol>
      </div>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/sample-briefing" variant="secondary">
          Revisit the sample briefing
        </ButtonLink>
        <ButtonLink href="/" variant="ghost">
          Return home
        </ButtonLink>
      </div>
    </div>
  );
}
