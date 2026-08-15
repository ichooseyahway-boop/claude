import Link from "next/link";
import { Wordmark } from "@/components/shared/wordmark";
import { ButtonLink } from "@/components/shared/button";
import { primaryNav } from "@/lib/config/site";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div className="shell flex flex-1 items-center justify-center py-20">
        <div className="w-full max-w-lg text-center">
          <div className="flex justify-center">
            <Wordmark href="/" />
          </div>
          <p className="mt-10 font-serif text-[4rem] leading-none text-ink-faint tnum">
            404
          </p>
          <h1 className="mt-4 text-[1.8rem] font-semibold text-ink">
            We couldn&rsquo;t find that page.
          </h1>
          <p className="mt-3 text-[1rem] text-ink-soft">
            The link may be old or mistyped. Here&rsquo;s the way back.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/" size="lg" withArrow>
              Back to home
            </ButtonLink>
            <ButtonLink href="/get-started" size="lg" variant="secondary">
              Start My Rescue
            </ButtonLink>
          </div>
          <nav
            aria-label="Helpful links"
            className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-[var(--border)] pt-6 text-[0.9rem]"
          >
            {primaryNav.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-ink-soft underline underline-offset-2 hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
