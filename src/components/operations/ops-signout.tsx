"use client";

import { useRouter } from "next/navigation";

export function OpsSignOut() {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/ops/session", { method: "DELETE" });
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-md px-3 py-1.5 text-[0.85rem] font-medium text-ink-soft ring-1 ring-[var(--border-strong)] transition-colors hover:bg-[var(--surface-sunken)]"
    >
      Sign out
    </button>
  );
}
