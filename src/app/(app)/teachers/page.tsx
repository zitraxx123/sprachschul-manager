import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher, 
  getCurrentMembership 
} from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { AddTeacherDialog } from "@/components/teachers/add-teacher-dialog";
import { EditTeacherDialog } from "@/components/teachers/edit-teacher-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, Mail, Phone, Cake, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Lehrkräfte • Sprachschul-Manager",
};

export default async function TeachersPage() {
  const [teacher, membership, organization] = await Promise.all([
    getCurrentTeacher(),
    getCurrentMembership(),
    getActiveOrganization(),
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lehrkräfte (Dozenten)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Verwalten Sie Ihre Dozenten, vertragliche Stundensätze und Honorarabrechnungen.
          </p>
        </div>

        <AddTeacherDialog />
      </div>

      {/* Teachers Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Erfasste Dozenten ({teachers?.length || 0})</CardTitle>
          <CardDescription>
            Klicken Sie auf &quot;Details &amp; Honorar&quot;, um die genaue Monatsabrechnung mit allen Unterrichtsstunden einzusehen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!teachers || teachers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Noch keine Dozenten vorhanden"
              description="Legen Sie Ihre erste Lehrkraft an, um Stundensätze festzulegen und Kurse zuzuweisen."
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
                      <TableHead>Dozent</TableHead>
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Stundensatz</TableHead>
                      <TableHead>Stunden (Lfd. Monat)</TableHead>
                      <TableHead className="text-right">Auszahlung (Lfd. Monat)</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.map((teacher) => {
                      const monthHours = monthlyHoursMap.get(teacher.id) || 0;
                      const monthEarnings = monthHours * Number(teacher.hourly_rate);

                      return (
                        <TableRow key={teacher.id}>
                          <TableCell className="font-semibold text-slate-900">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                                {teacher.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <span>{teacher.name}</span>
                                  {teacher.user_id ? (
                                    <Badge variant="success" className="text-[10px] px-1.5 py-0 font-normal">
                                      Portal aktiv
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal text-slate-500">
                                      Kein Login
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs">
                            <div className="space-y-1">
                              {teacher.email && (
                                <div className="flex items-center space-x-1.5">
                                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{teacher.email}</span>
                                </div>
                              )}
                              {teacher.phone && (
                                <div className="flex items-center space-x-1.5">
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  <a href={`tel:${teacher.phone}`} className="text-blue-600 hover:underline">
                                    {teacher.phone}
                                  </a>
                                </div>
                              )}
                              {teacher.birthday && (
                                <div className="flex items-center space-x-1.5 text-slate-400">
                                  <Cake className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Geb.: {new Date(teacher.birthday).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                                </div>
                              )}
                              {!teacher.email && !teacher.phone && !teacher.birthday && (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <Badge variant="outline" className="font-mono">
                                {formatCurrency(Number(teacher.hourly_rate))} / Std.
                              </Badge>
                              {(teacher.rate_group || teacher.rate_individual || teacher.rate_45 || teacher.rate_60 || teacher.rate_90) && (
                                <span className="block text-[10px] text-blue-600 font-medium mt-1">
                                  + Differenzierte Sätze
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700 font-medium">
                            {monthHours.toFixed(1)} Std.
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900">
                            {formatCurrency(monthEarnings)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <EditTeacherDialog teacher={teacher} variant="icon" />
                              <Link href={`/teachers/${teacher.id}`}>
                                <Button variant="outline" size="sm" className="space-x-1 text-xs">
                                  <span>Details &amp; Honorar</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
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
                {teachers.map((teacher) => {
                  const monthHours = monthlyHoursMap.get(teacher.id) || 0;
                  const monthEarnings = monthHours * Number(teacher.hourly_rate);

                  return (
                    <div 
                      key={teacher.id} 
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                            {teacher.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <h3 className="font-bold text-slate-900 text-base leading-tight truncate">
                                {teacher.name}
                              </h3>
                              {teacher.user_id ? (
                                <Badge variant="success" className="text-[10px] px-1.5 py-0 font-normal shrink-0">
                                  Aktiv
                                </Badge>
                              ) : null}
                            </div>
                            <div className="space-y-0.5 mt-0.5 text-xs text-slate-500">
                              {teacher.phone && (
                                <a href={`tel:${teacher.phone}`} className="flex items-center space-x-1 text-blue-600 hover:underline">
                                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{teacher.phone}</span>
                                </a>
                              )}
                              {teacher.email && (
                                <a href={`mailto:${teacher.email}`} className="flex items-center space-x-1 text-slate-500 hover:text-slate-800 truncate">
                                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{teacher.email}</span>
                                </a>
                              )}
                              {teacher.birthday && (
                                <div className="flex items-center space-x-1 text-slate-400">
                                  <Cake className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span>Geb.: {new Date(teacher.birthday).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <Badge variant="outline" className="font-mono text-xs">
                            {formatCurrency(Number(teacher.hourly_rate))}/Std.
                          </Badge>
                          {(teacher.rate_group || teacher.rate_individual || teacher.rate_45 || teacher.rate_60 || teacher.rate_90) && (
                            <span className="block text-[10px] text-blue-600 font-medium mt-0.5">
                              Spezialtarife
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Current Month Summary */}
                      <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-xl">
                          <span className="text-slate-400 block text-[11px]">Geleistete Stunden</span>
                          <span className="font-bold text-slate-800 text-sm">{monthHours.toFixed(1)} Std.</span>
                        </div>
                        <div className="bg-blue-50/70 p-2.5 rounded-xl">
                          <span className="text-blue-600 block text-[11px] font-medium">Lfd. Honorar</span>
                          <span className="font-bold text-blue-900 text-sm">{formatCurrency(monthEarnings)}</span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <EditTeacherDialog teacher={teacher} variant="button" />
                        <Link href={`/teachers/${teacher.id}`} className="flex-1">
                          <Button variant="outline" className="w-full justify-between h-9 text-xs font-semibold">
                            <span>Abrechnen</span>
                            <ArrowRight className="w-4 h-4 text-blue-600" />
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
