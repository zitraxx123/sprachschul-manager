"use server";

import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestOrigin } from "@/lib/origin";
import { getStripe, isStripeConfigured, priceIdForPlan, PAID_PLANS, TRIAL_DAYS } from "@/lib/stripe";

export type BillingResult = {
  /** i18n key under "plan" */
  error?: string;
  url?: string;
};

async function requireOwnerOrg() {
  const [organization, membership] = await Promise.all([getActiveOrganization(), getCurrentMembership()]);
  if (!organization || !membership || !["owner", "admin"].includes(membership.role)) return null;
  return organization;
}

/** Starts a Stripe Checkout for the chosen plan (14 days trial for schools that never had a subscription). */
export async function startCheckout(plan: string): Promise<BillingResult> {
  if (!isStripeConfigured()) return { error: "billingNotConfigured" };
  if (!(PAID_PLANS as readonly string[]).includes(plan)) return { error: "billingFailed" };
  const priceId = priceIdForPlan(plan);
  if (!priceId) return { error: "billingNotConfigured" };

  const organization = await requireOwnerOrg();
  if (!organization) return { error: "billingForbidden" };

  try {
    const stripe = getStripe();
    const admin = createAdminClient();
    const origin = await getRequestOrigin();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let customerId = organization.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: organization.name,
        email: user?.email || undefined,
        metadata: { organization_id: organization.id },
      });
      customerId = customer.id;
      await admin.from("organizations").update({ stripe_customer_id: customerId }).eq("id", organization.id);
    }

    const hadSubscription = !!organization.stripe_subscription_id;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: organization.id,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { organization_id: organization.id },
        ...(hadSubscription ? {} : { trial_period_days: TRIAL_DAYS }),
      },
      allow_promotion_codes: true,
      success_url: `${origin}/settings?billing=success`,
      cancel_url: `${origin}/settings`,
    });
    return session.url ? { url: session.url } : { error: "billingFailed" };
  } catch (err) {
    console.error("startCheckout failed:", err);
    return { error: "billingFailed" };
  }
}

/** Stripe customer portal: change plan, update payment method, cancel, download invoices. */
export async function openBillingPortal(): Promise<BillingResult> {
  if (!isStripeConfigured()) return { error: "billingNotConfigured" };
  const organization = await requireOwnerOrg();
  if (!organization) return { error: "billingForbidden" };
  if (!organization.stripe_customer_id) return { error: "billingFailed" };

  try {
    const origin = await getRequestOrigin();
    const session = await getStripe().billingPortal.sessions.create({
      customer: organization.stripe_customer_id,
      return_url: `${origin}/settings`,
    });
    return { url: session.url };
  } catch (err) {
    console.error("openBillingPortal failed:", err);
    return { error: "billingFailed" };
  }
}
