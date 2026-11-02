import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher, 
  getCurrentMembership 
} from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AddTeacherDialog } from "@/components/teachers/add-teacher-dialog";
import { EditTeacherDialog } from "@/components/teachers/edit-teacher-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, Mail, Phone, Cake, ArrowRight } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";

export const metadata = {
  title: "Lehrkräfte • Sprachschul-Manager",
};

export default async function TeachersPage() {
  const [teacher, membership, organization, tTeachers, tCommon, locale] = await Promise.all([
    getCurrentTeacher(),
    getCurrentMembership(),
    getActiveOrganization(),
    getTranslations("teachers"),
    getTranslations("common"),
    getLocale(),
  ]);

  if (teacher && membership?.role === "teacher") {
    redirect("/my-portal");
  }

  if (!organization) {
    return <CreateOrganizationCard />;
  }

  const supabase = await createClient();

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Parallel fetch: Teachers and Current Month Lessons
  const [teachersResult, lessonsResult] = await Promise.all([
    supabase
      .from("teachers")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true }),
    supabase
      .from("lessons")
      .select("teacher_id, duration_hours, lesson_date")
      .eq("organization_id", organization.id)
      .gte("lesson_date", `${currentYearMonth}-01`),
  ]);

  const teachers = teachersResult.data || [];
  const lessons = lessonsResult.data || [];

  // Map monthly hours per teacher
  const monthlyHoursMap = new Map<string, number>();
  (lessons || []).forEach((l) => {
    const current = monthlyHoursMap.get(l.teacher_id) || 0;
    monthlyHoursMap.set(l.teacher_id, current + Number(l.duration_hours || 0));
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{tTeachers("title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {tTeachers("subtitle")}
          </p>
        </div>

        <AddTeacherDialog />
      </div>

      {/* Teachers Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{tTeachers("totalCount")} ({teachers?.length || 0})</CardTitle>
          <CardDescription>
            {tTeachers("subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!teachers || teachers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={tTeachers("emptyTitle")}
              description={tTeachers("emptyDesc")}
            >
              <AddTeacherDialog />
            </EmptyState>
          ) : (
            <>
              {/* Desktop Table View (Hidden on mobile) */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tTeachers("name")}</TableHead>
                      <TableHead>{tTeachers("email")}</TableHead>
                      <TableHead>{tTeachers("hourlyRate")}</TableHead>
                      <TableHead>{tTeachers("lessonsCount")}</TableHead>
                      <TableHead className="text-right">{tTeachers("monthlyPayout")}</TableHead>
                      <TableHead className="text-right">{tCommon("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.map((t) => {
                      const monthHours = monthlyHoursMap.get(t.id) || 0;
                      const monthEarnings = monthHours * Number(t.hourly_rate);

                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                                {t.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span>{t.name}</span>
                                  {t.user_id ? (
                                    <Badge variant="success" className="text-[10px] px-1.5 py-0 font-normal">
                                      {tTeachers("portalActive")}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal text-slate-500">
                                      {tTeachers("portalInactive")}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400 text-xs">
                            <div className="space-y-1">
                              {t.email && (
                                <div className="flex items-center space-x-2">
                                  <Mail strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                                  <span>{t.email}</span>
                                </div>
                              )}
                              {t.phone && (
                                <div className="flex items-center space-x-2">
                                  <Phone strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                                  <a href={`tel:${t.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                                    {t.phone}
                                  </a>
                                </div>
                              )}
                              {t.birthday && (
                                <div className="flex items-center space-x-2 text-slate-400">
                                  <Cake strokeWidth={1.5} className="w-4 h-4 text-amber-500" />
                                  <span>{formatDate(t.birthday, locale)}</span>
                                </div>
                              )}
                              {!t.email && !t.phone && !t.birthday && (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <Badge variant="outline" className="font-mono">
                                {formatCurrency(Number(t.hourly_rate))} / {tCommon("hourShort")}
                              </Badge>
                              {(t.rate_group || t.rate_individual || t.rate_45 || t.rate_60 || t.rate_90) && (
                                <span className="block text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-1">
                                  + {tTeachers("advancedRatesToggle")}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300 font-medium">
                            {monthHours.toFixed(1)} {tCommon("hourShort")}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(monthEarnings)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <EditTeacherDialog teacher={t} variant="icon" />
                              <Link href={`/teachers/${t.id}`}>
                                <Button variant="outline" size="sm" className="space-x-1 text-xs">
                                  <span>{tTeachers("viewProfile")}</span>
                                  <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Native Card View (Shown on screens < md) */}
              <div className="md:hidden space-y-3">
                {teachers.map((t) => {
                  const monthHours = monthlyHoursMap.get(t.id) || 0;
                  const monthEarnings = monthHours * Number(t.hourly_rate);

                  return (
                    <div 
                      key={t.id} 
                      className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight truncate">
                                {t.name}
                              </h3>
                              {t.user_id ? (
                                <Badge variant="success" className="text-[10px] px-1.5 py-0 font-normal shrink-0">
                                  {tCommon("active")}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="space-y-0.5 mt-0.5 text-xs text-slate-500">
                              {t.phone && (
                                <a href={`tel:${t.phone}`} className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline">
                                  <Phone strokeWidth={1.5} className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span>{t.phone}</span>
                                </a>
                              )}
                              {t.email && (
                                <a href={`mailto:${t.email}`} className="flex items-center space-x-1 text-slate-500 hover:text-slate-800 truncate">
                                  <Mail strokeWidth={1.5} className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span className="truncate">{t.email}</span>
                                </a>
                              )}
                              {t.birthday && (
                                <div className="flex items-center space-x-1 text-slate-400">
                                  <Cake strokeWidth={1.5} className="w-4 h-4 text-amber-500 shrink-0" />
                                  <span>{formatDate(t.birthday, locale)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="font-mono text-xs">
                            {formatCurrency(Number(t.hourly_rate))}/{tCommon("hourShort")}
                          </Badge>
                        </div>
                      </div>

                      {/* Current Month Summary */}
                      <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                          <span className="text-slate-400 block text-[11px]">{tTeachers("hoursDelivered")}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{monthHours.toFixed(1)} {tCommon("hourShort")}</span>
                        </div>
                        <div className="bg-blue-50/70 dark:bg-blue-950/60 p-3 rounded-xl">
                          <span className="text-blue-600 dark:text-blue-400 block text-[11px] font-medium">{tTeachers("ongoingPayout")}</span>
                          <span className="font-bold text-blue-900 dark:text-blue-200 text-sm">{formatCurrency(monthEarnings)}</span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <EditTeacherDialog teacher={t} variant="button" />
                        <Link href={`/teachers/${t.id}`} className="flex-1">
                          <Button variant="outline" className="w-full justify-between h-9 text-xs font-semibold">
                            <span>{tTeachers("viewProfile")}</span>
                            <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-blue-600" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
