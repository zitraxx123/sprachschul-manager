import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { getActiveOrganization } from "@/lib/supabase/server";
import { applyTerminology, isOrgType } from "@/lib/terminology";

export const locales = ["de", "en", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "de";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = locales.includes(localeCookie as Locale)
    ? (localeCookie as Locale)
    : defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default;

  // Terminology depends on the type of institution (only for signed-in users)
  const hasSession = cookieStore.getAll().some((c) => c.name.startsWith("sb-"));
  if (hasSession) {
    try {
      const organization = await getActiveOrganization();
      if (organization && isOrgType(organization.org_type)) {
        return { locale, messages: applyTerminology(messages, locale, organization.org_type) };
      }
    } catch {
      // fall back to the default terms
    }
  }

  return { locale, messages };
});
