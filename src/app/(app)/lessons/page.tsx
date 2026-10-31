import { createClient, getActiveOrganization } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AddLessonDialog } from "@/components/lessons/add-lesson-dialog";
import { DeleteLessonButton } from "@/components/lessons/delete-lesson-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, Clock, Euro } from "lucide-react";

export const metadata = {
  title: "Unterrichtsstunden • Sprachschul-Manager",
};

export default async function LessonsPage() {
  const organization = await getActiveOrganization();
  const supabase = await createClient();

  if (!organization) return null;

  // 1. Fetch Teachers for dropdown in AddLessonDialog
  const { data: teachers = [] } = await supabase
    .from("teachers")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name", { ascending: true });

  // 2. Fetch Lessons with their Teacher
  const { data: lessons = [] } = await supabase
    .from("lessons")
    .select("*, teachers(*)")
    .eq("organization_id", organization.id)
    .order("lesson_date", { ascending: false });

  // Map teachers by id
  const teacherMap = new Map((teachers || []).map((t) => [t.id, t]));

  // Calculate totals
  const totalHours = (lessons || []).reduce(
    (sum, l) => sum + Number(l.duration_hours || 0),
    0
  );

  const totalHonorare = (lessons || []).reduce((sum, l) => {
    const teacher = teacherMap.get(l.teacher_id);
    const rate = Number(teacher?.hourly_rate || 0);
    return sum + Number(l.duration_hours || 0) * rate;
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Unterrichtsstunden (Klassenbuch)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Erfassung aller Unterrichtseinheiten für die Honorarabrechnung und Teilnehmernachweiserbringung.
          </p>
        </div>

        <AddLessonDialog teachers={teachers || []} />
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Gesamte Einheiten</p>
            <p className="text-xl font-bold text-slate-900">{lessons?.length || 0}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Unterrichtete Stunden</p>
            <p className="text-xl font-bold text-slate-900">{totalHours.toFixed(1)} Std.</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Euro className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Summe fälliger Honorare</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(totalHonorare)}</p>
          </div>
        </div>
      </div>

      {/* Lessons Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Alle erfassten Stunden</CardTitle>
          <CardDescription>
            Sortiert nach Datum (neueste zuerst). Jede erfasste Stunde fließt direkt in die Dozentenabrechnung ein.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!lessons || lessons.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Noch keine Stunden erfasst</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Erfassen Sie die erste Unterrichtseinheit über den oberen Button.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Lehrkraft</TableHead>
                  <TableHead>Schüler / Kurs</TableHead>
                  <TableHead>Dauer</TableHead>
                  <TableHead>Satz / Std.</TableHead>
                  <TableHead className="text-right">Honorar</TableHead>
                  <TableHead>Notizen</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons.map((lesson) => {
                  const teacher = teacherMap.get(lesson.teacher_id);
                  const rate = Number(teacher?.hourly_rate || 0);
                  const honorar = Number(lesson.duration_hours) * rate;

                  return (
                    <TableRow key={lesson.id}>
                      <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                        {formatDate(lesson.lesson_date)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        {teacher?.name || "Unbekannter Dozent"}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {lesson.student_name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{lesson.duration_hours} Std.</Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs">
                        {formatCurrency(rate)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {formatCurrency(honorar)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 max-w-xs truncate">
                        {lesson.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DeleteLessonButton lessonId={lesson.id} />
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
