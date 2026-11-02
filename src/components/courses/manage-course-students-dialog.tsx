"use client";

import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import { updateCourseStudents, StudentAssignmentInput } from "@/actions/courses";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck,
  Search,
  Plus,
  Sparkles,
  Clock,
  Trash2
} from "lucide-react";

export interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  parent_email?: string | null;
  course_id?: string | null;
  enrolledCourseCount?: number;
  course_name?: string | null;
}

export type StudentStatus = "active" | "trial" | "waiting";

export interface AssignedStudentState {
  studentId: string;
  status: StudentStatus;
}

interface ManageCourseStudentsDialogProps {
  courseId: string;
  courseName: string;
  maxCapacity?: number;
  allStudents: StudentOption[];
  assignedStudentIds?: string[];
  initialAssignments?: AssignedStudentState[];
}

export function ManageCourseStudentsDialog({
  courseId,
  courseName,
  maxCapacity = 10,
  allStudents,
  assignedStudentIds = [],
  initialAssignments,
}: ManageCourseStudentsDialogProps) {
  const t = useTranslations("courses");
  const tStudents = useTranslations("students");
  const tCommon = useTranslations("common");

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Build initial list of assignments
  const defaultAssignments: AssignedStudentState[] = useMemo(() => {
    if (initialAssignments && initialAssignments.length > 0) {
      return initialAssignments;
    }
    return assignedStudentIds.map((id) => ({
      studentId: id,
      status: "active" as StudentStatus,
    }));
  }, [initialAssignments, assignedStudentIds]);

  const [assignments, setAssignments] = useState<AssignedStudentState[]>(defaultAssignments);

  // Map students by id for fast lookups
  const studentMap = useMemo(() => {
    return new Map(allStudents.map((s) => [s.id, s]));
  }, [allStudents]);

  // Derived counts
  const activeCount = assignments.filter((a) => a.status === "active").length;
  const trialCount = assignments.filter((a) => a.status === "trial").length;
  const waitingCount = assignments.filter((a) => a.status === "waiting").length;
  const isFull = activeCount >= maxCapacity;
  const progressPercent = Math.min(100, Math.round((activeCount / maxCapacity) * 100));

  function handleOpen() {
    setAssignments(defaultAssignments);
    setSearchQuery("");
    setError(null);
    setSuccess(false);
    setIsOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setIsOpen(false);
  }

  // Filter available students for search dropdown
  const assignedIdsSet = useMemo(() => new Set(assignments.map((a) => a.studentId)), [assignments]);

  const availableSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allStudents
      .filter((s) => !assignedIdsSet.has(s.id))
      .filter((s) => {
        const full = `${s.first_name} ${s.last_name}`.toLowerCase();
        const email = s.email?.toLowerCase() || "";
        const phone = s.phone?.toLowerCase() || "";
        return full.includes(q) || email.includes(q) || phone.includes(q);
      })
      .slice(0, 8);
  }, [allStudents, searchQuery, assignedIdsSet]);

  function handleAddStudent(student: StudentOption) {
    if (assignedIdsSet.has(student.id)) return;

    // Rule: If capacity is reached, automatically set status to 'waiting'
    const newStatus: StudentStatus = isFull ? "waiting" : "active";

    setAssignments((prev) => [
      ...prev,
      { studentId: student.id, status: newStatus },
    ]);
    setSearchQuery("");

    if (isFull) {
      toast.info(t("studentAddedWaiting"));
    }
  }

  function handleRemoveStudent(studentId: string) {
    setAssignments((prev) => prev.filter((a) => a.studentId !== studentId));
  }

  function handleStatusChange(studentId: string, newStatus: StudentStatus) {
    if (newStatus === "active") {
      const current = assignments.find((a) => a.studentId === studentId);
      if (current && current.status !== "active" && activeCount >= maxCapacity) {
        toast.error(t("courseFull"));
        return;
      }
    }

    setAssignments((prev) =>
      prev.map((a) => (a.studentId === studentId ? { ...a, status: newStatus } : a))
    );
  }

  async function handleSave() {
    setError(null);
    setSuccess(false);

    if (activeCount > maxCapacity) {
      setError(t("courseFull"));
      return;
    }

    startTransition(async () => {
      const payload: StudentAssignmentInput[] = assignments.map((a) => ({
        studentId: a.studentId,
        status: a.status,
      }));

      const res = await updateCourseStudents(courseId, payload);
      if (res?.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        toast.success(tCommon("saved"));
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
        }, 800);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="h-8 text-xs font-medium space-x-2 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:border-slate-700"
      >
        <Users strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>{t("manageStudents")}</span>
        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
          {defaultAssignments.filter((a) => a.status === "active").length} / {maxCapacity}
        </span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-xl max-sm:rounded-b-none sm:max-w-2xl sm:rounded-xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-start justify-between shrink-0 border-b border-slate-800">
              <div>
                <span className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider flex items-center space-x-2">
                  <UserCheck strokeWidth={1.5} className="w-4 h-4" />
                  <span>{t("manageStudentsTitle")}</span>
                </span>
                <h3 className="text-lg font-bold mt-1 text-white">
                  {courseName}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {t("manageStudentsDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="text-slate-400 hover:text-white p-2 rounded-lg transition-all active:scale-95 touch-manipulation"
                aria-label={tCommon("close")}
              >
                <X strokeWidth={1.5} className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <CheckCircle2 strokeWidth={1.5} className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{tCommon("saved")}</span>
                </div>
              )}

              {/* Capacity KPI Box */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t("capacity")} ({tStudents("statusActive")}):
                    </span>
                    <Badge
                      variant="outline"
                      className={`font-mono text-xs font-bold px-2.5 py-0.5 ${
                        isFull
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                          : "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                      }`}
                    >
                      {activeCount} / {maxCapacity}
                    </Badge>
                    {isFull && (
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold flex items-center space-x-1">
                        <AlertCircle strokeWidth={1.5} className="w-4 h-4" />
                        <span>{t("courseFull")}</span>
                      </span>
                    )}
                  </div>

                  {/* Badges for Trial and Waiting counts */}
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 text-[11px] font-medium">
                      <Sparkles strokeWidth={1.5} className="w-4 h-4 mr-1 text-amber-600" />
                      {trialCount} {tStudents("statusTrial")}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium">
                      <Clock strokeWidth={1.5} className="w-4 h-4 mr-1 text-slate-500" />
                      {waitingCount} {tStudents("statusWaiting")}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isFull ? "bg-amber-600" : "bg-blue-600"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Student Search & Quick Add */}
              <div className="space-y-2 relative">
                <div className="relative">
                  <Search strokeWidth={1.5} className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("searchStudentPlaceholder")}
                    disabled={isPending}
                    className="w-full h-10 pl-9 pr-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Search Dropdown Results */}
                {availableSearchResults.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {availableSearchResults.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleAddStudent(s)}
                        className="p-3 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block truncate">
                            {s.first_name} {s.last_name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {s.email || s.phone || "—"}
                          </span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600">
                          <Plus strokeWidth={1.5} className="w-4 h-4 mr-1" />
                          {tCommon("add")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Enrolled Students List */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                  {t("assignedStudents")} ({assignments.length})
                </span>

                {assignments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    {tStudents("emptyDesc")}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {assignments.map((assignment) => {
                      const s = studentMap.get(assignment.studentId);
                      if (!s) return null;

                      return (
                        <div
                          key={assignment.studentId}
                          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-sm"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {s.first_name.charAt(0)}{s.last_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                                {s.first_name} {s.last_name}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {s.email || s.phone || "—"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            {/* Status Selector */}
                            <select
                              value={assignment.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  assignment.studentId,
                                  e.target.value as StudentStatus
                                )
                              }
                              disabled={isPending}
                              className="h-8 px-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="active" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{tStudents("statusActive")}</option>
                              <option value="trial" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{tStudents("statusTrial")}</option>
                              <option value="waiting" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{tStudents("statusWaiting")}</option>
                            </select>

                            {/* Remove button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isPending}
                              onClick={() => handleRemoveStudent(assignment.studentId)}
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title={tCommon("delete")}
                            >
                              <Trash2 strokeWidth={1.5} className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isPending}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 strokeWidth={1.5} className="w-4 h-4 mr-1.5 animate-spin" />
                    {tCommon("saving")}
                  </>
                ) : (
                  tCommon("save")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
