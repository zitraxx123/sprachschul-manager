"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GermanDatePickerProps {
  id?: string;
  name: string;
  value?: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  mode?: "birthday" | "general";
  onChange?: (iso: string) => void;
}

const LOCALIZED_MONTHS: Record<string, string[]> = {
  de: [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ],
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ],
  ru: [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ],
};

const LOCALIZED_WEEKDAYS: Record<string, string[]> = {
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
};

function isoToGerman(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, "0")}.${m.padStart(2, "0")}.${y}`;
  }
  return iso;
}

function germanToIso(german: string): string | null {
  const clean = german.trim();
  const match = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    const d = match[1].padStart(2, "0");
    const m = match[2].padStart(2, "0");
    const y = match[3];
    return `${y}-${m}-${d}`;
  }
  return null;
}

export function GermanDatePicker({
  id,
  name,
  value,
  defaultValue = "",
  placeholder,
  required = false,
  disabled = false,
  className,
  mode = "general",
  onChange,
}: GermanDatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();

  const months = LOCALIZED_MONTHS[locale] || LOCALIZED_MONTHS.de;
  const weekdays = LOCALIZED_WEEKDAYS[locale] || LOCALIZED_WEEKDAYS.de;
  const todayLabel = locale === "ru" ? "Сегодня" : locale === "en" ? "Today" : "Heute";
  const resetLabel = locale === "ru" ? "Сбросить" : locale === "en" ? "Reset" : "Zurücksetzen";
  const clearLabel = locale === "ru" ? "Очистить" : locale === "en" ? "Clear" : "Löschen";
  const defaultPlaceholder = locale === "ru" ? "ДД.ММ.ГГГГ" : locale === "en" ? "DD.MM.YYYY" : "TT.MM.JJJJ";

  const activeInitial = value !== undefined ? value : (defaultValue || "");
  const initialIso = activeInitial ? (activeInitial.includes(".") ? germanToIso(activeInitial) || "" : activeInitial) : "";
  const initialGerman = activeInitial ? (activeInitial.includes(".") ? activeInitial : isoToGerman(activeInitial)) : "";

  const [textValue, setTextValue] = useState(initialGerman);
  const [isoValue, setIsoValue] = useState(initialIso);
  const [isOpen, setIsOpen] = useState(false);

  // Calendar navigation state
  const today = new Date();
  const defaultYear = initialIso 
    ? parseInt(initialIso.split("-")[0], 10) 
    : mode === "birthday" 
    ? 1990 
    : today.getFullYear();
    
  const defaultMonth = initialIso 
    ? parseInt(initialIso.split("-")[1], 10) - 1 
    : mode === "birthday" 
    ? 0 
    : today.getMonth();

  const [viewYear, setViewYear] = useState(defaultYear);
  const [viewMonth, setViewMonth] = useState(defaultMonth);

  // Sync when controlled value or defaultValue changes externally
  useEffect(() => {
    const val = value !== undefined ? value : (defaultValue || "");
    if (!val) {
      setTextValue("");
      setIsoValue("");
    } else if (val.includes("-")) {
      setIsoValue(val);
      setTextValue(isoToGerman(val));
    } else if (val.includes(".")) {
      setTextValue(val);
      setIsoValue(germanToIso(val) || "");
    }
  }, [value, defaultValue]);

  // Click outside listener to close calendar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Input change handler for manual typing (e.g. 15.04.2025)
  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    let input = e.target.value;
    
    // Auto format dots as user types numbers (e.g. 15 -> 15. -> 1504 -> 15.04.)
    const cleanNumbers = input.replace(/\D/g, "");
    if (cleanNumbers.length > 2 && !input.includes(".")) {
      input = `${cleanNumbers.slice(0, 2)}.${cleanNumbers.slice(2, 4)}${cleanNumbers.length > 4 ? `.${cleanNumbers.slice(4, 8)}` : ""}`;
    }

    setTextValue(input);

    const convertedIso = germanToIso(input);
    if (convertedIso) {
      setIsoValue(convertedIso);
      onChange?.(convertedIso);
      // Also sync calendar view
      const [y, m] = convertedIso.split("-").map((p) => parseInt(p, 10));
      setViewYear(y);
      setViewMonth(m - 1);
    } else if (input.trim() === "") {
      setIsoValue("");
      onChange?.("");
    }
  }

  // Handle calendar day selection
  function handleSelectDay(day: number) {
    const dStr = String(day).padStart(2, "0");
    const mStr = String(viewMonth + 1).padStart(2, "0");
    const yStr = String(viewYear);

    const newGerman = `${dStr}.${mStr}.${yStr}`;
    const newIso = `${yStr}-${mStr}-${dStr}`;

    setTextValue(newGerman);
    setIsoValue(newIso);
    onChange?.(newIso);
    setIsOpen(false);
  }

  // Handle "Heute" quick click
  function handleSetToday() {
    const d = new Date();
    const dStr = String(d.getDate()).padStart(2, "0");
    const mStr = String(d.getMonth() + 1).padStart(2, "0");
    const yStr = String(d.getFullYear());

    const newGerman = `${dStr}.${mStr}.${yStr}`;
    const newIso = `${yStr}-${mStr}-${dStr}`;

    setTextValue(newGerman);
    setIsoValue(newIso);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    onChange?.(newIso);
    setIsOpen(false);
  }

  // Handle Clear / Reset
  function handleClear() {
    setTextValue("");
    setIsoValue("");
    onChange?.("");
  }

  // Navigation handlers
  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  }

  // Generate days in viewed month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  // Week starts on Monday (Monday = 0, Sunday = 6)
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Selected date parts for highlighting
  const selectedParts = isoValue ? isoValue.split("-").map((p) => parseInt(p, 10)) : null;
  const isViewingSelectedMonth = selectedParts && selectedParts[0] === viewYear && selectedParts[1] === viewMonth + 1;

  // Year choices range
  const currentYear = today.getFullYear();
  const minYear = mode === "birthday" ? 1935 : currentYear - 5;
  const maxYear = mode === "birthday" ? currentYear - 14 : currentYear + 5;
  const yearsList: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearsList.push(y);
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Hidden input storing the ISO value (YYYY-MM-DD) for form submission */}
      <input type="hidden" name={name} value={isoValue} />

      {/* Visible Input */}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={textValue}
          onChange={handleTextChange}
          placeholder={placeholder || defaultPlaceholder}
          required={required && !isoValue}
          disabled={disabled}
          maxLength={10}
          inputMode="numeric"
          autoComplete="off"
          className="flex h-11 sm:h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3.5 pr-10 py-2 text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent transition-all duration-150 disabled:opacity-50"
        />

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {textValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              title={clearLabel}
            >
              <X strokeWidth={1.5} className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 touch-manipulation"
            aria-label="Kalender öffnen"
          >
            <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      </div>

      {/* Custom Calendar Popup */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Calendar Header with Month & Year Dropdowns */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all"
            >
              <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 flex-1 justify-center">
              {/* Month Selector */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {m}
                  </option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer focus:outline-none"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all"
            >
              <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center pt-3 pb-1">
            {weekdays.map((wd) => (
              <span key={wd} className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                {wd}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1 pt-1">
            {/* Empty slots for start offset */}
            {Array.from({ length: startOffset }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8 w-8" />
            ))}

            {/* Days of Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const isSelected = isViewingSelectedMonth && selectedParts && selectedParts[2] === day;
              const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    "h-8 w-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all duration-100 active:scale-90 touch-manipulation",
                    isSelected
                      ? "bg-blue-600 text-white font-bold shadow-sm"
                      : isToday
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer with Quick Buttons */}
          <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium px-1.5 py-0.5 rounded"
            >
              {resetLabel}
            </button>
            <button
              type="button"
              onClick={handleSetToday}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950"
            >
              {todayLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
