import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/config";
import { generateIcsFeed, IcsCourseItem } from "@/lib/calendar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteParams {
  params: Promise<{
    teacher_id: string;
  }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: RouteParams) {
  const { teacher_id } = await params;

  if (!teacher_id || !UUID_REGEX.test(teacher_id)) {
    return new Response("Ungültige Dozenten-ID (Format: UUID)", { status: 400 });
  }

  // Use service role key if available, otherwise anon key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getSupabaseAnonKey();
  const supabase = createClient<Database>(getSupabaseUrl(), supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let teacherName = "";
  let organizationName = "Sprachschule";
  let coursesList: IcsCourseItem[] = [];

  // Attempt 1: Call secure RPC function get_teacher_calendar_data
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
      "get_teacher_calendar_data",
      { p_teacher_id: teacher_id }
    );

    if (!rpcError && rpcData && rpcData.teacher) {
      teacherName = rpcData.teacher.name || "Lehrkraft";
      organizationName = rpcData.organization_name || "Sprachschule";
      coursesList = (rpcData.courses || []) as IcsCourseItem[];
    }
  } catch {
    // Fallback if RPC is not installed or errors
  }

  // Attempt 2: If RPC didn't return, query tables directly (works with service role or open RLS)
  if (!teacherName) {
    try {
      const { data: teacher, error: teacherErr } = await supabase
        .from("teachers")
        .select("id, name, email, organizations(name)")
        .eq("id", teacher_id)
        .maybeSingle();

      if (teacherErr || !teacher) {
        return new Response("Dozent nicht gefunden", { status: 404 });
      }

      teacherName = teacher.name;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      organizationName = (teacher as any).organizations?.name || "Sprachschule";

      // Query courses with schedules, rooms and students
      const { data: coursesData } = await supabase
        .from("courses")
        .select(`
          id,
          name,
          course_type,
          description,
          rooms(id, name),
          course_schedules(id, day_of_week, start_time, duration),
          student_courses(students(first_name, last_name))
        `)
        .eq("teacher_id", teacher_id);

      coursesList = (coursesData || []).map((c) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawC = c as any;
        const studentNames: string[] = (rawC.student_courses || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((sc: any) => sc.students ? `${sc.students.first_name} ${sc.students.last_name}`.trim() : "")
          .filter(Boolean);

        return {
          id: c.id,
          name: c.name,
          course_type: c.course_type,
          description: c.description,
          room_name: rawC.rooms?.name || null,
          schedules: (rawC.course_schedules || []).map((s: {
            id: string;
            day_of_week: string;
            start_time: string;
            duration: number;
          }) => ({
            id: s.id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            duration: Number(s.duration) || 1.5,
          })),
          students: studentNames,
        };
      });
    } catch (err) {
      console.error("Error fetching teacher calendar:", err);
      return new Response("Interner Serverfehler beim Laden des Kalenders", { status: 500 });
    }
  }

  // Generate RFC 5545 iCalendar content
  const icsBody = generateIcsFeed({
    teacherName,
    organizationName,
    courses: coursesList,
  });

  return new Response(icsBody, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="stundenplan-${teacher_id}.ics"`,
      "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
