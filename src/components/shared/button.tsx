import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@/lib/cx";
import { ArrowRightIcon } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-md " +
  "transition-[background-color,color,box-shadow,transform] duration-[var(--dur-fast)] " +
  "ease-[var(--ease-standard)] focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-ink active:translate-y-px disabled:opacity-55 " +
  "disabled:pointer-events-none select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-paper shadow-[var(--shadow-sm)] hover:bg-[#20304f] " +
    "hover:shadow-[var(--shadow-md)]",
  secondary:
    "bg-paper text-ink ring-1 ring-[var(--border-strong)] hover:bg-[var(--surface-sunken)] " +
    "hover:ring-ink/30",
  ghost: "bg-transparent text-ink hover:bg-black/[0.04]",
  danger:
    "bg-coral text-paper hover:bg-[#b9553f] shadow-[var(--shadow-sm)] " +
    "hover:shadow-[var(--shadow-md)]",
};

const sizes: Record<Size, string> = {
  // ≥44px touch targets (PRD §17).
  md: "text-[0.95rem] px-4 py-2.5 min-h-[44px]",
  lg: "text-[1.02rem] px-6 py-3.5 min-h-[52px]",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  withArrow?: boolean;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  withArrow = false,
  className,
  children,
  ...props
}: CommonProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={cx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
      {withArrow && <ArrowRightIcon size={18} className="-mr-0.5" />}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  withArrow = false,
  className,
  children,
  ...props
}: CommonProps & { href: string } & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    "href" | "className"
  >) {
  return (
    <Link
      href={href}
      className={cx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
      {withArrow && <ArrowRightIcon size={18} className="-mr-0.5" />}
    </Link>
  );
}
