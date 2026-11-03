import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { berlinToday, generateInvoicesCore } from "@/lib/invoice-generation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Monthly cron job (see vercel.json): creates the invoices of the current month for every
 * organization that enabled automatic invoicing. Vercel calls it with "Authorization: Bearer $CRON_SECRET".
 * Running it more than once is harmless: students that already have an invoice are skipped.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, { status: 500 });
  }

  const monthYear = berlinToday().slice(0, 7);

  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("auto_invoice_enabled", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];
  for (const org of organizations || []) {
    try {
      const res = await generateInvoicesCore({ supabase, org, monthYear, rpc: "create_invoice_system" });
      results.push({
        organizationId: org.id,
        created: res.created,
        skipped: res.skipped,
        failed: res.failed,
        error: res.errorCode ? `${res.errorCode}${res.detail ? `: ${res.detail}` : ""}` : undefined,
      });
    } catch (e) {
      results.push({
        organizationId: org.id,
        created: 0,
        skipped: 0,
        failed: 0,
        error: e instanceof Error ? e.message : "unknown error",
      });
    }
  }

  return NextResponse.json({ month: monthYear, organizations: results.length, results });
}
