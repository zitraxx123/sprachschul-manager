"use server";

import { cookies } from "next/headers";
import { locales, Locale } from "@/i18n/request";

export async function setLocale(locale: string) {
  if (!locales.includes(locale as Locale)) {
    return { error: "Ungültige Sprache" };
  }

  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });

  return { success: true };
}
