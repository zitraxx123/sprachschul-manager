import { headers } from "next/headers";

/** Public origin of the current request (works behind Vercel's proxy). */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  return h.get("origin") || `${proto}://${host}`;
}
