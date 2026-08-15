"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { Field, TextInput } from "@/components/shared/forms";
import { Wordmark } from "@/components/shared/wordmark";
import { LockIcon, AlertIcon } from "@/components/shared/icons";

export function OpsLogin() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data: unknown = await res.json();
      setError(
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : "Sign-in failed.",
      );
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-5 py-16">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--border)] bg-paper p-8 shadow-[var(--shadow-md)]"
      >
        <Wordmark href="/" />
        <div className="mt-6 flex items-center gap-2 text-ink">
          <LockIcon size={20} />
          <h1 className="text-[1.25rem] font-semibold">Operations access</h1>
        </div>
        <p className="mt-2 text-[0.9rem] text-ink-soft">
          Enter the operator access token to continue.
        </p>
        <div className="mt-5">
          <Field label="Access token" error={undefined}>
            {({ id }) => (
              <TextInput
                id={id}
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="••••••••••••"
                invalid={!!error}
              />
            )}
          </Field>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-md bg-[var(--coral-soft)] px-3 py-2 text-[0.86rem] text-[var(--coral)]"
          >
            <AlertIcon size={16} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
        <div className="mt-5">
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? "Verifying…" : "Sign in"}
          </Button>
        </div>
      </form>
    </div>
  );
}
