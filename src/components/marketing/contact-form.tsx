'use client';

import { useState, type FormEvent } from 'react';
import { CONTACT_LIMITS } from '@/lib/validation/contact';
import { interpolate, type Locale, type Messages } from '@/lib/i18n';

/**
 * Lead / contact form.
 *
 * PRD ref: FR-MKT-004 — client and server validation, explicit consent text,
 * separate optional marketing consent, spam prevention.
 *
 * Accessibility (17.1): every field has a programmatic label, invalid fields
 * are linked to their message via aria-describedby, and the error summary is
 * announced and focusable so keyboard users are told what failed.
 */
export function ContactForm({
  locale,
  m,
  brandName,
}: {
  locale: Locale;
  m: Messages;
  brandName: string;
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      organization: String(formData.get('organization') ?? ''),
      role: String(formData.get('role') ?? ''),
      system: String(formData.get('system') ?? ''),
      languages: String(formData.get('languages') ?? ''),
      message: String(formData.get('message') ?? ''),
      consent: formData.get('consent') === 'on',
      marketingConsent: formData.get('marketingConsent') === 'on',
      website: String(formData.get('website') ?? ''),
      locale,
    };

    // Client-side validation mirrors the server schema; the server remains the
    // authority (FR-MKT-004).
    const errors: Record<string, string> = {};
    if (payload.name.trim() === '') {
      errors.name = m.contact.validation.nameRequired;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email.trim())) {
      errors.email = m.contact.validation.emailRequired;
    }
    if (payload.message.trim() === '') {
      errors.message = m.contact.validation.messageRequired;
    }
    if (!payload.consent) {
      errors.consent = m.contact.validation.consentRequired;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStatus('error');
      return;
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus('sent');
        return;
      }

      const body: unknown = await response.json().catch(() => null);
      const serverFields =
        body &&
        typeof body === 'object' &&
        'error' in body &&
        body.error &&
        typeof body.error === 'object' &&
        'fields' in body.error
          ? (body.error as { fields?: Record<string, string> }).fields
          : undefined;

      setFieldErrors(serverFields ?? {});
      setStatus('error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div
        role="status"
        className="mt-8 max-w-2xl rounded-xl border border-teal-500 bg-teal-50 p-6"
      >
        <h2 className="text-xl font-semibold">{m.contact.successTitle}</h2>
        <p className="mt-2">{m.contact.successBody}</p>
      </div>
    );
  }

  const errorEntries = Object.entries(fieldErrors);

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 max-w-2xl">
      {errorEntries.length > 0 ? (
        <div
          role="alert"
          tabIndex={-1}
          className="mb-6 rounded-lg border border-[color:var(--color-critical)] bg-[#fdf1f0] p-4"
        >
          <h2 className="font-semibold">{m.contact.errorTitle}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errorEntries.map(([field, message]) => (
              <li key={field}>
                <a href={`#field-${field}`} className="underline">
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-5">
        <Field
          id="name"
          label={m.contact.nameLabel}
          required
          error={fieldErrors.name}
          maxLength={CONTACT_LIMITS.name}
          autoComplete="name"
        />
        <Field
          id="email"
          label={m.contact.emailLabel}
          type="email"
          required
          error={fieldErrors.email}
          maxLength={CONTACT_LIMITS.email}
          autoComplete="email"
        />
        <Field
          id="organization"
          label={m.contact.organizationLabel}
          error={fieldErrors.organization}
          maxLength={CONTACT_LIMITS.organization}
          autoComplete="organization"
        />
        <Field
          id="role"
          label={m.contact.roleLabel}
          error={fieldErrors.role}
          maxLength={CONTACT_LIMITS.role}
        />
        <Field
          id="system"
          label={m.contact.systemLabel}
          error={fieldErrors.system}
          maxLength={CONTACT_LIMITS.system}
        />
        <Field
          id="languages"
          label={m.contact.languagesLabel}
          error={fieldErrors.languages}
          maxLength={CONTACT_LIMITS.languages}
        />

        <div>
          <label htmlFor="field-message" className="block font-medium">
            {m.contact.messageLabel}{' '}
            <span className="text-sm font-normal">({m.common.required})</span>
          </label>
          <textarea
            id="field-message"
            name="message"
            rows={6}
            required
            maxLength={CONTACT_LIMITS.message}
            aria-describedby={
              fieldErrors.message ? 'error-message' : 'hint-no-secrets'
            }
            aria-invalid={fieldErrors.message ? true : undefined}
            className="mt-1 w-full rounded-lg border border-[color:var(--border-subtle)] p-3"
          />
          <p id="hint-no-secrets" className="mt-1 text-sm">
            {m.contact.noSecrets}
          </p>
          {fieldErrors.message ? (
            <p id="error-message" className="mt-1 text-sm font-medium">
              {fieldErrors.message}
            </p>
          ) : null}
        </div>

        {/* Honeypot: hidden from users and assistive technology alike. */}
        <div aria-hidden="true" className="hidden">
          <label htmlFor="field-website">Website</label>
          <input
            id="field-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="space-y-3">
          <Checkbox
            id="consent"
            label={interpolate(m.contact.consentLabel, { brand: brandName })}
            required
            error={fieldErrors.consent}
          />
          {/* FR-LEGAL-001: optional marketing consent is never bundled into
              required service acceptance. */}
          <Checkbox
            id="marketingConsent"
            label={m.contact.marketingConsentLabel}
          />
        </div>

        <p className="text-sm">{m.contact.responseWindow}</p>

        <button
          type="submit"
          disabled={status === 'sending'}
          className="bg-navy-900 hover:bg-navy-700 inline-flex min-h-11 items-center rounded-lg px-5 font-semibold text-white disabled:opacity-60"
        >
          {status === 'sending' ? m.common.sending : m.contact.submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  type = 'text',
  required = false,
  error,
  maxLength,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  maxLength: number;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={`field-${id}`} className="block font-medium">
        {label}
        {required ? <span className="text-sm font-normal"> *</span> : null}
      </label>
      <input
        id={`field-${id}`}
        name={id}
        type={type}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-describedby={error ? `error-${id}` : undefined}
        aria-invalid={error ? true : undefined}
        className="mt-1 min-h-11 w-full rounded-lg border border-[color:var(--border-subtle)] px-3"
      />
      {error ? (
        <p id={`error-${id}`} className="mt-1 text-sm font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Checkbox({
  id,
  label,
  required = false,
  error,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={`field-${id}`}
          name={id}
          type="checkbox"
          required={required}
          aria-describedby={error ? `error-${id}` : undefined}
          aria-invalid={error ? true : undefined}
          className="mt-1 h-5 w-5"
        />
        <label htmlFor={`field-${id}`}>{label}</label>
      </div>
      {error ? (
        <p id={`error-${id}`} className="mt-1 text-sm font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
}
