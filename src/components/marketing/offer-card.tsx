import { ButtonLink } from "@/components/shared/button";
import { Badge } from "@/components/shared/ui";
import { CheckIcon } from "@/components/shared/icons";
import { formatPrice, type Offer } from "@/lib/config/offers";
import { cx } from "@/lib/cx";

export function OfferCard({
  offer,
  featured = false,
}: {
  offer: Offer;
  featured?: boolean;
}) {
  const href = offer.purchasable
    ? `/get-started?offer=${offer.id}`
    : "/pricing#care";

  return (
    <div
      className={cx(
        "relative flex h-full flex-col rounded-[var(--radius-lg)] border bg-paper p-6 sm:p-8",
        featured
          ? "border-ink shadow-[var(--shadow-md)] ring-1 ring-ink/10"
          : "border-[var(--border)]",
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-ink px-3 py-1 text-[0.72rem] font-semibold text-paper">
          Recommended starting point
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[1.3rem] font-semibold text-ink">{offer.name}</h3>
          <p className="mt-1 text-[0.92rem] text-ink-soft">{offer.tagline}</p>
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="font-serif text-[2.6rem] leading-none text-ink tnum">
          {formatPrice({ priceUSD: offer.priceUSD, period: offer.period })}
        </span>
        <span className="text-[0.9rem] text-ink-faint">
          {offer.period === "one_time" ? "one time" : ""}
        </span>
      </div>

      {offer.deliveryWindow && (
        <p className="mt-3 text-[0.86rem] text-ink-soft">
          Delivered {offer.deliveryWindow}.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Badge tone="sky">
          {offer.limits.children} children
          {offer.limits.schools ? ` · ${offer.limits.schools} schools` : ""}
        </Badge>
        <Badge tone="neutral">
          {offer.limits.sourceItems} source items
          {offer.limits.sourceItemsWindow === "per_week" ? " / week" : ""}
        </Badge>
      </div>

      <ul className="mt-6 space-y-2.5">
        {offer.includes.map((inc) => (
          <li key={inc} className="flex items-start gap-2.5">
            <CheckIcon
              size={18}
              className="mt-0.5 shrink-0 text-[var(--sage)]"
            />
            <span className="text-[0.94rem] leading-snug text-ink-soft">
              {inc}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 pt-2">
        {offer.purchasable ? (
          <ButtonLink
            href={href}
            variant={featured ? "primary" : "secondary"}
            size="lg"
            className="w-full"
            withArrow
          >
            {offer.cta}
          </ButtonLink>
        ) : (
          <p className="rounded-md border border-dashed border-[var(--border-strong)] px-4 py-3 text-center text-[0.86rem] text-ink-soft">
            Continues after your rescue — available with the family portal.
          </p>
        )}
      </div>
    </div>
  );
}
