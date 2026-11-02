"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createStudent, StudentActionState } from "@/actions/students";
import { Course, CourseSchedule } from "@/types/database";
import { CourseCombobox } from "@/components/ui/course-combobox";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Plus, 
  X, 
  User, 
  Users, 
  Mail, 
  Phone, 
  BookOpen, 
  Loader2, 
  AlertCircle,
  Euro
} from "lucide-react";

interface AddStudentDialogProps {
  courses?: Array<Course & { course_schedules?: CourseSchedule[] }>;
}

export function AddStudentDialog({ courses = [] }: AddStudentDialogProps) {
  const t = useTranslations("students");
  const tCommon = useTranslations("common");

  const [isOpen, setIsOpen] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [courseName, setCourseName] = useState("");

  const [state, formAction, isPending] = useActionState<StudentActionState | null, FormData>(
    async (prev, formData) => {
      const res = await createStudent(prev, formData);
      if (res?.success) {
        toast.success(t("saveStudent") + " " + tCommon("saved"));
        setIsOpen(false);
        setSelectedCourseIds([]);
        setCourseName("");
      } else if (res?.error) {
        toast.error(res.error);
      }
      return res;
    },
    null
  );

  return (
    <div>
      {!isOpen ? (
        <Button onClick={() => setIsOpen(true)} className="space-x-2">
          <Plus strokeWidth={1.5} className="w-4 h-4" />
          <span>{t("addStudent")}</span>
        </Button>
      ) : (
        <Card className="border-blue-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md mb-6 ring-1 ring-blue-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("addStudent")}</CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("subtitle")}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsOpen(false);
                setSelectedCourseIds([]);
                setCourseName("");
              }}
              className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X strokeWidth={1.5} className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-5">
            {state?.error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                <AlertCircle strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{state.error}</span>
              </div>
            )}

            <form action={formAction} className="space-y-4">
              {/* Hidden inputs for selected courses */}
              {selectedCourseIds.map((id) => (
                <input key={id} type="hidden" name="course_ids" value={id} />
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <User strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                    <span>{t("firstName")} *</span>
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    placeholder="Max"
                    required
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name" className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <User strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                    <span>{t("lastName")} *</span>
                  </Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    placeholder="Mustermann"
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Mail strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                    <span>{tCommon("email")} ({tCommon("optional")})</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="max.mustermann@email.de"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Phone strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                    <span>{tCommon("phone")} ({tCommon("optional")})</span>
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+49 170 1234567"
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Parent / Emergency Contact Section */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center space-x-2">
                  <Users strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    {t("emergencyContact")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t("emergencyContactDesc")}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="parent_name" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {t("parentName")}
                    </Label>
                    <Input
                      id="parent_name"
                      name="parent_name"
                      placeholder="Sabine Mustermann"
                      disabled={isPending}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="parent_phone" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {t("parentPhone")}
                    </Label>
                    <Input
                      id="parent_phone"
                      name="parent_phone"
                      type="tel"
                      placeholder="+49 170 9876543"
                      disabled={isPending}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="parent_email" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {t("parentEmail")}
                    </Label>
                    <Input
                      id="parent_email"
                      name="parent_email"
                      type="email"
                      placeholder="eltern@email.de"
                      disabled={isPending}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Course Multi-select Selection (Modern Combobox) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
                <CourseCombobox
                  courses={courses}
                  selectedIds={selectedCourseIds}
                  onChange={setSelectedCourseIds}
                  placeholder={t("searchPlaceholder")}
                  disabled={isPending}
                />
              </div>

              {/* Course Note / Level */}
              <div className="space-y-2">
                <Label htmlFor="course_name" className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <BookOpen strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                  <span>{t("additionalNote")}</span>
                </Label>
                <Input
                  id="course_name"
                  name="course_name"
                  placeholder={t("additionalNotePlaceholder")}
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {/* Custom Monthly Price (Individual discount/override) */}
              <div className="space-y-2">
                <Label htmlFor="custom_monthly_price" className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Euro strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                  <span>{t("customMonthlyPrice")}</span>
                </Label>
                <Input
                  id="custom_monthly_price"
                  name="custom_monthly_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="z. B. 120.00"
                  disabled={isPending}
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t("customMonthlyPriceDesc")}
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedCourseIds([]);
                    setCourseName("");
                  }}
                  disabled={isPending}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 strokeWidth={1.5} className="w-4 h-4 mr-2 animate-spin" />
                      {tCommon("saving")}
                    </>
                  ) : (
                    t("saveStudent")
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
