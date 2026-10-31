import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher, 
  getCurrentMembership 
} from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { getAbsencesReport } from "@/actions/absences";
import { AbsenceFilterBar } from "@/components/absences/absence-filter-bar";
import { PrintButton } from "@/components/portal/print-button";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  UserX, 
  Users, 
  Layers, 
  User, 
  Mail, 
  Phone, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar 
} from "lucide-react";

interface AbsencesPageProps {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    teacher_id?: string;
  }>;
}

export const metadata = {
  title: "Fehlzeiten & Abwesenheitsbericht • Sprachschul-Manager",
};

export default async function AbsencesPage({ searchParams }: AbsencesPageProps) {
  const { range, from, to, teacher_id: teacherId } = await searchParams;

  const organization = await getActiveOrganization();
  if (!organization) {
    return <CreateOrganizationCard />;
  }

  const currentTeacher = await getCurrentTeacher();
  const membership = await getCurrentMembership();
  const isTeacher = !!(currentTeacher && membership?.role === "teacher");

  const supabase = await createClient();

  // Fetch teachers for the admin filter dropdown
  const { data: teachers = [] } = !isTeacher
    ? await supabase
        .from("teachers")
        .select("id, name")
        .eq("organization_id", organization.id)
        .order("name", { ascending: true })
    : { data: [] };

  // Fetch absences report data
  const report = await getAbsencesReport({
    range,
    from,
    to,
    teacherId,
  });

  const { data: absences, totalAbsences, uniqueStudentsCount, uniqueCoursesCount, range: rangeInfo } = report;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 1. Header with Mode Badge & Print Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Fehlzeiten &amp; Abwesenheitsbericht
            </h1>
            {isTeacher ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                <User className="w-3 h-3 mr-1" />
                Ihre Kurse ({currentTeacher?.name})
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Schulleitung (Gesamtschule)
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Auswertung aller unentschuldigten und erfassten Fehlzeiten aus dem Klassenbuch für:{" "}
            <strong className="text-slate-800">{rangeInfo.label}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <PrintButton />
        </div>
      </div>

      {/* 2. KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Absences */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gesamte Fehlzeiten</p>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {totalAbsences} <span className="text-xs text-slate-400 font-normal">im Zeitraum</span>
            </p>
          </div>
        </div>

        {/* Affected Students */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Betroffene Schüler</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {uniqueStudentsCount} <span className="text-xs text-slate-400 font-normal">Schüler</span>
            </p>
          </div>
        </div>

        {/* Affected Courses */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Betroffene Kurse / Gruppen</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {uniqueCoursesCount} <span className="text-xs text-slate-400 font-normal">Kurse</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Date Range Filter Bar */}
      <AbsenceFilterBar
        currentPreset={rangeInfo.preset}
        currentFrom={rangeInfo.from}
        currentTo={rangeInfo.to}
        currentTeacherId={teacherId}
        teachers={teachers || []}
        isTeacher={isTeacher}
      />

      {/* 4. Absences Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">
                Protokollierte Abwesenheiten ({totalAbsences})
              </CardTitle>
              <CardDescription>
                Zeitraum: {rangeInfo.label} • Dokumentiert über die Anwesenheitserfassung
              </CardDescription>
            </div>
            {totalAbsences > 0 && (
              <Badge variant="destructive" className="self-start sm:self-auto font-mono text-xs">
                {totalAbsences} {totalAbsences === 1 ? "Fehlzeit" : "Fehlzeiten"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {totalAbsences === 0 ? (
            <div className="text-center py-14 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-slate-800">
                Keine Fehlzeiten im gewählten Zeitraum
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Für {rangeInfo.label} wurden keine unentschuldigten Abwesenheiten für Ihre Auswahl dokumentiert.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View (Hidden on mobile) */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Schüler</TableHead>
                      <TableHead>Kurs / Gruppe</TableHead>
                      <TableHead>Lehrkraft</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Unterrichtsnotiz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {absences.map((record) => (
                      <TableRow key={record.attendanceId}>
                        {/* Datum */}
                        <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDate(record.lessonDate)}</span>
                          </div>
                        </TableCell>

                        {/* Schüler */}
                        <TableCell className="font-medium text-slate-900">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center shrink-0">
                              {record.studentName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold leading-tight">{record.studentName}</p>
                              <div className="text-[11px] text-slate-400 space-y-0.5 mt-0.5">
                                {record.studentEmail && (
                                  <div className="flex items-center space-x-1">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    <span>{record.studentEmail}</span>
                                  </div>
                                )}
                                {record.studentPhone && (
                                  <div className="flex items-center space-x-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{record.studentPhone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Kurs */}
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50 font-medium text-xs">
                            <Layers className="w-3 h-3 mr-1 text-blue-500" />
                            <span>{record.courseName}</span>
                          </Badge>
                          <span className="block text-[11px] text-slate-400 mt-0.5">
                            {record.durationHours} Std. Unterricht
                          </span>
                        </TableCell>

                        {/* Lehrkraft */}
                        <TableCell className="text-slate-700 text-xs font-medium">
                          <div className="flex items-center space-x-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{record.teacherName}</span>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant="destructive" className="space-x-1 py-1 font-semibold text-[10px]">
                            <UserX className="w-3 h-3" />
                            <span>Abwesend</span>
                          </Badge>
                        </TableCell>

                        {/* Unterrichtsnotiz */}
                        <TableCell className="text-right text-xs text-slate-400 max-w-xs truncate">
                          {record.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Native Card View (Shown on screens < md) */}
              <div className="md:hidden space-y-3">
                {absences.map((record) => (
                  <div 
                    key={record.attendanceId} 
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold text-sm flex items-center justify-center shrink-0">
                          {record.studentName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight truncate">
                            {record.studentName}
                          </h3>
                          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {record.studentPhone ? (
                              <a href={`tel:${record.studentPhone}`} className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline">
                                <Phone className="w-3 h-3 shrink-0" />
                                <span>{record.studentPhone}</span>
                              </a>
                            ) : record.studentEmail ? (
                              <a href={`mailto:${record.studentEmail}`} className="flex items-center space-x-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 truncate">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{record.studentEmail}</span>
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <Badge variant="destructive" className="shrink-0 text-xs py-1 px-2 font-semibold">
                        <UserX className="w-3.5 h-3.5 mr-1" />
                        <span>Abwesend</span>
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center space-x-1 font-semibold text-slate-900 dark:text-slate-100">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(record.lessonDate)}</span>
                      </div>
                      <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 font-medium py-0.5 border-slate-200 dark:border-slate-700">
                        <Layers className="w-3 h-3 mr-1 text-blue-500 dark:text-blue-400" />
                        <span>{record.courseName}</span>
                      </Badge>
                      <span className="text-slate-400">•</span>
                      <span>Dozent: {record.teacherName}</span>
                    </div>

                    {record.notes && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Notiz:</span>
                        <p className="italic">&quot;{record.notes}&quot;</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
