import { describe, it, expect, vi } from "vitest";
import { isBillingComplete, generateInvoicesCore } from "@/lib/invoice-generation";
import type { Organization } from "@/types/database";

const org = {
  id: "o1", address_street: "Str 1", address_zip: "10115", address_city: "Berlin", tax_number: "12/345",
  vat_id: null, invoice_vat_rate: 19, invoice_payment_days: 14,
} as unknown as Organization;

function fakeSupabase(students: unknown[], invoices: unknown[] = [], payments: unknown[] = []) {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const result = (table: string) => (table === "students" ? students : table === "invoices" ? invoices : payments);
  const from = (table: string) => {
    const q: Record<string, unknown> = {};
    let window: [number, number] | null = null;
    const chain = () => q;
    for (const m of ["select", "eq", "neq", "order"]) q[m] = chain;
    // like PostgREST: a range returns only that slice (the real server also caps one request at 1000 rows)
    q.range = (from: number, to: number) => {
      window = [from, to];
      return q;
    };
    q.upsert = upsert;
    q.then = (res: (v: unknown) => void) => {
      const rows = result(table);
      res({ data: window ? rows.slice(window[0], window[1] + 1) : rows, error: null });
    };
    return q;
  };
  return { client: { from, rpc } as never, rpc, upsert };
}

const student = (over: Record<string, unknown> = {}) => ({
  id: "s1", first_name: "Max", last_name: "Muster", parent_name: null, custom_monthly_price: null,
  student_courses: [{ status: "active", contract_start: null, contract_end: null, courses: { name: "A1", monthly_price: 100 } }],
  ...over,
});

describe("isBillingComplete", () => {
  it("needs address and a tax number or VAT id", () => {
    expect(isBillingComplete(org)).toBe(true);
    expect(isBillingComplete({ ...org, tax_number: null } as Organization)).toBe(false);
    expect(isBillingComplete({ ...org, tax_number: null, vat_id: "DE123" } as Organization)).toBe(true);
    expect(isBillingComplete({ ...org, address_city: " " } as Organization)).toBe(false);
  });
});

describe("generateInvoicesCore", () => {
  it("refuses when billing data is incomplete", async () => {
    const { client } = fakeSupabase([]);
    const r = await generateInvoicesCore({ supabase: client, org: { ...org, tax_number: null } as Organization, monthYear: "2026-11", rpc: "create_invoice" });
    expect(r.errorCode).toBe("billingIncomplete");
  });
  it("creates an invoice with VAT and rounds to cents", async () => {
    const { client, rpc, upsert } = fakeSupabase([student({ student_courses: [{ status: "active", contract_start: null, contract_end: null, courses: { name: "A1", monthly_price: 99.99 } }] })]);
    const r = await generateInvoicesCore({ supabase: client, org, monthYear: "2026-11", rpc: "create_invoice" });
    expect(r).toMatchObject({ created: 1, skipped: 0, failed: 0 });
    const args = rpc.mock.calls[0][1];
    expect(args).toMatchObject({ p_net: 99.99, p_vat_amount: 19, p_total: 118.99, p_status: "open" });
    expect(upsert).toHaveBeenCalled();
  });
  it("prefers the custom monthly price (one item)", async () => {
    const { client, rpc } = fakeSupabase([student({ custom_monthly_price: 50 })]);
    await generateInvoicesCore({ supabase: client, org: { ...org, invoice_vat_rate: 0 } as Organization, monthYear: "2026-11", rpc: "create_invoice" });
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_net: 50, p_total: 50 });
    expect(rpc.mock.calls[0][1].p_items).toHaveLength(1);
  });
  it("skips already invoiced students, inactive or out-of-contract enrollments", async () => {
    const students = [
      student({ id: "s1" }),
      student({ id: "s2", student_courses: [{ status: "waitlist", contract_start: null, contract_end: null, courses: { name: "A1", monthly_price: 100 } }] }),
      student({ id: "s3", student_courses: [{ status: "active", contract_start: null, contract_end: "2026-10-31", courses: { name: "A1", monthly_price: 100 } }] }),
      student({ id: "s4" }),
    ];
    const { client, rpc } = fakeSupabase(students, [{ student_id: "s1" }]);
    const r = await generateInvoicesCore({ supabase: client, org, monthYear: "2026-11", rpc: "create_invoice" });
    expect(r).toMatchObject({ created: 1, skipped: 3 });
    expect(rpc.mock.calls[0][1].p_student).toBe("s4");
  });
  it("bills every student when there are more than 1000 (one request returns at most 1000 rows)", async () => {
    const many = Array.from({ length: 1205 }, (_, i) => student({ id: `s${i}` }));
    const { client, rpc } = fakeSupabase(many);
    const r = await generateInvoicesCore({ supabase: client, org, monthYear: "2026-11", rpc: "create_invoice" });
    expect(r).toMatchObject({ created: 1205, failed: 0 });
    expect(rpc).toHaveBeenCalledTimes(1205);
  });
  it("marks the invoice paid when the month is already paid", async () => {
    const { client, rpc } = fakeSupabase([student()], [], [{ student_id: "s1", is_paid: true }]);
    await generateInvoicesCore({ supabase: client, org, monthYear: "2026-11", rpc: "create_invoice" });
    expect(rpc.mock.calls[0][1].p_status).toBe("paid");
  });
});
