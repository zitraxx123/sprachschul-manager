import Link from "next/link";
import { Inter, Manrope } from "next/font/google";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, getCurrentTeacher, getCurrentMembership } from "@/lib/supabase/server";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Reveal } from "@/components/landing/reveal";
import { HeroBackdrop } from "@/components/landing/hero-backdrop";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { HubDiagram } from "@/components/landing/hub-diagram";
import { ParticleField } from "@/components/landing/particle-field";
import { ProductShowcase } from "@/components/landing/product-showcase";
import {
  Check,
  ChevronDown,
  GraduationCap,
  History,
  KeyRound,
  Lock,
  Mail,
  Server,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";

const heading = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-heading", display: "swap" });
const body = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-body", display: "swap" });

const CONTACT_EMAIL = "studiowebnord@gmail.com";

export async function generateMetadata() {
  const t = await getTranslations("landing");
  return { title: t("meta_title"), description: t("meta_description") };
}

const TRUST = [
  { id: "eu", icon: Server },
  { id: "gdpr", icon: ShieldCheck },
  { id: "iso", icon: Users },
  { id: "tls", icon: Lock },
] as const;

const SECURITY = [
  { id: "eu", icon: Server },
  { id: "isolation", icon: Users },
  { id: "roles", icon: UserCog },
  { id: "log", icon: History },
  { id: "gdpr", icon: ShieldCheck },
  { id: "login", icon: KeyRound },
] as const;

const STEPS = ["s1", "s2", "s3", "s4"] as const;
const FAQ = ["1", "2", "3", "4", "5", "6"] as const;

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BFF]";
const BTN_PRIMARY = `inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#7A73FF] px-7 h-12 text-base font-semibold text-white shadow-[0_8px_20px_-6px_rgba(99,91,255,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(99,91,255,0.7)] ${FOCUS}`;
const BTN_SECONDARY = `inline-flex items-center justify-center gap-2 rounded-xl border border-[#D5DBE5] dark:border-white/25 bg-white dark:bg-white/5 px-7 h-12 text-base font-semibold text-[#0A2540] dark:text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#635BFF] hover:shadow-md ${FOCUS}`;
const SECTION_TITLE = "text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A2540] dark:text-white";
const LEAD = "mt-3 text-lg leading-relaxed text-[#425466] dark:text-white/70";
const CARD =
  "h-full rounded-2xl border border-[#E3E8EE] dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#635BFF]/10";
const ICON_BOX =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#635BFF] to-[#00C2FF] text-white";

export default async function HomePage() {
  const [t, user] = await Promise.all([getTranslations("landing"), getCurrentUser()]);
  const teacher = user ? await getCurrentTeacher() : null;
  const membership = user ? await getCurrentMembership() : null;
  const isTeacher = !!(teacher && membership?.role === "teacher");
  const portalHref = isTeacher ? "/my-portal" : "/dashboard";
  const mailHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t("help_mailSubject"))}`;

  return (
    <div
      className={`${heading.variable} ${body.variable} flex min-h-screen flex-col bg-[#F6F9FC] text-[#0A2540] selection:bg-[#635BFF] selection:text-white dark:bg-[#0A1220] dark:text-white`}
      style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#E3E8EE]/80 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#0A1220]/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className={`flex items-center gap-2 rounded-md ${FOCUS}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#635BFF] to-[#00C2FF] text-white">
              <GraduationCap strokeWidth={1.5} className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              Klasswerk
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-[#425466] dark:text-white/70 md:flex">
            {[
              ["#funktionen", "nav_features"],
              ["#sicherheit", "nav_security"],
              ["#kostenlos", "nav_free"],
              ["#hilfe", "nav_help"],
            ].map(([href, key]) => (
              <a key={href} href={href} className="transition-colors duration-200 hover:text-[#635BFF] dark:hover:text-white">
                {t(key)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <Link href={portalHref} className={`inline-flex h-10 items-center rounded-lg bg-[#635BFF] px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#5249E6] ${FOCUS}`}>
                {t("nav_dashboard")}
              </Link>
            ) : (
              <>
                <Link href="/login" className={`hidden h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors duration-200 hover:bg-[#635BFF]/10 sm:inline-flex ${FOCUS}`}>
                  {t("nav_login")}
                </Link>
                <Link href="/login" className={`inline-flex h-10 items-center rounded-lg bg-[#635BFF] px-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#5249E6] hover:shadow-[0_0_24px_rgba(99,91,255,0.6)] ${FOCUS}`}>
                  {t("nav_start")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <HeroBackdrop />
          <ParticleField />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1fr_1.05fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#635BFF]/20 bg-white/80 px-3 py-1 text-sm font-semibold text-[#635BFF] backdrop-blur dark:bg-white/10 dark:text-[#B4AFFF]">
                <Sparkles strokeWidth={1.5} className="h-4 w-4" />
                {t("hero_badge")}
              </span>
              <h1
                className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#0A2540] dark:text-white sm:text-5xl lg:text-[3.5rem]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {t("hero_title")}
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-[#425466] dark:text-white/75">{t("hero_subtitle")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className={BTN_PRIMARY}>
                  {t("hero_ctaPrimary")}
                </Link>
                <a href={mailHref} className={BTN_SECONDARY}>
                  <Mail strokeWidth={1.5} className="h-5 w-5" />
                  {t("hero_ctaSecondary")}
                </a>
              </div>
              <p className="mt-4 text-sm text-[#425466] dark:text-white/60">{t("hero_fine")}</p>
            </div>
            <HeroMockup />
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-y border-[#E3E8EE] bg-white dark:border-white/10 dark:bg-[#0D182B]">
          <ul className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {TRUST.map((it) => {
              const Icon = it.icon;
              return (
                <li key={it.id} className="flex items-start gap-3">
                  <Icon strokeWidth={1.5} className="mt-0.5 h-6 w-6 shrink-0 text-[#635BFF] dark:text-[#9C97FF]" />
                  <div>
                    <div className="text-[15px] font-semibold">{t(`trust_${it.id}_t`)}</div>
                    <div className="text-sm text-[#425466] dark:text-white/65">{t(`trust_${it.id}_d`)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mx-auto max-w-6xl px-4 pb-5 text-sm text-[#425466] dark:text-white/65 sm:px-6">{t("audience")}</p>
        </section>

        {/* How it works: animated scheme */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <Reveal>
            <h2 className={SECTION_TITLE} style={{ fontFamily: "var(--font-heading)" }}>
              {t("workflow_title")}
            </h2>
            <p className={`${LEAD} max-w-2xl`}>{t("workflow_intro")}</p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <div className="rounded-3xl border border-[#E3E8EE] bg-white p-5 shadow-[0_30px_60px_-30px_rgba(50,50,93,0.3)] dark:border-white/10 dark:bg-white/5 sm:p-8">
              <HubDiagram />
            </div>
          </Reveal>
        </section>

        {/* Product in detail: three interactive cards */}
        <section id="funktionen" className="scroll-mt-20 border-y border-[#E3E8EE] bg-white py-20 dark:border-white/10 dark:bg-[#0D182B] md:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <h2 className={SECTION_TITLE} style={{ fontFamily: "var(--font-heading)" }}>
                {t("showcase_title")}
              </h2>
              <p className={`${LEAD} max-w-2xl`}>{t("showcase_intro")}</p>
            </Reveal>
            <div className="mt-12">
              <ProductShowcase />
            </div>
          </div>
        </section>

        {/* Steps: a real sequence, so numbered */}
        <section className="border-y border-[#E3E8EE] bg-white dark:border-white/10 dark:bg-[#0D182B]">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Reveal>
              <h2 className={SECTION_TITLE} style={{ fontFamily: "var(--font-heading)" }}>
                {t("steps_title")}
              </h2>
            </Reveal>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((k, i) => (
                <li key={k}>
                  <Reveal delay={i * 0.08}>
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#635BFF] to-[#00C2FF] text-lg font-extrabold text-white"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {i + 1}
                    </span>
                    <div className="mt-4 text-lg font-bold">{t(`steps_${k}_t`)}</div>
                    <div className="mt-1 text-sm leading-relaxed text-[#425466] dark:text-white/70">{t(`steps_${k}_d`)}</div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Security and privacy */}
        <section id="sicherheit" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6 md:py-28">
          <Reveal>
            <h2 className={SECTION_TITLE} style={{ fontFamily: "var(--font-heading)" }}>
              {t("security_title")}
            </h2>
            <p className={`${LEAD} max-w-2xl`}>{t("security_intro")}</p>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SECURITY.map((it, i) => {
              const Icon = it.icon;
              return (
                <Reveal key={it.id} delay={(i % 3) * 0.08} className="h-full">
                  <div className={CARD}>
                    <span className={ICON_BOX}>
                      <Icon strokeWidth={1.5} className="h-5 w-5" />
                    </span>
                    <div className="mt-4 text-base font-bold">{t(`security_${it.id}_t`)}</div>
                    <p className="mt-1 text-sm leading-relaxed text-[#425466] dark:text-white/70">{t(`security_${it.id}_d`)}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <Link href="/datenschutz" className={`mt-8 inline-block text-sm font-semibold text-[#635BFF] underline underline-offset-4 transition-colors hover:text-[#4F46E5] dark:text-[#B4AFFF] ${FOCUS}`}>
            {t("security_link")}
          </Link>
        </section>

        {/* Free */}
        <section id="kostenlos" className="scroll-mt-16 bg-gradient-to-br from-[#4F46E5] via-[#635BFF] to-[#0099CC] text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1.2fr_1fr]">
            <Reveal>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
                {t("free_title")}
              </h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/85">{t("free_body")}</p>
              <Link
                href="/login"
                className={`mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-white px-7 text-base font-semibold text-[#4F46E5] shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(255,255,255,0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
              >
                {t("free_cta")}
              </Link>
            </Reveal>
            <Reveal delay={0.1}>
              <ul className="space-y-3">
                {(["p1", "p2", "p3"] as const).map((k) => (
                  <li key={k} className="flex items-start gap-3 text-base">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <Check strokeWidth={2.5} className="h-4 w-4" />
                    </span>
                    <span>{t(`free_${k}`)}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 pt-20 sm:px-6 md:pt-28">
          <Reveal>
            <h2 className={SECTION_TITLE} style={{ fontFamily: "var(--font-heading)" }}>
              {t("faq_title")}
            </h2>
          </Reveal>
          <div className="mt-8 space-y-3">
            {FAQ.map((n) => (
              <details key={n} className="group rounded-xl border border-[#E3E8EE] bg-white px-5 py-4 transition-shadow duration-300 open:shadow-md dark:border-white/10 dark:bg-white/5">
                <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded font-semibold ${FOCUS}`}>
                  <span>{t(`faq_q${n}`)}</span>
                  <ChevronDown strokeWidth={1.5} className="h-5 w-5 shrink-0 text-[#635BFF] transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="mt-3 leading-relaxed text-[#425466] dark:text-white/75">{t(`faq_a${n}`)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Personal help */}
        <section id="hilfe" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6 md:py-28">
          <Reveal>
            <div className="grid gap-10 rounded-3xl border border-[#E3E8EE] bg-white p-8 shadow-[0_30px_60px_-30px_rgba(50,50,93,0.25)] dark:border-white/10 dark:bg-white/5 md:grid-cols-2 md:gap-14 md:p-12">
              <div>
                <h2 className={SECTION_TITLE} style={{ fontFamily: "var(--font-heading)" }}>
                  {t("help_title")}
                </h2>
                <p className={`${LEAD} max-w-xl`}>{t("help_body")}</p>
              </div>
              <div className="space-y-6">
                <ul className="space-y-3">
                  {(["h1", "h2", "h3"] as const).map((k) => (
                    <li key={k} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#635BFF]/10 text-[#635BFF] dark:text-[#B4AFFF]">
                        <Check strokeWidth={2.5} className="h-4 w-4" />
                      </span>
                      <span>{t(`help_${k}`)}</span>
                    </li>
                  ))}
                </ul>
                <a href={mailHref} className={BTN_PRIMARY}>
                  <Mail strokeWidth={1.5} className="h-5 w-5" />
                  {t("help_cta")}
                </a>
                <p className="break-all text-sm text-[#425466] dark:text-white/60">{CONTACT_EMAIL}</p>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-[#E3E8EE] bg-white py-8 text-sm text-[#425466] dark:border-white/10 dark:bg-[#0D182B] dark:text-white/65">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <span>{t("footer_rights")}</span>
          <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
            <Link href="/impressum" className="transition-colors hover:text-[#635BFF] dark:hover:text-white">{t("footer_imprint")}</Link>
            <Link href="/datenschutz" className="transition-colors hover:text-[#635BFF] dark:hover:text-white">{t("footer_privacy")}</Link>
            <Link href="/login" className="transition-colors hover:text-[#635BFF] dark:hover:text-white">{t("footer_login")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
