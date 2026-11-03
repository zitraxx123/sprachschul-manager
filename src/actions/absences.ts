"use server";

import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher, 
  getCurrentMembership 
} from "@/lib/supabase/server";
import { getTeacherDirectory, attachTeachers } from "@/lib/teacher-directory";

export type AbsenceRecord = {
  attendanceId: string;
  lessonId: string;
  lessonDate: string;
  durationHours: number;
  courseName: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
  notes: string | null;
};

export type AbsenceFilterParams = {
  range?: "today" | "this_week" | "this_month" | "all" | "custom" | string;
  from?: string;
  to?: string;
  teacherId?: string;
};

export type AbsencesReportResult = {
  data: AbsenceRecord[];
  totalAbsences: number;
  uniqueStudentsCount: number;
  uniqueCoursesCount: number;
  isTeacher: boolean;
  currentTeacherName?: string;
  range: {
    from?: string;
    to?: string;
    label: string;
    preset: string;
  };
  error?: string;
};

function calculateDateRange(params?: AbsenceFilterParams) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const preset = params?.range || (params?.from || params?.to ? "custom" : "today");

  if (preset === "today") {
    return {
      from: todayStr,
      to: todayStr,
      label: `Heute (${now.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })})`,
      preset: "today",
    };
  }

  if (preset === "this_week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const from = monday.toISOString().split("T")[0];
    const to = sunday.toISOString().split("T")[0];
    const fromLabel = monday.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
    const toLabel = sunday.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

    return {
      from,
      to,
      label: `Diese Woche (${fromLabel} – ${toLabel})`,
      preset: "this_week",
    };
  }

  if (preset === "this_month") {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDate = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0);

    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDate.getDate()).padStart(2, "0")}`;
    const monthLabel = firstDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

    return {
      from,
      to,
      label: `Dieser Monat (${monthLabel})`,
      preset: "this_month",
    };
  }

  if (preset === "all") {
    return {
      from: undefined,
      to: undefined,
      label: "Gesamter Zeitraum (Alle)",
      preset: "all",
    };
  }

  // Custom range
  const customFrom = params?.from || undefined;
  const customTo = params?.to || undefined;
  let customLabel = "Benutzerdefinierter Zeitraum";
  if (customFrom && customTo) {
    customLabel = `${customFrom} bis ${customTo}`;
  } else if (customFrom) {
    customLabel = `Ab ${customFrom}`;
  } else if (customTo) {
    customLabel = `Bis ${customTo}`;
  }

  return {
    from: customFrom,
    to: customTo,
    label: customLabel,
    preset: "custom",
  };
}

export async function getAbsencesReport(
  params?: AbsenceFilterParams
): Promise<AbsencesReportResult> {
  const organization = await getActiveOrganization();
  const rangeInfo = calculateDateRange(params);

  if (!organization) {
    return {
      data: [],
      totalAbsences: 0,
      uniqueStudentsCount: 0,
      uniqueCoursesCount: 0,
      isTeacher: false,
      range: rangeInfo,
      error: "Keine aktive Organisation gefunden.",
    };
  }

  const currentTeacher = await getCurrentTeacher();
  const membership = await getCurrentMembership();
  const isTeacherOnly = !!(currentTeacher && membership?.role === "teacher");

  const supabase = await createClient();

  let query = supabase
    .from("attendance")
    .select(`
      id,
      status,
      created_at,
      students (
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      lessons!inner (
        id,
        lesson_date,
        duration_hours,
        student_name,
        teacher_id,
        notes,
        teachers!lessons_teacher_id_fkey (
          id,
          name
        ),
        courses (
          id,
          name
        )
      )
    `)
    .eq("organization_id", organization.id)
    .eq("status", "absent");

  // Date range filters
  if (rangeInfo.from) {
    query = query.gte("lessons.lesson_date", rangeInfo.from);
  }
  if (rangeInfo.to) {
    query = query.lte("lessons.lesson_date", rangeInfo.to);
  }

  // Role-based filtering:
  // Teachers ONLY see absences from their own courses/lessons
  if (isTeacherOnly && currentTeacher) {
    query = query.eq("lessons.teacher_id", currentTeacher.id);
  } else if (params?.teacherId) {
    // Admin optional filter by teacher
    query = query.eq("lessons.teacher_id", params.teacherId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching absences report:", error);
    return {
      data: [],
      totalAbsences: 0,
      uniqueStudentsCount: 0,
      uniqueCoursesCount: 0,
      isTeacher: isTeacherOnly,
      currentTeacherName: currentTeacher?.name,
      range: rangeInfo,
      error: error.message,
    };
  }

  // The assistant cannot read the teachers table: fill in names from the directory view
  if (membership?.role === "assistant") {
    attachTeachers(data, await getTeacherDirectory(supabase, organization.id));
  }

  // Map into typed records
  type SupabaseAbsenceRow = {
    id: string;
    students: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null } | null;
    lessons: {
      id: string;
      lesson_date: string;
      duration_hours: number;
      student_name: string | null;
      teacher_id: string;
      notes: string | null;
      teachers: { id: string; name: string } | null;
      courses: { id: string; name: string } | null;
    } | null;
  };

  const records: AbsenceRecord[] = ((data as unknown as SupabaseAbsenceRow[]) || []).map((row) => {
    const student = row.students;
    const lesson = row.lessons;
    const teacher = lesson?.teachers;
    const course = lesson?.courses;

    return {
      attendanceId: row.id,
      lessonId: lesson?.id || "",
      lessonDate: lesson?.lesson_date || "",
      durationHours: Number(lesson?.duration_hours || 0),
      courseName: course?.name || lesson?.student_name || "Kurs",
      teacherId: teacher?.id || lesson?.teacher_id || "",
      teacherName: teacher?.name || "Lehrkraft",
      studentId: student?.id || "",
      studentName: student ? `${student.first_name} ${student.last_name}` : "Schüler",
      studentEmail: student?.email || null,
      studentPhone: student?.phone || null,
      notes: lesson?.notes || null,
    };
  });

  // Sort descending by lesson date
  records.sort((a, b) => b.lessonDate.localeCompare(a.lessonDate));

  const uniqueStudents = new Set(records.map((r) => r.studentId).filter(Boolean));
  const uniqueCourses = new Set(records.map((r) => r.courseName).filter(Boolean));

  return {
    data: records,
    totalAbsences: records.length,
    uniqueStudentsCount: uniqueStudents.size,
    uniqueCoursesCount: uniqueCourses.size,
    isTeacher: isTeacherOnly,
    currentTeacherName: currentTeacher?.name,
    range: rangeInfo,
  };
}
