"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

export interface ListFilterConfig {
  /** URL query parameter, e.g. "course" */
  param: string;
  label: string;
  allLabel: string;
  options: Array<{ value: string; label: string }>;
}

interface ListFiltersProps {
  searchPlaceholder: string;
  filters?: ListFilterConfig[];
  shown: number;
  total: number;
}

/**
 * URL-driven search + filter bar. The page (server component) reads the same
 * query parameters ("q" plus one per filter) and filters its data.
 */
export function ListFilters({ searchPlaceholder, filters = [], shown, total }: ListFiltersProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") || "");

  function update(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handleSearch(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: value.trim() }), 300);
  }

  function handleClear() {
    if (timer.current) clearTimeout(timer.current);
    setQuery("");
    update(Object.fromEntries(["q", ...filters.map((f) => f.param)].map((k) => [k, ""])));
  }

  const hasActive = !!query || filters.some((f) => searchParams.get(f.param));

  const selectClass =
    "h-10 w-full sm:w-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:[color-scheme:dark]";

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search
            strokeWidth={1.5}
            className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        {filters.map((f) => (
          <select
            key={f.param}
            value={searchParams.get(f.param) || ""}
            onChange={(e) => update({ [f.param]: e.target.value })}
            aria-label={f.label}
            className={selectClass}
          >
            <option value="">{f.allLabel}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}

        {hasActive && (
          <button
            type="button"
            onClick={handleClear}
            className="h-10 inline-flex items-center justify-center space-x-1.5 px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X strokeWidth={1.5} className="w-4 h-4" />
            <span>{t("clearFilters")}</span>
          </button>
        )}
      </div>

      {hasActive && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("resultCount", { shown, total })}</p>
      )}
    </div>
  );
}
