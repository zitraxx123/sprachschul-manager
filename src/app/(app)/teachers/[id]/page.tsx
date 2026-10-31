import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteTeacher } from "@/actions/teachers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Euro, 
  Trash2, 
  Mail, 
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
  const { id: teacherId } = await params;
  const { month: selectedMonthParam } = await searchParams;

  const organization = await getActiveOrganization();
  const supabase = await createClient();

  if (!organization) return null;

  // 1. Fetch Teacher
  const { data: teacher } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", teacherId)
    .eq("organization_id", organization.id)
    .single();

  if (!teacher) {
    notFound();
  }

  // Determine active month (default: current YYYY-MM)
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const activeMonth = selectedMonthParam || defaultMonth;

  // 2. Fetch Lessons for this teacher in the active month
  const { data: allTeacherLessons = [] } = await supabase
    .from("lessons")
    .select("*")
    .eq("teacher_id", teacher.id)
    .eq("organization_id", organization.id)
    .order("lesson_date", { ascending: false });

  const monthlyLessons = (allTeacherLessons || []).filter((l) =>
    l.lesson_date.startsWith(activeMonth)
  );

  // 3. Calculate Payroll: (Total Hours) * (Hourly Rate)
  const totalHours = monthlyLessons.reduce(
    (sum, l) => sum + Number(l.duration_hours || 0),
    0
  );
  const hourlyRate = Number(teacher.hourly_rate);
  const totalEarnings = totalHours * hourlyRate;

  // Available months for quick filter (last 6 months)
  const monthOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    return { value, label };
  });

  async function handleDelete() {
    "use server";
    await deleteTeacher(teacherId);
    redirect("/teachers");
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Navigation & Profile Header */}
      <div>
        <Link
          href="/teachers"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Zurück zur Lehrkräfte-Übersicht</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
              {teacher.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{teacher.name}</h1>
                <Badge variant="outline" className="text-xs">Dozent / Lehrkraft</Badge>
              </div>
              <div className="flex items-center space-x-4 mt-1 text-xs text-slate-500">
                {teacher.email && (
                  <span className="flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{teacher.email}</span>
                  </span>
                )}
                <span className="flex items-center space-x-1">
                  <Euro className="w-3.5 h-3.5 text-slate-400" />
                  <span>Stundensatz: <strong>{formatCurrency(hourlyRate)} / Std.</strong></span>
                </span>
              </div>
            </div>
          </div>

          {/* Delete Action */}
          <form action={handleDelete}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span>Lehrkraft löschen</span>
            </Button>
          </form>
        </div>
      </div>

      {/* Month Selector Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
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
      <Card className="border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
        <CardHeader>
          <div className="flex items-center space-x-2 text-blue-600 text-sm font-semibold">
            <Calculator className="w-4 h-4" />
            <span>Monatsabrechnung (Honorarrechner)</span>
          </div>
          <CardTitle className="text-xl">
            Auszahlungsbetrag für {new Date(`${activeMonth}-01`).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Unterrichtsnachweis ({monthlyLessons.length} Einheiten)
            </CardTitle>
            <CardDescription>
              Detailaufstellung der gehaltenen Stunden im gewählten Monat
            </CardDescription>
          </div>
          <Link href="/lessons">
            <Button variant="outline" size="sm" className="space-x-1.5">
              <BookOpen className="w-4 h-4" />
              <span>Neue Stunde erfassen</span>
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {monthlyLessons.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              Im Monat {new Date(`${activeMonth}-01`).toLocaleDateString("de-DE", { month: "long", year: "numeric" })} wurden keine Stunden für diese Lehrkraft erfasst.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Schüler / Kursgruppe</TableHead>
                  <TableHead>Dauer</TableHead>
                  <TableHead className="text-right">Vergütung Einheit</TableHead>
                  <TableHead>Notizen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyLessons.map((lesson) => {
                  const lessonEarnings = Number(lesson.duration_hours) * hourlyRate;
                  return (
                    <TableRow key={lesson.id}>
                      <TableCell className="font-semibold text-slate-900">
                        {formatDate(lesson.lesson_date)}
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {lesson.student_name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{lesson.duration_hours} Std.</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-900">
                        {formatCurrency(lessonEarnings)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 max-w-xs truncate">
                        {lesson.notes || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
