import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useId } from "react";
import { cx } from "@/lib/cx";

/** Field wrapper: label, optional hint, error association (WCAG 2.2 §17). */
export function Field({
  label,
  hint,
  error,
  optional,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
  htmlFor?: string;
}) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-baseline justify-between gap-2 text-[0.92rem] font-medium text-ink"
      >
        <span>{label}</span>
        {optional && (
          <span className="text-[0.78rem] font-normal text-ink-faint">
            Optional
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="mt-1 text-[0.85rem] text-ink-soft">
          {hint}
        </p>
      )}
      <div className="mt-2">{children({ id, describedBy })}</div>
      {error && (
        <p
          id={errId}
          role="alert"
          className="mt-1.5 text-[0.85rem] font-medium text-[var(--coral)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

const controlBase =
  "w-full rounded-md border bg-canvas px-3.5 py-2.5 text-[0.98rem] text-ink " +
  "placeholder:text-ink-faint transition-colors duration-[var(--dur-fast)] " +
  "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-ink";

export function TextInput({
  invalid,
  className,
  ...props
}: { invalid?: boolean } & ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cx(
        controlBase,
        invalid
          ? "border-[var(--coral)] bg-[color-mix(in_srgb,var(--coral-soft)_35%,var(--canvas))]"
          : "border-[var(--border-strong)]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  invalid,
  className,
  ...props
}: { invalid?: boolean } & ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={cx(
        controlBase,
        "min-h-[92px] resize-y",
        invalid ? "border-[var(--coral)]" : "border-[var(--border-strong)]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...props
}: { invalid?: boolean } & ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={cx(
        controlBase,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 fill=%22none%22 stroke=%22%2317233D%22 stroke-width=%221.6%22 stroke-linecap=%22round%22><path d=%22M3 5l4 4 4-4%22/></svg>')] bg-[right_0.9rem_center] bg-no-repeat pr-10",
        invalid ? "border-[var(--coral)]" : "border-[var(--border-strong)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/** Accessible checkbox with a generous touch target. */
export function Checkbox({
  label,
  className,
  ...props
}: { label: ReactNode } & ComponentPropsWithoutRef<"input">) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cx(
        "flex cursor-pointer items-start gap-3 rounded-md p-1 text-[0.94rem] text-ink-soft",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-[var(--border-strong)] text-ink accent-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}

/** Selectable card used for radio-style single choice. */
export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description?: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cx(
        "flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-4 transition-colors duration-[var(--dur-fast)]",
        checked
          ? "border-ink bg-[var(--surface-sunken)] ring-1 ring-ink/15"
          : "border-[var(--border-strong)] hover:bg-black/[0.02]",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      />
      <span>
        <span className="block text-[0.96rem] font-medium text-ink">
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-[0.85rem] text-ink-soft">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
