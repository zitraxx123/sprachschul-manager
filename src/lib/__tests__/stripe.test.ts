import { describe, it, expect, beforeEach } from "vitest";
import { planForPriceId, priceIdForPlan, statusKeepsPlan, isStripeConfigured } from "@/lib/stripe";

describe("stripe helpers", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_PRICE_STARTER = "price_s";
    process.env.STRIPE_PRICE_PROFESSIONAL = "price_p";
    delete process.env.STRIPE_PRICE_ENTERPRISE;
  });
  it("maps price ids to plans and back", () => {
    expect(priceIdForPlan("starter")).toBe("price_s");
    expect(priceIdForPlan("enterprise")).toBeNull();
    expect(planForPriceId("price_p")).toBe("professional");
    expect(planForPriceId("unknown")).toBeNull();
    expect(planForPriceId(null)).toBeNull();
  });
  it("keeps the plan for active, trialing and past_due only", () => {
    for (const s of ["active", "trialing", "past_due"]) expect(statusKeepsPlan(s)).toBe(true);
    for (const s of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) expect(statusKeepsPlan(s)).toBe(false);
  });
  it("is inactive without a secret key", () => {
    expect(isStripeConfigured()).toBe(false);
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    expect(isStripeConfigured()).toBe(true);
  });
});
