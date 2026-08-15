import "server-only";
import type { Order } from "@/lib/database/types";
import { site } from "@/lib/config/site";
import { getOffer } from "@/lib/config/offers";

/**
 * Branded transactional emails matching the product system (§9.1A "beautiful
 * transactional emails"). Table-based, inline styles for broad client support.
 */

const C = {
  canvas: "#F7F4EE",
  paper: "#FFFDF9",
  ink: "#17233D",
  inkSoft: "#3d485f",
  sage: "#526B61",
  gold: "#C7A45C",
  border: "#DDD8CF",
};

function formatMoney(order: Order): string {
  if (order.amount_total == null || !order.currency) return "";
  const amount = (order.amount_total / 100).toLocaleString("en-US", {
    style: "currency",
    currency: order.currency.toUpperCase(),
  });
  return amount;
}

function layout(opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footerNote?: string;
}): string {
  const cta = opts.cta
    ? `<tr><td style="padding:8px 0 4px;">
         <a href="${opts.cta.url}" style="display:inline-block;background:${C.ink};color:${C.paper};text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:8px;">${opts.cta.label}</a>
       </td></tr>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:${C.canvas};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.ink};">
<span style="display:none;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${opts.preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas};padding:32px 16px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.paper};border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
    <tr><td style="padding:26px 32px 0;">
      <span style="font-size:17px;font-weight:700;letter-spacing:-0.01em;color:${C.ink};">${site.wordmark}</span>
      <span style="font-size:12px;color:${C.sage};font-weight:600;letter-spacing:0.04em;text-transform:uppercase;margin-left:8px;">Human-verified</span>
    </td></tr>
    <tr><td style="padding:22px 32px 6px;">
      <h1 style="margin:0;font-size:23px;line-height:1.2;color:${C.ink};">${opts.heading}</h1>
    </td></tr>
    <tr><td style="padding:6px 32px 8px;font-size:15px;line-height:1.65;color:${C.inkSoft};">
      ${opts.bodyHtml}
    </td></tr>
    <tr><td style="padding:8px 32px 26px;">
      <table role="presentation" cellpadding="0" cellspacing="0">${cta}</table>
    </td></tr>
    <tr><td style="padding:18px 32px;border-top:1px solid ${C.border};font-size:12px;line-height:1.6;color:#8a8577;">
      ${opts.footerNote ?? ""}
      <div style="margin-top:8px;">${site.name} — not operated by your child’s school or district.</div>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

export function customerConfirmationEmail(order: Order, onboardingUrl: string) {
  const offer = getOffer(order.offer_id as never);
  const price = formatMoney(order);
  const subject = `Your ${offer.name} is confirmed — one quick step left`;
  const bodyHtml = `
    <p style="margin:0 0 12px;">Thank you — your payment${price ? ` of <strong>${price}</strong>` : ""} is confirmed.</p>
    <p style="margin:0 0 12px;">There’s one quick step before we begin: a short onboarding (under 10 minutes) where you add your children and tell us what to expect. Your delivery clock starts once we receive your materials.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;background:#F1EDE5;border-radius:10px;">
      <tr><td style="padding:14px 16px;font-size:14px;color:${C.inkSoft};">
        <strong style="color:${C.ink};">${offer.name}</strong><br/>
        Up to ${offer.limits.children} children · ${offer.limits.sourceItems} source items<br/>
        Delivered ${offer.deliveryWindow ?? "24–48 business hours after materials arrive"}.
      </td></tr>
    </table>`;
  const text = `Your ${offer.name} is confirmed${price ? ` (${price})` : ""}.

One quick step left: complete your onboarding (under 10 minutes) and add your children.
${onboardingUrl}

Delivered ${offer.deliveryWindow ?? "24–48 business hours after we receive your materials"}.

— ${site.name}`;
  return {
    subject,
    html: layout({
      preheader: "You're confirmed. Complete your quick onboarding to begin.",
      heading: "You're confirmed. One quick step left.",
      bodyHtml,
      cta: { label: "Complete my onboarding", url: onboardingUrl },
      footerNote: `Questions? Reply to this email or contact ${site.supportEmail}.`,
    }),
    text,
  };
}

export function opsPaidOrderEmail(order: Order, opsUrl: string) {
  const offer = getOffer(order.offer_id as never);
  const price = formatMoney(order);
  const subject = `New paid order — ${offer.name}${price ? ` (${price})` : ""}`;
  const bodyHtml = `
    <p style="margin:0 0 12px;">A new order has been paid and is awaiting materials.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;background:#F1EDE5;border-radius:10px;">
      <tr><td style="padding:14px 16px;font-size:14px;color:${C.inkSoft};">
        <strong style="color:${C.ink};">${offer.name}</strong><br/>
        Order: ${order.id}<br/>
        Customer: ${order.customer_email ?? "—"}<br/>
        Amount: ${price || "—"}<br/>
        Onboarding: ${order.onboarding_status}
      </td></tr>
    </table>`;
  const text = `New paid order — ${offer.name}${price ? ` (${price})` : ""}
Order: ${order.id}
Customer: ${order.customer_email ?? "—"}
Onboarding: ${order.onboarding_status}
Open ops: ${opsUrl}`;
  return {
    subject,
    html: layout({
      preheader: "A new paid order is awaiting materials.",
      heading: "New paid order awaiting materials",
      bodyHtml,
      cta: { label: "Open operations", url: opsUrl },
    }),
    text,
  };
}
