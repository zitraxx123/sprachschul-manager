import Stripe from "stripe";

/** Stripe is optional: without STRIPE_SECRET_KEY the billing UI stays hidden and nothing is called. */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export const PAID_PLANS = ["starter", "professional", "enterprise"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

/** Stripe price id for a plan, configured per environment (STRIPE_PRICE_STARTER, ...). */
export function priceIdForPlan(plan: string): string | null {
  const id = process.env[`STRIPE_PRICE_${plan.toUpperCase()}`];
  return id || null;
}

export function planForPriceId(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null;
  return PAID_PLANS.find((p) => priceIdForPlan(p) === priceId) ?? null;
}

/** Subscription statuses that keep the paid plan active (past_due = grace period while Stripe retries). */
export function statusKeepsPlan(status: string): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

export const TRIAL_DAYS = 14;
