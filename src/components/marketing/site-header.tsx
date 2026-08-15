"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/shared/wordmark";
import { ButtonLink } from "@/components/shared/button";
import { MenuIcon, CloseIcon } from "@/components/shared/icons";
import { primaryNav } from "@/lib/config/site";
import { cx } from "@/lib/cx";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  // Lock body scroll and support Escape while the menu is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cx(
        "sticky top-0 z-40 transition-colors duration-[var(--dur-mid)]",
        scrolled
          ? "border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--canvas)_88%,transparent)] backdrop-blur-md"
          : "border-b border-transparent bg-[var(--canvas)]",
      )}
    >
      <div className="shell flex h-[68px] items-center justify-between gap-4">
        <Wordmark />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {primaryNav.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "rounded-md px-3 py-2 text-[0.95rem] transition-colors duration-[var(--dur-fast)]",
                  active
                    ? "text-ink"
                    : "text-ink-soft hover:text-ink hover:bg-black/[0.03]",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/sign-in"
            className="rounded-md px-3 py-2 text-[0.95rem] text-ink-soft transition-colors hover:text-ink"
          >
            Sign In
          </Link>
          <ButtonLink href="/get-started" size="md">
            Start My Rescue
          </ButtonLink>
        </div>

        {/* Mobile: persistent CTA + menu trigger */}
        <div className="flex items-center gap-2 lg:hidden">
          <ButtonLink
            href="/get-started"
            size="md"
            className="text-[0.85rem] px-3"
          >
            Start
          </ButtonLink>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="grid h-11 w-11 place-items-center rounded-md text-ink ring-1 ring-[var(--border-strong)]"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            {open ? <MenuIconClosed /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-menu"
          className="lg:hidden border-t border-[var(--border)] bg-[var(--canvas)]"
        >
          <nav aria-label="Primary" className="shell flex flex-col gap-1 py-4">
            {primaryNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="rounded-md px-3 py-3 text-[1.05rem] text-ink hover:bg-black/[0.04]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/faq"
              onClick={close}
              className="rounded-md px-3 py-3 text-[1.05rem] text-ink hover:bg-black/[0.04]"
            >
              FAQ
            </Link>
            <Link
              href="/sign-in"
              onClick={close}
              className="rounded-md px-3 py-3 text-[1.05rem] text-ink hover:bg-black/[0.04]"
            >
              Sign In
            </Link>
            <div className="mt-2">
              <ButtonLink
                href="/get-started"
                size="lg"
                className="w-full"
                onClick={close}
              >
                Start My Inbox Rescue
              </ButtonLink>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function MenuIconClosed() {
  return <CloseIcon />;
}
