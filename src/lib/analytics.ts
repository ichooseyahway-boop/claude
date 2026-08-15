/**
 * Privacy-safe analytics (PRD §18).
 *
 * HARD RULE: analytics NEVER receives child names, school names, source
 * contents, action titles, or private URLs. The event vocabulary below is a
 * closed set, and the only permitted properties are non-identifying enums
 * (e.g. which offer id a funnel step referred to). Enforced by the typed API.
 */

export const FUNNEL_EVENTS = [
  "landing_viewed",
  "sample_briefing_opened",
  "pricing_viewed",
  "checkout_started",
  "checkout_completed",
  "onboarding_started",
  "onboarding_completed",
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

/** Only these non-identifying keys may accompany an event. */
export interface AnalyticsProps {
  offer?: "rescue" | "care" | "care_plus";
  step?: number;
}

export function isFunnelEvent(value: string): value is FunnelEvent {
  return (FUNNEL_EVENTS as readonly string[]).includes(value);
}

/** Strip anything not in the allowlisted, non-identifying shape. */
export function sanitizeProps(input: unknown): AnalyticsProps {
  const out: AnalyticsProps = {};
  if (input && typeof input === "object") {
    const rec = input as Record<string, unknown>;
    if (
      rec.offer === "rescue" ||
      rec.offer === "care" ||
      rec.offer === "care_plus"
    ) {
      out.offer = rec.offer;
    }
    if (typeof rec.step === "number" && Number.isFinite(rec.step)) {
      out.step = Math.trunc(rec.step);
    }
  }
  return out;
}

/** Client-side track. No-op unless analytics is explicitly enabled. */
export function track(event: FunnelEvent, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  const enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
  const payload = JSON.stringify({ event, props: sanitizeProps(props) });

  if (!enabled) {
    if (process.env.NODE_ENV !== "production") {
      // Visible in dev only; never ships private data.
      console.debug("[analytics:disabled]", payload);
    }
    return;
  }

  try {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/analytics", blob);
  } catch {
    // Analytics must never break the page.
  }
}
