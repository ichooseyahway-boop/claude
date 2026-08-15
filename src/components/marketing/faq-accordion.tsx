"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/config/faq";
import { cx } from "@/lib/cx";

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-paper">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                id={`faq-btn-${i}`}
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-[var(--surface-sunken)] sm:px-6"
              >
                <span className="text-[1.02rem] font-semibold text-ink">
                  {item.q}
                </span>
                <span
                  aria-hidden="true"
                  className={cx(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1 ring-[var(--border-strong)] transition-transform duration-[var(--dur-mid)]",
                    isOpen && "rotate-45 bg-ink text-paper ring-ink",
                  )}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 2v10M2 7h10"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
            </h3>
            <div
              id={`faq-panel-${i}`}
              role="region"
              aria-labelledby={`faq-btn-${i}`}
              hidden={!isOpen}
              className="px-5 pb-6 sm:px-6"
            >
              <p className="measure text-[0.98rem] leading-relaxed text-ink-soft">
                {item.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
