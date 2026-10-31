import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher, 
  getCurrentMembership 
} from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calculateLessonPayroll } from "@/lib/payroll";
import { deleteTeacher } from "@/actions/teachers";
import { EditTeacherDialog } from "@/components/teachers/edit-teacher-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PrintButton } from "@/components/portal/print-button";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Euro, 
  Trash2, 
  Mail, 
  Phone, 
  Cake, 
  Users, 
  UserCheck, 
  BookOpen, 
  Calculator 
} from "lucide-react";

interface TeacherDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}

export default async function TeacherDetailPage({
  params,
  searchParams,
}: TeacherDetailPageProps) {
  const [
    currentTeacher,
    membership,
    organization,
    resolvedParams,
    resolvedSearchParams
  ] = await Promise.all([
    getCurrentTeacher(),
    getCurrentMembership(),
    getActiveOrganization(),
    params,
    searchParams,
  ]);

  if (currentTeacher && membership?.role === "teacher") {
    redirect("/my-portal");
  }

  const { id: teacherId } = resolvedParams;
  const { month: selectedMonthParam } = resolvedSearchParams;

  if (!organization) return null;

  const supabase = await createClient();

  // Parallel fetch: Teacher details and all teacher lessons
  const [teacherResult, lessonsResult] = await Promise.all([
    supabase
      .from("teachers")
      .select("*")
      .eq("id", teacherId)
      .eq("organization_id", organization.id)
      .single(),
    supabase
      .from("lessons")
      .select("*, courses(*)")
      .eq("teacher_id", teacherId)
      .eq("organization_id", organization.id)
      .order("lesson_date", { ascending: false }),
  ]);

  const teacher = teacherResult.data;

  if (!teacher) {
    notFound();
  }

  // Determine active month (default: current YYYY-MM)
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const activeMonth = selectedMonthParam || defaultMonth;

  const allTeacherLessons = lessonsResult.data || [];
  const monthlyLessons = (allTeacherLessons || []).filter((l) =>
    l.lesson_date.startsWith(activeMonth)
  );

  // 3. Calculate Payroll: Sum of specialized rates per lesson
  const totalHours = monthlyLessons.reduce(
    (sum, l) => sum + Number(l.duration_hours || 0),
    0
  );
  const hourlyRate = Number(teacher.hourly_rate);
  const totalEarnings = monthlyLessons.reduce((sum, l) => {
    const calc = calculateLessonPayroll(
      Number(l.duration_hours || 0),
      (l as unknown as { courses?: { course_type?: string } }).courses?.course_type,
      teacher
    );
    return sum + calc.totalAmount;
  }, 0);

  // Available months for quick filter (last 6 months)
  const monthOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    return { value, label };
  });

  const selectedDate = new Date(`${activeMonth}-01`);
  const monthNameYear = selectedDate.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
  const todayFormatted = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  async function handleDelete() {
    "use server";
    await deleteTeacher(teacherId);
    redirect("/teachers");
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Official Print Document Header (Visible ONLY in print) */}
      <div className="hidden print:block mb-8 pb-4 border-b-2 border-slate-900">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-widest text-slate-500">
              Tätigkeitsnachweis &amp; Honorarabrechnung
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-1">{organization.name}</h1>
            <p className="text-xs text-slate-500">Sprachschule &amp; Weiterbildung</p>
          </div>
          <div className="text-right text-xs text-slate-700 space-y-1">
            <div>Abrechnungsmonat: <strong className="text-slate-900 text-sm">{monthNameYear}</strong></div>
            <div>Druckdatum: <strong className="text-slate-900">{todayFormatted}</strong></div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Lehrkraft / Dozent:</span>
            <span className="text-base font-bold text-slate-900">{teacher.name}</span>
            {teacher.email && <span className="text-slate-500 block">{teacher.email}</span>}
          </div>
          <div className="text-right">
            <span className="text-slate-400 block font-medium">Vertraglicher Stundensatz:</span>
            <span className="text-base font-bold text-slate-900">{formatCurrency(hourlyRate)} / Std.</span>
          </div>
        </div>
      </div>

      {/* Top Navigation & Profile Header */}
      <div className="print:hidden">
        <Link
          href="/teachers"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Zurück zur Lehrkräfte-Übersicht</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-sm shrink-0">
              {teacher.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{teacher.name}</h1>
                <Badge variant="outline" className="text-xs">Dozent / Lehrkraft</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                {teacher.email && (
                  <span className="flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`mailto:${teacher.email}`} className="hover:underline">{teacher.email}</a>
                  </span>
                )}
                {teacher.phone && (
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`tel:${teacher.phone}`} className="text-blue-600 hover:underline">{teacher.phone}</a>
                  </span>
                )}
                {teacher.birthday && (
                  <span className="flex items-center space-x-1 text-slate-600 font-medium">
                    <Cake className="w-3.5 h-3.5 text-amber-500" />
                    <span>Geb.: {new Date(teacher.birthday).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                  </span>
                )}
                <span className="flex items-center space-x-1">
                  <Euro className="w-3.5 h-3.5 text-slate-400" />
                  <span>Basissatz: <strong>{formatCurrency(hourlyRate)} / Std.</strong></span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <EditTeacherDialog teacher={teacher} variant="button" />
            <PrintButton />
            <form action={handleDelete}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                <span>Löschen</span>
              </Button>
            </form>
          </div>
        </div>

        {/* Honorarsätze Strip (if specialized rates are configured) */}
        {(teacher.rate_group || teacher.rate_individual || teacher.rate_45 || teacher.rate_60 || teacher.rate_90) && (
          <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2.5 text-xs">
            <span className="font-bold text-slate-700 flex items-center space-x-1 mr-1">
              <Euro className="w-3.5 h-3.5 text-blue-600" />
              <span>Gültige Honorarsätze:</span>
            </span>
            <Badge variant="outline" className="bg-white font-mono">
              Basissatz: {formatCurrency(hourlyRate)}/Std.
            </Badge>
            {teacher.rate_group && (
              <Badge variant="outline" className="bg-white font-mono text-blue-700 border-blue-200">
                <Users className="w-3 h-3 mr-1" />
                Gruppe: {formatCurrency(Number(teacher.rate_group))}/Std.
              </Badge>
            )}
            {teacher.rate_individual && (
              <Badge variant="outline" className="bg-white font-mono text-purple-700 border-purple-200">
                <UserCheck className="w-3 h-3 mr-1" />
                Einzel: {formatCurrency(Number(teacher.rate_individual))}/Std.
              </Badge>
            )}
            {teacher.rate_45 && (
              <Badge variant="outline" className="bg-white font-mono">
                <Clock className="w-3 h-3 mr-1" />
                45 Min: {formatCurrency(Number(teacher.rate_45))}
              </Badge>
            )}
            {teacher.rate_60 && (
              <Badge variant="outline" className="bg-white font-mono">
                <Clock className="w-3 h-3 mr-1" />
                60 Min: {formatCurrency(Number(teacher.rate_60))}
              </Badge>
            )}
            {teacher.rate_90 && (
              <Badge variant="outline" className="bg-white font-mono">
                <Clock className="w-3 h-3 mr-1" />
                90 Min: {formatCurrency(Number(teacher.rate_90))}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Month Selector Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 print:hidden">
        <div className="flex items-center space-x-2 text-sm font-medium text-slate-700">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Abrechnungsmonat wählen:</span>
        </div>

        <div className="flex items-center space-x-2">
          {monthOptions.map((opt) => (
            <Link
              key={opt.value}
              href={`/teachers/${teacher.id}?month=${opt.value}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeMonth === opt.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Basic Payroll Calculator Card (Core MVP requirement) */}
      <Card className="border-blue-200 bg-gradient-to-br from-white to-blue-50/30 print:hidden">
        <CardHeader>
          <div className="flex items-center space-x-2 text-blue-600 text-sm font-semibold">
            <Calculator className="w-4 h-4" />
            <span>Monatsabrechnung (Honorarrechner)</span>
          </div>
          <CardTitle className="text-xl">
            Auszahlungsbetrag für {monthNameYear}
          </CardTitle>
          <CardDescription>
            Berechnungsgrundlage: (Summe aller Unterrichtsstunden im Monat) × (Vertraglicher Stundensatz)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Geleistete Stunden</span>
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {totalHours.toFixed(1)} <span className="text-sm font-normal text-slate-500">Std.</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{monthlyLessons.length} Unterrichtseinheiten</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium flex items-center space-x-1.5">
                <Euro className="w-3.5 h-3.5 text-slate-400" />
                <span>Vertraglicher Stundensatz</span>
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {formatCurrency(hourlyRate)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Vergütung pro 60 Minuten</p>
            </div>

            <div className="bg-blue-600 text-white p-4 rounded-xl shadow-md">
              <span className="text-xs text-blue-100 font-medium flex items-center space-x-1.5">
                <Calculator className="w-3.5 h-3.5 text-blue-200" />
                <span>Auszahlungs-Honorar</span>
              </span>
              <div className="text-3xl font-extrabold mt-2">
                {formatCurrency(totalEarnings)}
              </div>
              <p className="text-[11px] text-blue-100 mt-1 font-mono">
                {totalHours.toFixed(1)} Std. × {formatCurrency(hourlyRate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lesson Details for this Month */}
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="flex flex-row items-center justify-between print:hidden">
          <div>
            <CardTitle className="text-base font-semibold">
              Unterrichtsnachweis ({monthlyLessons.length} Einheiten)
            </CardTitle>
            <CardDescription>
              Detailaufstellung der gehaltenen Stunden im gewählten Monat
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <PrintButton />
            <Link href="/lessons">
              <Button variant="outline" size="sm" className="space-x-1.5">
                <BookOpen className="w-4 h-4" />
                <span>Neue Stunde erfassen</span>
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="print:p-0">
          {monthlyLessons.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={`Keine Unterrichtsstunden im ${monthNameYear}`}
              description="Für diesen Monat wurden für diese Lehrkraft noch keine Einheiten im System erfasst."
            >
              <Link href="/lessons">
                <Button size="sm" className="space-x-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>Stunde jetzt erfassen</span>
                </Button>
              </Link>
            </EmptyState>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="print:border-slate-300">
                      <TableHead>Datum</TableHead>
                      <TableHead>Schüler / Kursgruppe</TableHead>
                      <TableHead>Dauer</TableHead>
                      <TableHead className="text-right">Vergütung Einheit</TableHead>
                      <TableHead>Notizen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyLessons.map((lesson) => {
                      const calc = calculateLessonPayroll(
                        Number(lesson.duration_hours || 0),
                        (lesson as unknown as { courses?: { course_type?: string } }).courses?.course_type,
                        teacher
                      );

                      return (
                        <TableRow key={lesson.id} className="print:border-slate-200">
                          <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                            {formatDate(lesson.lesson_date)}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            <div>
                              <span className="font-medium text-slate-800">{lesson.student_name || "—"}</span>
                              {(lesson as unknown as { courses?: { course_type?: string } }).courses?.course_type === "individual" ? (
                                <span className="block text-[10px] text-emerald-600 font-semibold">
                                  Einzelunterricht (1:1)
                                </span>
                              ) : (
                                <span className="block text-[10px] text-slate-400">
                                  Gruppenunterricht
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="print:bg-transparent print:border-none print:p-0 print:font-semibold">
                              {lesson.duration_hours} Std.
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-slate-900 block">{formatCurrency(calc.totalAmount)}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {formatCurrency(calc.rateUsed)} ({calc.rateDescription})
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-400 max-w-xs truncate print:max-w-none print:whitespace-normal">
                            {lesson.notes || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter className="bg-slate-50 print:bg-slate-100 font-semibold text-slate-900 border-t-2 border-slate-300">
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold">
                        Gesamtsumme ({monthNameYear})
                      </TableCell>
                      <TableCell className="font-bold">
                        {totalHours.toFixed(1)} Std.
                      </TableCell>
                      <TableCell className="text-right font-black text-base text-emerald-700 print:text-black">
                        {formatCurrency(totalEarnings)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {monthlyLessons.length} {monthlyLessons.length === 1 ? "Einheit" : "Einheiten"}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {/* Mobile Card View (No horizontal scrolling on phones) */}
              <div className="md:hidden space-y-3">
                {monthlyLessons.map((lesson) => {
                  const calc = calculateLessonPayroll(
                    Number(lesson.duration_hours || 0),
                    (lesson as unknown as { courses?: { course_type?: string } }).courses?.course_type,
                    teacher
                  );

                  return (
                    <div
                      key={lesson.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 font-semibold text-slate-900">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(lesson.lesson_date)}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {lesson.duration_hours} Std.
                        </Badge>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {lesson.student_name || "Unterrichtseinheit"}
                          </h4>
                          {(lesson as unknown as { courses?: { course_type?: string } }).courses?.course_type === "individual" ? (
                            <span className="text-[10px] text-emerald-600 font-semibold block">
                              Einzelunterricht (1:1)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">
                              Gruppenunterricht
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-extrabold text-slate-900 block">
                            {formatCurrency(calc.totalAmount)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {formatCurrency(calc.rateUsed)} ({calc.rateDescription})
                          </span>
                        </div>
                      </div>

                      {lesson.notes && (
                        <p className="text-xs text-slate-400 italic pt-1.5 border-t border-slate-100 truncate">
                          &quot;{lesson.notes}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Mobile Monthly Total Card */}
                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Gesamt ({monthNameYear})</span>
                    <span className="text-[11px] text-slate-500">{totalHours.toFixed(1)} Std. • {monthlyLessons.length} Einheiten</span>
                  </div>
                  <span className="text-lg font-black text-emerald-700">
                    {formatCurrency(totalEarnings)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Official Print Document Footer & Signatures (Visible ONLY in print) */}
      <div className="hidden print:block mt-8 pt-4 text-xs">
        <div className="flex justify-between items-center mb-6 bg-slate-100 p-4 rounded-lg border border-slate-300">
          <span className="text-sm font-bold text-slate-900">Gesamtbetrag zur Auszahlung:</span>
          <span className="text-xl font-black text-slate-900">{formatCurrency(totalEarnings)}</span>
        </div>
        <p className="text-slate-500 italic mb-14">
          Hiermit wird die sachliche und rechnerische Richtigkeit der oben aufgeführten Unterrichtseinheiten bestätigt.
        </p>
        <div className="grid grid-cols-2 gap-16 pt-8">
          <div className="border-t border-slate-500 pt-2 text-center text-slate-700">
            Ort, Datum / Unterschrift Lehrkraft ({teacher.name})
          </div>
          <div className="border-t border-slate-500 pt-2 text-center text-slate-700">
            Unterschrift Schulleitung ({organization.name})
          </div>
        </div>
      </div>
    </div>
  );
}
