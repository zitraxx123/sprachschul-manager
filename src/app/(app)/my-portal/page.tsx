import Link from "next/link";
import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher 
} from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Euro, 
  Calendar, 
  GraduationCap, 
  CheckCircle2, 
  BookOpen 
} from "lucide-react";

interface MyPortalPageProps {
  searchParams: Promise<{ month?: string }>;
}

export const metadata = {
  title: "Mein Dozenten-Portal • Sprachschul-Manager",
};

export default async function MyPortalPage({ searchParams }: MyPortalPageProps) {
  const { month: selectedMonthParam } = await searchParams;

  const organization = await getActiveOrganization();
  const teacher = await getCurrentTeacher();
  const supabase = await createClient();

  if (!organization || !teacher) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Card className="p-8">
          <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Kein Dozenten-Profil gefunden</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Ihr Benutzerkonto ist aktuell noch keiner Lehrkraft in dieser Schule zugeordnet.
            Bitte wenden Sie sich an die Schulleitung ({organization?.name || "Sprachschule"}), 
            damit diese Ihre E-Mail-Adresse im System hinterlegt.
          </p>
          <Link href="/dashboard" className="text-sm text-blue-600 font-medium hover:underline">
            Zurück zur Übersicht
          </Link>
        </Card>
      </div>
    );
  }

  // Active month calculation
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const activeMonth = selectedMonthParam || defaultMonth;

  // Month selector choices (past 6 months)
  const monthOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    return { value, label };
  });

  // Fetch only this teacher's lessons (RLS also strictly enforces this on DB level)
  const { data: allLessons = [] } = await supabase
    .from("lessons")
    .select("*")
    .eq("teacher_id", teacher.id)
    .order("lesson_date", { ascending: false });

  // Filter lessons for the chosen month
  const monthlyLessons = (allLessons || []).filter((l) =>
    l.lesson_date.startsWith(activeMonth)
  );

  // Calculate monthly stats
  const totalHours = monthlyLessons.reduce(
    (sum, l) => sum + Number(l.duration_hours || 0),
    0
  );
  const hourlyRate = Number(teacher.hourly_rate);
  const totalEarnings = totalHours * hourlyRate;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Welcome & Teacher Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
            {teacher.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Willkommen, {teacher.name}!
              </h1>
              <Badge variant="success" className="text-xs">
                Lehrkraft
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Schule: <strong>{organization.name}</strong> • Dozenten-Portal &amp; Abrechnung
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-medium text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
          <Euro className="w-4 h-4 text-emerald-600" />
          <span>Vertraglicher Satz: <strong>{formatCurrency(hourlyRate)} / Std.</strong></span>
        </div>
      </div>

      {/* Month Filter Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 gap-3">
        <div className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Abrechnungsmonat:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {monthOptions.map((opt) => (
            <Link
              key={opt.value}
              href={`/my-portal?month=${opt.value}`}
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

      {/* Core KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Meine Stunden */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Meine Stunden ({new Date(`${activeMonth}-01`).toLocaleDateString("de-DE", { month: "short" })})
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {totalHours.toFixed(1)} <span className="text-sm font-normal text-slate-500">Std.</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {monthlyLessons.length} gehaltene Unterrichtseinheiten
            </p>
          </CardContent>
        </Card>

        {/* Mein Gehalt */}
        <Card className="shadow-sm border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800">
              Mein Gehalt / Honorar
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Euro className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-700">
              {formatCurrency(totalEarnings)}
            </div>
            <p className="text-xs text-emerald-600 mt-1 font-mono">
              {totalHours.toFixed(1)} Std. × {formatCurrency(hourlyRate)}
            </p>
          </CardContent>
        </Card>

        {/* Status / Abrechnungsnachweis */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Abrechnungsstatus
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-slate-800">
              Automatisch erfasst
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Gerechnet nach GoBD &amp; vertraglichem Dozentensatz
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table: Meine letzten Stunden */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base font-semibold">
              Meine letzten Stunden ({monthlyLessons.length} Einheiten)
            </CardTitle>
          </div>
          <CardDescription>
            Übersicht aller erfassten Unterrichtsstunden für den Monat{" "}
            {new Date(`${activeMonth}-01`).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyLessons.length === 0 ? (
            <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-700">Keine Stunden in diesem Monat</p>
              <p className="text-xs text-slate-400 mt-1">
                Sobald Unterrichtsstunden für Sie eingetragen werden, erscheinen sie hier inklusive Berechnung.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Schüler / Kursgruppe</TableHead>
                  <TableHead>Dauer</TableHead>
                  <TableHead>Stundensatz</TableHead>
                  <TableHead className="text-right">Vergütung</TableHead>
                  <TableHead>Notizen / Thema</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyLessons.map((lesson) => {
                  const lessonEarnings = Number(lesson.duration_hours) * hourlyRate;
                  return (
                    <TableRow key={lesson.id}>
                      <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                        {formatDate(lesson.lesson_date)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        {lesson.student_name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{lesson.duration_hours} Std.</Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs">
                        {formatCurrency(hourlyRate)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">
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
