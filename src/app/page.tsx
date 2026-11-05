import Link from "next/link";
import { Geologica, Manrope } from "next/font/google";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, getCurrentTeacher, getCurrentMembership } from "@/lib/supabase/server";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  Banknote,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  Hourglass,
  Landmark,
  Mail,
  Receipt,
  ShieldCheck,
  Smartphone,
  UserCog,
  Check,
} from "lucide-react";

const display = Geologica({ subsets: ["latin", "cyrillic"], variable: "--font-display", display: "swap" });
const body = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-body", display: "swap" });

const CONTACT_EMAIL = "studiowebnord@gmail.com";

export async function generateMetadata() {
  const t = await getTranslations("landing");
  return { title: t("meta_title"), description: t("meta_description") };
}

type Kind = "language" | "dance" | "music";

const KIND_STYLE: Record<Kind, string> = {
  language: "bg-[#CFE6D9] text-[#13201B]",
  dance: "bg-[#F3C63D] text-[#13201B]",
  music: "bg-[#F2A98E] text-[#13201B]",
};

// Illustrative week plan for the hero board (course names come from the translations)
const WEEK: Array<Array<{ time: string; course: "c1" | "c2" | "c3" | "c4" | "c5"; room: number; kind: Kind; clash?: boolean }>> = [
  [
    { time: "16:00", course: "c1", room: 1, kind: "language" },
    { time: "18:00", course: "c4", room: 2, kind: "dance" },
  ],
  [{ time: "17:00", course: "c3", room: 2, kind: "music", clash: true }],
  [
    { time: "16:00", course: "c2", room: 1, kind: "language" },
    { time: "18:00", course: "c5", room: 2, kind: "music" },
  ],
  [{ time: "17:00", course: "c1", room: 1, kind: "language" }],
  [{ time: "16:00", course: "c4", room: 2, kind: "dance" }],
];

const GROUPS = [
  {
    id: "g1",
    items: [
      { key: "schedule", icon: CalendarDays },
      { key: "attendance", icon: ClipboardCheck },
      { key: "shifts", icon: CalendarClock },
      { key: "waitlist", icon: Hourglass },
    ],
  },
  {
    id: "g2",
    items: [
      { key: "plans", icon: Banknote },
      { key: "invoices", icon: Receipt },
      { key: "sepa", icon: Landmark },
      { key: "payroll", icon: Banknote },
      { key: "export", icon: FileSpreadsheet },
    ],
  },
  {
    id: "g3",
    items: [
      { key: "portal", icon: GraduationCap },
      { key: "assistant", icon: UserCog },
      { key: "privacy", icon: ShieldCheck },
      { key: "devices", icon: Smartphone },
    ],
  },
] as const;

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F4A3D] dark:focus-visible:outline-[#F3C63D]";
const BTN_PRIMARY = `inline-flex items-center justify-center gap-2 rounded-lg bg-[#F3C63D] px-6 h-12 text-base font-semibold text-[#13201B] hover:bg-[#E6B72A] transition-colors ${FOCUS}`;
const BTN_SECONDARY = `inline-flex items-center justify-center gap-2 rounded-lg border border-[#13201B]/25 dark:border-white/25 px-6 h-12 text-base font-medium text-[#13201B] dark:text-[#E7ECE4] hover:bg-[#13201B]/5 dark:hover:bg-white/10 transition-colors ${FOCUS}`;

export default async function HomePage() {
  const [t, user] = await Promise.all([getTranslations("landing"), getCurrentUser()]);
  const teacher = user ? await getCurrentTeacher() : null;
  const membership = user ? await getCurrentMembership() : null;
  const isTeacher = !!(teacher && membership?.role === "teacher");
  const portalHref = isTeacher ? "/my-portal" : "/dashboard";
  const mailHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t("help_mailSubject"))}`;
  const days = ["d1", "d2", "d3", "d4", "d5"] as const;

  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-[#F5F6F1] dark:bg-[#0E1713] text-[#13201B] dark:text-[#E7ECE4] selection:bg-[#F3C63D] selection:text-[#13201B] flex flex-col`}
      style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#13201B]/10 dark:border-white/10 bg-[#F5F6F1]/90 dark:bg-[#0E1713]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" className={`flex items-center gap-2 rounded-md ${FOCUS}`}>
            <span className="w-8 h-8 rounded-md bg-[#1F4A3D] text-[#F3C63D] flex items-center justify-center">
              <GraduationCap strokeWidth={1.5} className="w-5 h-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Klasswerk
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#13201B]/75 dark:text-[#E7ECE4]/75">
            <a href="#funktionen" className="hover:text-[#13201B] dark:hover:text-white">{t("nav_features")}</a>
            <a href="#kostenlos" className="hover:text-[#13201B] dark:hover:text-white">{t("nav_free")}</a>
            <a href="#hilfe" className="hover:text-[#13201B] dark:hover:text-white">{t("nav_help")}</a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <Link href={portalHref} className={`inline-flex items-center rounded-lg bg-[#1F4A3D] px-4 h-10 text-sm font-semibold text-white hover:bg-[#173A30] ${FOCUS}`}>
                {t("nav_dashboard")}
              </Link>
            ) : (
              <>
                <Link href="/login" className={`hidden sm:inline-flex items-center rounded-lg px-3 h-10 text-sm font-medium hover:bg-[#13201B]/5 dark:hover:bg-white/10 ${FOCUS}`}>
                  {t("nav_login")}
                </Link>
                <Link href="/login" className={`inline-flex items-center rounded-lg bg-[#1F4A3D] px-4 h-10 text-sm font-semibold text-white hover:bg-[#173A30] dark:bg-[#F3C63D] dark:text-[#13201B] dark:hover:bg-[#E6B72A] ${FOCUS}`}>
                  {t("nav_start")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-16 md:pt-20 md:pb-24 grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-14 items-center">
          <div>
            <h1
              className="text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold tracking-tight leading-[1.08]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("hero_title")}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[#13201B]/75 dark:text-[#E7ECE4]/75 max-w-[34rem]">
              {t("hero_subtitle")}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/login" className={BTN_PRIMARY}>
                {t("hero_ctaPrimary")}
              </Link>
              <a href={mailHref} className={BTN_SECONDARY}>
                <Mail strokeWidth={1.5} className="w-5 h-5" />
                {t("hero_ctaSecondary")}
              </a>
            </div>
            <p className="mt-4 text-sm text-[#13201B]/60 dark:text-[#E7ECE4]/60">{t("hero_fine")}</p>
          </div>

          {/* The board: an illustrative week plan, one booking clash is prevented */}
          <div>
            <div className="rounded-2xl bg-[#1F4A3D] dark:bg-[#16342B] text-[#E7EFE6] p-4 sm:p-6 shadow-xl ring-1 ring-black/10">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/15">
                <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  {t("mock_title")}
                </span>
                <CalendarDays strokeWidth={1.5} className="w-4 h-4 text-[#F3C63D]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-x-2 gap-y-4">
                {WEEK.map((slots, i) => (
                  <div key={days[i]} className="space-y-2 min-w-0">
                    <div className="text-xs font-semibold text-[#E7EFE6]/70">{t(`mock_days_${days[i]}`)}</div>
                    {slots.map((s) => (
                      <div
                        key={s.time + s.course}
                        className={`rounded-md px-2 py-1.5 text-[11px] leading-tight ${KIND_STYLE[s.kind]} ${
                          s.clash ? "ring-2 ring-offset-2 ring-offset-[#1F4A3D] dark:ring-offset-[#16342B] ring-white" : ""
                        }`}
                      >
                        <div className="font-bold">{s.time}</div>
                        <div className="font-semibold truncate">{t(`mock_courses_${s.course}`)}</div>
                        <div className="opacity-75">{t("mock_room", { n: s.room })}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-sm text-[#13201B]/75 dark:text-[#E7ECE4]/75 max-w-md border-l-4 border-[#F3C63D] pl-3">
              {t("mock_note")}
            </p>
          </div>
        </section>

        {/* Audience */}
        <section className="border-y border-[#13201B]/10 dark:border-white/10">
          <p className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-sm sm:text-base text-[#13201B]/75 dark:text-[#E7ECE4]/75">
            {t("audience")}
          </p>
        </section>

        {/* Features: three groups, divided by rules, not cards */}
        <section id="funktionen" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 scroll-mt-20">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight max-w-xl" style={{ fontFamily: "var(--font-display)" }}>
            {t("features_title")}
          </h2>
          <div className="mt-12 grid md:grid-cols-3 gap-10 md:gap-0 md:divide-x divide-[#13201B]/12 dark:divide-white/12">
            {GROUPS.map((g) => (
              <div key={g.id} className="md:px-8 md:first:pl-0 md:last:pr-0">
                <h3 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  {t(`features_${g.id}_title`)}
                </h3>
                <ul className="mt-5 space-y-5">
                  {g.items.map((it) => {
                    const Icon = it.icon;
                    return (
                      <li key={it.key} className="flex gap-3">
                        <Icon strokeWidth={1.5} className="w-5 h-5 mt-0.5 shrink-0 text-[#1F4A3D] dark:text-[#F3C63D]" />
                        <div>
                          <div className="font-semibold text-[15px]">{t(`features_${g.id}_items_${it.key}_t`)}</div>
                          <div className="text-sm leading-relaxed text-[#13201B]/70 dark:text-[#E7ECE4]/70">
                            {t(`features_${g.id}_items_${it.key}_d`)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Free */}
        <section id="kostenlos" className="bg-[#1F4A3D] dark:bg-[#16342B] text-[#E7EFE6] scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20 grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                {t("free_title")}
              </h2>
              <p className="mt-4 text-lg text-[#E7EFE6]/80 max-w-xl leading-relaxed">{t("free_body")}</p>
              <Link href="/login" className={`${BTN_PRIMARY} mt-8`}>
                {t("free_cta")}
              </Link>
            </div>
            <ul className="space-y-3">
              {(["p1", "p2", "p3"] as const).map((k) => (
                <li key={k} className="flex items-start gap-3 text-base">
                  <Check strokeWidth={2} className="w-5 h-5 mt-0.5 shrink-0 text-[#F3C63D]" />
                  <span>{t(`free_${k}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Personal help */}
        <section id="hilfe" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 grid md:grid-cols-2 gap-10 md:gap-16 scroll-mt-16">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              {t("help_title")}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#13201B]/75 dark:text-[#E7ECE4]/75 max-w-xl">{t("help_body")}</p>
          </div>
          <div className="space-y-6">
            <ul className="space-y-3">
              {(["h1", "h2", "h3"] as const).map((k) => (
                <li key={k} className="flex items-start gap-3">
                  <Check strokeWidth={2} className="w-5 h-5 mt-0.5 shrink-0 text-[#1F4A3D] dark:text-[#F3C63D]" />
                  <span>{t(`help_${k}`)}</span>
                </li>
              ))}
            </ul>
            <a href={mailHref} className={BTN_PRIMARY}>
              <Mail strokeWidth={1.5} className="w-5 h-5" />
              {t("help_cta")}
            </a>
            <p className="text-sm text-[#13201B]/60 dark:text-[#E7ECE4]/60 break-all">{CONTACT_EMAIL}</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#13201B]/10 dark:border-white/10 py-8 text-sm text-[#13201B]/65 dark:text-[#E7ECE4]/65">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>{t("footer_rights")}</span>
          <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
            <Link href="/impressum" className="hover:text-[#13201B] dark:hover:text-white">{t("footer_imprint")}</Link>
            <Link href="/datenschutz" className="hover:text-[#13201B] dark:hover:text-white">{t("footer_privacy")}</Link>
            <Link href="/login" className="hover:text-[#13201B] dark:hover:text-white">{t("footer_login")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
