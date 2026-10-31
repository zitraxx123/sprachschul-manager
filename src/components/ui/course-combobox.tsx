"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface CourseOption {
  id: string;
  name: string;
  course_type?: string | null;
  teachers?: { name: string } | null;
}

interface CourseComboboxProps {
  courses: CourseOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CourseCombobox({
  courses,
  selectedIds,
  onChange,
  placeholder = "Kurs suchen & zuweisen...",
  disabled = false,
}: CourseComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const courseMap = useMemo(() => {
    return new Map(courses.map((c) => [c.id, c]));
  }, [courses]);

  const selectedCourses = useMemo(() => {
    return selectedIds.map((id) => courseMap.get(id)).filter(Boolean) as CourseOption[];
  }, [selectedIds, courseMap]);

  const availableCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (selectedIds.includes(c.id)) return false;
      if (!q) return true;
      const name = c.name.toLowerCase();
      const teacherName = c.teachers?.name?.toLowerCase() || "";
      return name.includes(q) || teacherName.includes(q);
    });
  }, [courses, search, selectedIds]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [availableCourses.length, search]);

  function handleSelect(course: CourseOption) {
    if (!selectedIds.includes(course.id)) {
      onChange([...selectedIds, course.id]);
    }
    setSearch("");
    inputRef.current?.focus();
  }

  function handleRemove(courseId: string) {
    onChange(selectedIds.filter((id) => id !== courseId));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < availableCourses.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : availableCourses.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (availableCourses[highlightedIndex]) {
        handleSelect(availableCourses[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "Backspace" && search === "" && selectedIds.length > 0) {
      handleRemove(selectedIds[selectedIds.length - 1]);
    }
  }

  return (
    <div ref={containerRef} className="space-y-2 relative">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 font-semibold text-slate-700">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Kurse zuweisen</span>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[11px]">
            {selectedIds.length} {selectedIds.length === 1 ? "Kurs" : "Kurse"} gewählt
          </Badge>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors"
            >
              Alle entfernen
            </button>
          )}
        </div>
      </div>

      {/* Selected Course Chips */}
      {selectedCourses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/80 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-700 max-h-36 overflow-y-auto">
          {selectedCourses.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center space-x-1.5 pl-2 pr-1 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-semibold shadow-2xs animate-in zoom-in-95 duration-150"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate max-w-[160px] sm:max-w-[220px]">{c.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(c.id)}
                disabled={disabled}
                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md p-0.5 transition-colors"
                title={`${c.name} entfernen`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          disabled={disabled}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedCourses.length === 0 ? placeholder : "Weiteren Kurs suchen & zuweisen..."}
          className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-2xs"
        />

        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 max-h-60 overflow-y-auto">
          {availableCourses.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-400">
              {search.trim() ? (
                <>Keine Kurse gefunden für &bdquo;{search}&ldquo;</>
              ) : (
                <>Alle Kurse sind bereits zugewiesen.</>
              )}
            </div>
          ) : (
            <div className="p-1 divide-y divide-slate-50 dark:divide-slate-700/50">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <span>Verfügbare Kurse ({availableCourses.length})</span>
                <span className="text-[9px] font-normal lowercase">Enter zum Zuweisen</span>
              </div>

              {availableCourses.map((course, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const isIndividual = course.course_type === "individual";

                return (
                  <div
                    key={course.id}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(course)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isHighlighted
                        ? "bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 font-semibold"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                          isIndividual ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300" : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </div>

                      <div className="min-w-0 text-left">
                        <span className="block truncate font-bold text-slate-900 dark:text-slate-100">
                          {course.name}
                        </span>
                        {course.teachers?.name && (
                          <span className="block truncate text-[11px] text-slate-400 dark:text-slate-400 font-normal">
                            Lehrkraft: {course.teachers.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      <span className="text-[11px] font-semibold text-blue-600">
                        + Zuweisen
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
