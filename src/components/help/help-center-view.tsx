"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Search,
  ChevronDown,
  BookOpen,
  Users,
  Euro,
  List,
  ArrowRight,
  Mail,
  Check,
  X,
  Clock,
  CircleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Category = "courses" | "students" | "finance";

interface FaqDef {
  id: string;
  category: Category;
  /** Numbered (ol) or bulleted (ul) steps s1..sN */
  list?: { type: "ol" | "ul"; count: number };
  extra?: "attendance" | "payroll" | "importTip";
  cta?: string;
}

const FAQS: FaqDef[] = [
  { id: "createCourse", category: "courses", list: { type: "ol", count: 6 }, cta: "/courses" },
  { id: "courseScheduling", category: "courses", list: { type: "ul", count: 4 } },
  { id: "rooms", category: "courses", list: { type: "ol", count: 4 }, cta: "/rooms" },
  { id: "portal", category: "courses", list: { type: "ul", count: 4 } },
  { id: "importStudents", category: "students", list: { type: "ol", count: 5 }, extra: "importTip", cta: "/students" },
  { id: "attendance", category: "students", extra: "attendance", cta: "/absences" },
  { id: "monthlyFees", category: "finance", list: { type: "ul", count: 4 } },
  { id: "payroll", category: "finance", extra: "payroll", cta: "/teachers" },
];

const CATEGORIES = [
  { id: "all", labelKey: "allTopics", icon: List },
  { id: "courses", labelKey: "catCourses", icon: BookOpen },
  { id: "students", labelKey: "catStudents", icon: Users },
  { id: "finance", labelKey: "catFinance", icon: Euro },
] as const;

const SUPPORT_EMAIL = "support@sprachschule-app.de";

// Inline formatting tags used inside translated strings
const richTags = {
  b: (c: ReactNode) => <strong className="font-semibold text-slate-900 dark:text-slate-100">{c}</strong>,
  em: (c: ReactNode) => <em>{c}</em>,
  code: (c: ReactNode) => (
    <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 text-xs text-slate-800 dark:text-slate-200">{c}</code>
  ),
  accent: (c: ReactNode) => <strong className="font-semibold text-blue-600 dark:text-blue-400">{c}</strong>,
  ok: (c: ReactNode) => <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{c}</strong>,
  warn: (c: ReactNode) => <strong className="font-semibold text-amber-600 dark:text-amber-400">{c}</strong>,
  alert: (c: ReactNode) => <strong className="font-semibold text-red-600 dark:text-red-400">{c}</strong>,
};

export function HelpCenterView() {
  const tHelp = useTranslations("help");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openItemIds, setOpenItemIds] = useState<Set<string>>(new Set([FAQS[0].id]));

  function toggleAccordion(id: string) {
    setOpenItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FAQS.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (!q) return true;
      const haystack = [
        tHelp(`faq.${item.id}.q`),
        tHelp(`faq.${item.id}.intro`),
        tHelp(`faq.${item.id}.keywords`),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [searchQuery, selectedCategory, tHelp]);

  const categoryTitle =
    CATEGORIES.find((c) => c.id === selectedCategory)?.labelKey ?? "allTopics";

  function renderAnswer(faq: FaqDef): ReactNode {
    const k = (key: string) => `faq.${faq.id}.${key}`;

    return (
      <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <p>{tHelp.rich(k("intro"), richTags)}</p>

        {faq.list &&
          (() => {
            const Tag = faq.list.type;
            return (
              <Tag
                className={`pl-5 space-y-2 ${faq.list.type === "ol" ? "list-decimal" : "list-disc"} marker:text-slate-400`}
              >
                {Array.from({ length: faq.list.count }, (_, i) => (
                  <li key={i}>{tHelp.rich(k(`s${i + 1}`), richTags)}</li>
                ))}
              </Tag>
            );
          })()}

        {faq.extra === "importTip" && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-3 text-xs text-blue-900 dark:text-blue-200">
            {tHelp.rich(k("tip"), richTags)}
          </div>
        )}

        {faq.extra === "attendance" && (
          <>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  { key: "present", Icon: Check, tone: "emerald" },
                  { key: "absent", Icon: X, tone: "red" },
                  { key: "excused", Icon: Clock, tone: "amber" },
                ] as const
              ).map(({ key, Icon, tone }) => (
                <li
                  key={key}
                  className={
                    {
                      emerald:
                        "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200",
                      red: "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200",
                      amber:
                        "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200",
                    }[tone] + " rounded-lg border p-3 text-xs"
                  }
                >
                  <span className="flex items-center gap-1.5 font-semibold mb-0.5">
                    <Icon strokeWidth={2} className="w-3.5 h-3.5" aria-hidden />
                    {tHelp(k(key))}
                  </span>
                  {tHelp(k(`${key}Desc`))}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <CircleAlert strokeWidth={1.5} className="w-4 h-4 mt-0.5 shrink-0 text-red-500" aria-hidden />
              <p>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{tHelp(k("markTitle"))}. </span>
                {tHelp.rich(k("markBody"), richTags)}
              </p>
            </div>
          </>
        )}

        {faq.extra === "payroll" && (
          <>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                {tHelp(k("formulaTitle"))}
              </p>
              <p className="font-mono text-sm text-blue-700 dark:text-blue-300">{tHelp(k("formula"))}</p>
            </div>
            <p>{tHelp.rich(k("outro"), richTags)}</p>
          </>
        )}

        {faq.cta && (
          <Link href={faq.cta}>
            <Button size="sm" variant="outline" className="text-xs gap-2">
              <span>{tHelp(k("cta"))}</span>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4" aria-hidden />
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Header + search */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {tHelp("title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{tHelp("subtitle")}</p>
        </div>

        <div className="relative max-w-xl">
          <Search
            strokeWidth={1.5}
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tHelp("searchPlaceholder")}
            aria-label={tHelp("searchPlaceholder")}
            className="w-full pl-10 pr-20 py-2.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-slate-800 text-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium px-2 py-1 rounded-md cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden"
            >
              {tHelp("clearSearch")}
            </button>
          )}
        </div>
      </div>

      {/* Two columns: narrow category menu | accordions */}
      <div className="grid grid-cols-1 lg:grid-cols-[13rem_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
        <nav
          aria-label={tHelp("topicsLabel")}
          className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0 lg:sticky lg:top-6"
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            const count =
              cat.id === "all" ? FAQS.length : FAQS.filter((f) => f.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                aria-current={isActive ? "true" : undefined}
                className={`shrink-0 flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <Icon strokeWidth={1.5} className="w-4 h-4" aria-hidden />
                  {tHelp(cat.labelKey)}
                </span>
                <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">{count}</span>
              </button>
            );
          })}
        </nav>

        <section className="space-y-3 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {tHelp(categoryTitle)}
              {searchQuery && (
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  {tHelp("forQuery", { query: searchQuery })}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
              <button
                type="button"
                onClick={() => setOpenItemIds(new Set(filteredFaqs.map((f) => f.id)))}
                className="hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
              >
                {tHelp("expandAll")}
              </button>
              <button
                type="button"
                onClick={() => setOpenItemIds(new Set())}
                className="hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
              >
                {tHelp("collapseAll")}
              </button>
            </div>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-12 px-4 text-center space-y-2">
              <Search strokeWidth={1.5} className="w-6 h-6 mx-auto text-slate-400" aria-hidden />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{tHelp("noResults")}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{tHelp("noResultsDesc")}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="text-xs mt-2"
              >
                {tHelp("resetFilters")}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {filteredFaqs.map((faq) => {
                const isOpen = openItemIds.has(faq.id);
                const panelId = `faq-panel-${faq.id}`;
                return (
                  <div key={faq.id}>
                    <h3>
                      <button
                        type="button"
                        onClick={() => toggleAccordion(faq.id)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        className="w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 text-left text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 focus-visible:outline-hidden"
                      >
                        <span>{tHelp(`faq.${faq.id}.q`)}</span>
                        <ChevronDown
                          strokeWidth={1.5}
                          aria-hidden
                          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 motion-reduce:transition-none ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </h3>
                    {isOpen && (
                      <div id={panelId} className="px-4 sm:px-5 pb-5">
                        {renderAnswer(faq)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Support row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{tHelp("needSupport")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tHelp("needSupportDesc")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {tHelp("emailLabel")}: <span className="text-slate-700 dark:text-slate-300">{SUPPORT_EMAIL}</span>
                {" · "}
                {tHelp("availableLabel")}:{" "}
                <span className="text-slate-700 dark:text-slate-300">{tHelp("availableHours")}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{tHelp("supportResponse")}</p>
            </div>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(tHelp("supportMailSubject"))}`}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-hidden"
            >
              <Mail strokeWidth={1.5} className="w-4 h-4" aria-hidden />
              {tHelp("contactSupport")}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
