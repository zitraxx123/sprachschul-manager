"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocale } from "@/actions/locale";
import { ChevronDown, Check, Globe } from "lucide-react";

export interface LanguageOption {
  code: "de" | "en" | "ru";
  label: string;
  nativeLabel: string;
  flag: string;
  short: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "de", label: "Deutsch", nativeLabel: "Deutsch", flag: "🇩🇪", short: "DE" },
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧", short: "EN" },
  { code: "ru", label: "Russisch", nativeLabel: "Русский", flag: "🇷🇺", short: "RU" },
];

interface LanguageSwitcherProps {
  className?: string;
  variant?: "default" | "compact" | "ghost";
  showGlobe?: boolean;
}

export function LanguageSwitcher({
  className = "",
  variant = "default",
  showGlobe = true,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const currentLocale = useLocale() as "de" | "en" | "ru";
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeLang =
    LANGUAGES.find((lang) => lang.code === currentLocale) || LANGUAGES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  async function handleSelect(code: "de" | "en" | "ru") {
    if (code === currentLocale || isPending) {
      setIsOpen(false);
      return;
    }

    setIsPending(true);
    try {
      // Set client-side cookie immediately
      document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
      // Set server-side cookie via action
      await setLocale(code);
      setIsOpen(false);
      // Trigger full client re-render with new messages
      router.refresh();
    } catch (err) {
      console.error("Failed to change language:", err);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all select-none ${
          variant === "ghost"
            ? "bg-transparent border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            : "bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Sprache ändern / Change language / Сменить язык"
      >
        {showGlobe && <Globe strokeWidth={1.5} className="w-4 h-4 text-slate-400 shrink-0" />}
        <span className="text-sm leading-none" role="img" aria-label={activeLang.label}>
          {activeLang.flag}
        </span>
        <span className="font-bold tracking-wider">{activeLang.short}</span>
        <ChevronDown strokeWidth={1.5}
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
          role="menu"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
            Sprache wählen / Language
          </div>

          <div className="space-y-0.5 px-1">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLocale;

              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <div>
                      <span className="block leading-tight">{lang.nativeLabel}</span>
                      {lang.nativeLabel !== lang.label && (
                        <span className="text-[10px] text-slate-400 block leading-tight">
                          {lang.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
