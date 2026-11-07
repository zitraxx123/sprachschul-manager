"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Check, Users, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { StudentOption } from "@/components/courses/add-course-dialog";
import { Badge } from "@/components/ui/badge";

interface StudentComboboxProps {
  students: StudentOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  singleSelect?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function StudentCombobox({
  students,
  selectedIds,
  onChange,
  singleSelect = false,
  placeholder,
  disabled = false,
}: StudentComboboxProps) {
  const tCommon = useTranslations("common");
  const effectivePlaceholder = placeholder || tCommon("searchAndAddStudent");
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Map of students by id
  const studentMap = useMemo(() => {
    return new Map(students.map((s) => [s.id, s]));
  }, [students]);

  // Selected student objects
  const selectedStudents = useMemo(() => {
    return selectedIds.map((id) => studentMap.get(id)).filter(Boolean) as StudentOption[];
  }, [selectedIds, studentMap]);

  // Filtered available students (excluding already selected in multiSelect, or highlighting them)
  const availableStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      // If multiSelect, hide already selected students from dropdown to keep it clean
      if (!singleSelect && selectedIds.includes(s.id)) return false;

      if (!q) return true;
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      const email = s.email?.toLowerCase() || "";
      const phone = s.phone?.toLowerCase() || "";
      return fullName.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [students, search, selectedIds, singleSelect]);

  // Reset highlighted index when available items change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [availableStudents.length, search]);

  function handleSelect(student: StudentOption) {
    if (singleSelect) {
      onChange([student.id]);
      setSearch("");
      setIsOpen(false);
      return;
    }

    if (!selectedIds.includes(student.id)) {
      onChange([...selectedIds, student.id]);
    }
    setSearch("");
    // Keep focus on input for rapid additions
    inputRef.current?.focus();
  }

  function handleRemove(studentId: string) {
    onChange(selectedIds.filter((id) => id !== studentId));
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
      setHighlightedIndex((prev) => (prev + 1 < availableStudents.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : availableStudents.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (availableStudents[highlightedIndex]) {
        handleSelect(availableStudents[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "Backspace" && search === "" && selectedIds.length > 0) {
      // Remove last selected chip on backspace if input is empty
      handleRemove(selectedIds[selectedIds.length - 1]);
    }
  }

  return (
    <div ref={containerRef} className="space-y-2 relative">
      {/* 1. Header with Badge & Clear All */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 font-semibold text-slate-700 dark:text-slate-200">
          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
          <span>Teilnehmer zuweisen</span>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-bold text-[11px]">
            {selectedIds.length} {selectedIds.length === 1 ? "Schüler" : "Schüler"} gewählt
          </Badge>
          {!singleSelect && selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              Alle entfernen
            </button>
          )}
        </div>
      </div>

      {/* 2. Selected Student Chips / Badges */}
      {selectedStudents.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-slate-50/80 dark:bg-slate-900/80 rounded-lg border border-slate-200/80 dark:border-slate-700 max-h-36 overflow-y-auto">
          {selectedStudents.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center space-x-2 pl-2 pr-1 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-semibold shadow-sm animate-in zoom-in-95 duration-150 group hover:border-slate-300 dark:hover:border-slate-600"
            >
              <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                {s.first_name.charAt(0)}{s.last_name.charAt(0)}
              </span>
              <span className="truncate max-w-[150px] sm:max-w-[220px]">
                {s.first_name} {s.last_name}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(s.id)}
                disabled={disabled}
                className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md p-0.5 transition-colors disabled:pointer-events-none"
                title={`${s.first_name} ${s.last_name} entfernen`}
                aria-label={`Entfernen`}
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 3. Search Input Field */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" strokeWidth={1.5} />
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
          placeholder={selectedStudents.length === 0 ? effectivePlaceholder : tCommon("searchMoreStudents")}
          className="flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
        />

        {search ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        ) : (
          <div className="absolute right-3 top-3 pointer-events-none">
            <UserPlus className="w-4 h-4 text-slate-300 dark:text-slate-600" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* 4. Dropdown Popover with Filtered Results */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 max-h-60 overflow-y-auto">
          {availableStudents.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-400">
              {search.trim() ? (
                <>{tCommon("noStudentsFound", { query: search })}</>
              ) : (
                <>{tCommon("allStudentsSelected")}</>
              )}
            </div>
          ) : (
            <div className="p-1 divide-y divide-slate-50 dark:divide-slate-700/50">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <span>{tCommon("studentsFoundCount", { count: availableStudents.length })}</span>
                <span className="text-[9px] font-normal lowercase">{tCommon("enterToAdd")}</span>
              </div>

              {availableStudents.slice(0, 30).map((student, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const isSelected = selectedIds.includes(student.id);

                return (
                  <div
                    key={student.id}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(student)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isHighlighted
                        ? "bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 font-semibold"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                          isHighlighted
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                      </div>

                      <div className="min-w-0 text-left">
                        <span className="block truncate font-bold text-slate-900 dark:text-slate-100">
                          {student.first_name} {student.last_name}
                        </span>
                        {student.email ? (
                          <span className="block truncate text-[11px] text-slate-400 dark:text-slate-400 font-normal">
                            {student.email}
                          </span>
                        ) : student.phone ? (
                          <span className="block truncate text-[11px] text-slate-400 dark:text-slate-400 font-normal">
                            {student.phone}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      {isSelected ? (
                        <Check strokeWidth={1.5} className="w-4 h-4 text-blue-600" />
                      ) : (
                        <span className="text-[11px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100">
                          {tCommon("addShort")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {availableStudents.length > 30 && (
                <div className="p-2 text-center text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  {tCommon("moreStudentsHint", { count: availableStudents.length - 30 })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
