"use client";

import { useState } from "react";
import { Button } from "@/components/shared/button";
import { AlertIcon } from "@/components/shared/icons";
import { track } from "@/lib/analytics";
import type { OfferId } from "@/lib/config/offers";

/**
 * Starts a Stripe Checkout Session for the given offer and redirects the
 * browser to Stripe's hosted checkout. All price and session creation happens
 * server-side; nothing sensitive touches the client.
 */
export function CheckoutButton({
  offer,
  label,
}: {
  offer: OfferId;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    track("checkout_started", { offer });
    try {
      const res = await fetch("/api/checkout/rescue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ offer }),
      });
      const data: unknown = await res.json();
      if (
        res.ok &&
        data &&
        typeof data === "object" &&
        "url" in data &&
        typeof (data as { url: unknown }).url === "string"
      ) {
        window.location.href = (data as { url: string }).url;
        return;
      }
      const message =
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : "We couldn’t start checkout. Please try again.";
      setError(message);
    } catch {
      setError(
        "We couldn’t reach checkout. Please check your connection and retry.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        size="lg"
        className="w-full"
        onClick={start}
        disabled={loading}
        aria-busy={loading}
        withArrow={!loading}
      >
        {loading ? "Preparing secure checkout…" : label}
      </Button>
      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-md bg-[var(--coral-soft)] px-3 py-2.5 text-[0.88rem] text-[var(--coral)]"
        >
          <AlertIcon size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
      <p className="mt-3 text-center text-[0.82rem] text-ink-faint">
        Secure payment by Stripe. You&rsquo;ll return here to onboard.
      </p>
    </div>
  );
}
