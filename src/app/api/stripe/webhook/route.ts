import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, planForPriceId, statusKeepsPlan } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook: keeps organizations.plan in sync with the subscription.
 * Events: checkout.session.completed, customer.subscription.created|updated|deleted
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !process.env.STRIPE_SECRET_KEY || !signature) {
    return new NextResponse("Not configured", { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(body, signature, secret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const admin = createAdminClient();

  async function findOrgId(customerId: string | null, metadataOrgId?: string | null): Promise<string | null> {
    if (customerId) {
      const { data } = await admin.from("organizations").select("id").eq("stripe_customer_id", customerId).maybeSingle();
      if (data) return data.id;
    }
    return metadataOrgId || null;
  }

  async function applySubscription(sub: Stripe.Subscription) {
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const orgId = await findOrgId(customerId, sub.metadata?.organization_id);
    if (!orgId) return;

    const priceId = sub.items.data[0]?.price?.id;
    const plan = statusKeepsPlan(sub.status) ? planForPriceId(priceId) : null;

    const { error } = await admin
      .from("organizations")
      .update({
        plan: plan ?? "free",
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.status === "canceled" ? null : sub.id,
        subscription_status: sub.status,
      })
      .eq("id", orgId);
    if (error) throw new Error(error.message);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null;
        const orgId = session.client_reference_id;
        if (orgId && customerId) {
          await admin.from("organizations").update({ stripe_customer_id: customerId }).eq("id", orgId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook failed:", err);
    // 500 makes Stripe retry the event
    return new NextResponse("Webhook handler failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
