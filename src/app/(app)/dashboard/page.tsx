import Link from "next/link";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Euro, Plus, ArrowRight, UserCheck } from "lucide-react";

export const metadata = {
  title: "Dashboard • Sprachschul-Manager",
};

export default async function DashboardPage() {
  const organization = await getActiveOrganization();
  const supabase = await createClient();

  if (!organization) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">Keine Organisation zugewiesen</h2>
        <p className="text-sm text-slate-500 mt-2">
          Bitte loggen Sie sich erneut ein oder erstellen Sie eine Schule.
        </p>
      </div>
    );
  }

  // 1. Fetch teachers for this organization
  const { data: teachers = [] } = await supabase
    .from("teachers")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name", { ascending: true });

  // 2. Fetch lessons for this organization
  const { data: lessons = [] } = await supabase
    .from("lessons")
    .select("*, teachers(*)")
    .eq("organization_id", organization.id)
    .order("lesson_date", { ascending: false });

  // 3. Compute statistics for current month
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const currentMonthLessons = (lessons || []).filter((l) =>
    l.lesson_date.startsWith(currentYearMonth)
  );

  const totalMonthHours = currentMonthLessons.reduce(
    (sum, l) => sum + Number(l.duration_hours || 0),
    0
  );

  // Map teachers by id for quick lookup
  const teacherMap = new Map((teachers || []).map((t) => [t.id, t]));

  // Calculate total payroll for current month
  const totalMonthPayroll = currentMonthLessons.reduce((sum, l) => {
    const teacher = teacherMap.get(l.teacher_id);
    const rate = Number(teacher?.hourly_rate || 0);
    return sum + Number(l.duration_hours || 0) * rate;
  }, 0);

  // Aggregate monthly hours & earnings per teacher
  const teacherStats = (teachers || []).map((t) => {
    const tLessons = currentMonthLessons.filter((l) => l.teacher_id === t.id);
    const hours = tLessons.reduce((sum, l) => sum + Number(l.duration_hours || 0), 0);
    const earnings = hours * Number(t.hourly_rate);
    return {
      ...t,
      monthHours: hours,
      monthEarnings: earnings,
      lessonCount: tLessons.length,
    };
  });

  const recentLessons = (lessons || []).slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Welcome & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Übersicht: {organization.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Willkommen im Administrationsbereich für Unterrichtsplanung und Honorare.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/teachers">
            <Button variant="outline" size="sm" className="space-x-1.5">
              <Users className="w-4 h-4" />
              <span>Lehrkraft anlegen</span>
            </Button>
          </Link>
          <Link href="/lessons">
            <Button size="sm" className="space-x-1.5">
              <Plus className="w-4 h-4" />
              <span>Stunde erfassen</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Aktive Lehrkräfte</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{teachers?.length || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Dozenten im System erfasst</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Unterricht (Lfd. Monat)
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalMonthHours.toFixed(1)} Std.</div>
            <p className="text-xs text-slate-500 mt-1">
              {currentMonthLessons.length} gehaltene Einheiten im aktuellen Monat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Honorare (Lfd. Monat)
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Euro className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrency(totalMonthPayroll)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Berechnet aus Stundensätzen × gehaltenen Stunden
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Teachers List Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Lehrkräfte & Honorar-Vorschau</CardTitle>
            <CardDescription>
              Stundensätze und berechnetes Gehalt für den laufenden Monat
            </CardDescription>
          </div>
          <Link href="/teachers">
            <Button variant="ghost" size="sm" className="text-blue-600 space-x-1">
              <span>Alle verwalten</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {teacherStats.length === 0 ? (
            <div className="text-center py-10 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <UserCheck className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-700">Noch keine Lehrkräfte angelegt</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Legen Sie Ihren ersten Lehrer an, um Stundensätze und Abrechnungen zu verwalten.
              </p>
              <Link href="/teachers">
                <Button size="sm">Lehrkraft hinzufügen</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Stundensatz</TableHead>
                  <TableHead>Stunden (Monat)</TableHead>
                  <TableHead className="text-right">Gehalt (Monat)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teacherStats.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium text-slate-900">
                      {teacher.name}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {teacher.email || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatCurrency(Number(teacher.hourly_rate))} / Std.</Badge>
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {teacher.monthHours.toFixed(1)} Std. ({teacher.lessonCount} Einheiten)
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      {formatCurrency(teacher.monthEarnings)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/teachers/${teacher.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Lessons Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Zuletzt erfasste Unterrichtsstunden</CardTitle>
            <CardDescription>Die letzten 5 Unterrichtseinheiten Ihrer Schule</CardDescription>
          </div>
          <Link href="/lessons">
            <Button variant="ghost" size="sm" className="text-blue-600 space-x-1">
              <span>Alle Stunden</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentLessons.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">
              Noch keine Unterrichtsstunden erfasst.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Lehrkraft</TableHead>
                  <TableHead>Schüler / Gruppe</TableHead>
                  <TableHead>Dauer</TableHead>
                  <TableHead>Notizen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLessons.map((lesson) => {
                  const teacher = teacherMap.get(lesson.teacher_id);
                  return (
                    <TableRow key={lesson.id}>
                      <TableCell className="font-medium text-slate-900">
                        {formatDate(lesson.lesson_date)}
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {teacher?.name || "Unbekannt"}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {lesson.student_name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{lesson.duration_hours} Std.</Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs truncate max-w-xs">
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
