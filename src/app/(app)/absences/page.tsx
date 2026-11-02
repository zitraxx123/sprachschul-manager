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
import { getTranslations, getLocale } from "next-intl/server";

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

  const [organization, currentTeacher, membership, tAbsences, tCommon, locale] = await Promise.all([
    getActiveOrganization(),
    getCurrentTeacher(),
    getCurrentMembership(),
    getTranslations("absences"),
    getTranslations("common"),
    getLocale(),
  ]);

  if (!organization) {
    return <CreateOrganizationCard />;
  }

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
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {tAbsences("title")}
            </h1>
            {isTeacher ? (
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs">
                <User strokeWidth={1.5} className="w-4 h-4 mr-1" />
                {tAbsences("yourCourses", { teacher: currentTeacher?.name || "" })}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-xs">
                <ShieldCheck strokeWidth={1.5} className="w-4 h-4 mr-1" />
                {tAbsences("schoolLeadership")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {tAbsences("subtitle")}{" "}
            <strong className="text-slate-800 dark:text-slate-200">{rangeInfo.label}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <PrintButton />
        </div>
      </div>

      {/* 2. KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Absences */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <UserX strokeWidth={1.5} className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tAbsences("totalAbsences")}</p>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {totalAbsences} <span className="text-xs text-slate-400 font-normal">{tAbsences("inPeriod")}</span>
            </p>
          </div>
        </div>

        {/* Affected Students */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Users strokeWidth={1.5} className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tAbsences("affectedStudents")}</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {uniqueStudentsCount} <span className="text-xs text-slate-400 font-normal">{tAbsences("studentsCount", { count: uniqueStudentsCount })}</span>
            </p>
          </div>
        </div>

        {/* Affected Courses */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Layers strokeWidth={1.5} className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tAbsences("affectedCourses")}</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {uniqueCoursesCount} <span className="text-xs text-slate-400 font-normal">{tAbsences("coursesCount", { count: uniqueCoursesCount })}</span>
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
                {tAbsences("recordedAbsences", { count: totalAbsences })}
              </CardTitle>
              <CardDescription>
                {tAbsences("recordedViaAttendance", { range: rangeInfo.label })}
              </CardDescription>
            </div>
            {totalAbsences > 0 && (
              <Badge variant="destructive" className="self-start sm:self-auto font-mono text-xs">
                {totalAbsences} {totalAbsences === 1 ? tAbsences("absenceSingular") : tAbsences("absencePlural")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {totalAbsences === 0 ? (
            <div className="text-center py-14 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <CheckCircle2 strokeWidth={1.5} className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {tAbsences("noAbsencesInPeriod")}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                {tAbsences("noAbsencesInPeriodDesc", { range: rangeInfo.label })}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View (Hidden on mobile) */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tAbsences("tableDate")}</TableHead>
                      <TableHead>{tAbsences("tableStudent")}</TableHead>
                      <TableHead>{tAbsences("tableCourse")}</TableHead>
                      <TableHead>{tAbsences("tableTeacher")}</TableHead>
                      <TableHead>{tAbsences("tableStatus")}</TableHead>
                      <TableHead className="text-right">{tAbsences("tableNotes")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {absences.map((record) => (
                      <TableRow key={record.attendanceId}>
                        {/* Datum */}
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Calendar strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                            <span>{formatDate(record.lessonDate, locale)}</span>
                          </div>
                        </TableCell>

                        {/* Schüler */}
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {record.studentName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold leading-tight">{record.studentName}</p>
                              <div className="text-[11px] text-slate-400 dark:text-slate-500 space-y-0.5 mt-0.5">
                                {record.studentEmail && (
                                  <div className="flex items-center space-x-1">
                                    <Mail strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                                    <span>{record.studentEmail}</span>
                                  </div>
                                )}
                                {record.studentPhone && (
                                  <div className="flex items-center space-x-1">
                                    <Phone strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                                    <span>{record.studentPhone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Kurs */}
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 font-medium text-xs">
                            <Layers strokeWidth={1.5} className="w-4 h-4 mr-1 text-blue-500" />
                            <span>{record.courseName}</span>
                          </Badge>
                          <span className="block text-[11px] text-slate-400 mt-0.5">
                            {tAbsences("lessonHoursBadge", { hours: record.durationHours })}
                          </span>
                        </TableCell>

                        {/* Lehrkraft */}
                        <TableCell className="text-slate-700 dark:text-slate-300 text-xs font-medium">
                          <div className="flex items-center space-x-2">
                            <User strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                            <span>{record.teacherName}</span>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant="destructive" className="space-x-1 py-1 font-semibold text-[10px]">
                            <UserX strokeWidth={1.5} className="w-4 h-4" />
                            <span>{tAbsences("unexcused")}</span>
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
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
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
                                <Phone strokeWidth={1.5} className="w-4 h-4 shrink-0" />
                                <span>{record.studentPhone}</span>
                              </a>
                            ) : record.studentEmail ? (
                              <a href={`mailto:${record.studentEmail}`} className="flex items-center space-x-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 truncate">
                                <Mail strokeWidth={1.5} className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="truncate">{record.studentEmail}</span>
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <Badge variant="destructive" className="shrink-0 text-xs py-1 px-2 font-semibold">
                        <UserX strokeWidth={1.5} className="w-4 h-4 mr-1" />
                        <span>{tAbsences("unexcused")}</span>
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center space-x-1 font-semibold text-slate-900 dark:text-slate-100">
                        <Calendar strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                        <span>{formatDate(record.lessonDate, locale)}</span>
                      </div>
                      <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 font-medium py-0.5 border-slate-200 dark:border-slate-700">
                        <Layers strokeWidth={1.5} className="w-4 h-4 mr-1 text-blue-500 dark:text-blue-400" />
                        <span>{record.courseName}</span>
                      </Badge>
                      <span className="text-slate-400">•</span>
                      <span>{tCommon("teacher")}: {record.teacherName}</span>
                    </div>

                    {record.notes && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-xl">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">{tAbsences("noteLabel")}</span>
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
