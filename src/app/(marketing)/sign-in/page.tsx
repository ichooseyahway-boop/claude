import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/shared/ui";
import { ButtonLink } from "@/components/shared/button";
import { Wordmark } from "@/components/shared/wordmark";
import { LockIcon, MailIcon } from "@/components/shared/icons";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "The secure family portal arrives with Release 1. For now, your rescue is " +
    "delivered directly and your onboarding link resumes where you left off.",
};

/**
 * Sign-in is a clearly-labelled placeholder in Release 0. Passwordless sign-in
 * and the private portal ship in Release 1 (PRD §22.2 — "Sign In placeholder").
 * We do not present a fake login that collects credentials it can't use.
 */
export default function SignInPage() {
  return (
    <Shell className="flex min-h-[70vh] items-center justify-center py-20">
      <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--border)] bg-paper p-8 text-center shadow-[var(--shadow-md)] sm:p-10">
        <div className="flex justify-center">
          <Wordmark href="/" />
        </div>
        <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--sky)] px-3 py-1.5 text-[0.78rem] font-semibold text-[#2c4a63]">
          <LockIcon size={15} /> Portal coming with Release 1
        </span>
        <h1 className="mt-5 text-[1.6rem] font-semibold text-ink">
          The family portal is on its way.
        </h1>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-soft">
          Secure, passwordless sign-in and your private dashboard arrive in the
          next release. Right now, your rescue is delivered to you directly and
          your onboarding link resumes exactly where you left off.
        </p>

        <div className="mt-8 space-y-3">
          <ButtonLink
            href="/get-started"
            size="lg"
            className="w-full"
            withArrow
          >
            Start My Inbox Rescue
          </ButtonLink>
          <p className="text-[0.9rem] text-ink-soft">
            Already purchased and need your onboarding link?{" "}
            <a
              href={`mailto:${site.supportEmail}`}
              className="inline-flex items-center gap-1 font-medium text-ink underline underline-offset-2"
            >
              <MailIcon size={14} /> Email us
            </a>
          </p>
        </div>

        <p className="mt-8 border-t border-[var(--border)] pt-5 text-[0.85rem] text-ink-faint">
          New here?{" "}
          <Link href="/how-it-works" className="underline underline-offset-2">
            See how it works
          </Link>
          .
        </p>
      </div>
    </Shell>
  );
}
