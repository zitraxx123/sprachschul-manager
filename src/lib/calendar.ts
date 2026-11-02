import { calculateEndTime } from "./utils";

/**
 * Builds Google Calendar event creation URL for a specific lesson/course instance.
 * Format: https://calendar.google.com/calendar/render?action=TEMPLATE&text=[Name]&dates=[Start]/[End]&details=[Desc]&location=[Room]
 */
export function buildGoogleCalendarUrl({
  text,
  date,
  startTime = "09:00",
  durationHours = 1.5,
  details = "",
  location = "",
}: {
  text: string;
  date: string; // "YYYY-MM-DD"
  startTime?: string; // "HH:MM"
  durationHours?: number;
  details?: string;
  location?: string;
}): string {
  // Format date digits: "2026-11-04" -> "20261104"
  const cleanDate = (date || "").replace(/[^0-9]/g, "").slice(0, 8) || 
    new Date().toISOString().split("T")[0].replace(/-/g, "");

  // Format start time
  const [sh = "09", sm = "00"] = (startTime || "09:00").split(":");
  const startH = sh.padStart(2, "0");
  const startM = sm.padStart(2, "0");
  const startFormatted = `${cleanDate}T${startH}${startM}00`;

  // Calculate end time using existing helper
  const endTimeStr = calculateEndTime(`${startH}:${startM}`, durationHours || 1.5);
  const [eh = "10", em = "30"] = endTimeStr.split(":");
  const endFormatted = `${cleanDate}T${eh.padStart(2, "0")}${em.padStart(2, "0")}00`;

  const datesParam = `${startFormatted}/${endFormatted}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: text || "Unterricht",
    dates: datesParam,
    details: details || "",
    location: location || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Map weekday names (German & English) to RFC 5545 day codes and 0-indexed offset from Monday.
 */
const DAY_MAP: Record<string, { code: string; offsetFromMonday: number }> = {
  montag: { code: "MO", offsetFromMonday: 0 },
  dienstag: { code: "TU", offsetFromMonday: 1 },
  mittwoch: { code: "WE", offsetFromMonday: 2 },
  donnerstag: { code: "TH", offsetFromMonday: 3 },
  freitag: { code: "FR", offsetFromMonday: 4 },
  samstag: { code: "SA", offsetFromMonday: 5 },
  sonntag: { code: "SU", offsetFromMonday: 6 },
  // English aliases
  monday: { code: "MO", offsetFromMonday: 0 },
  tuesday: { code: "TU", offsetFromMonday: 1 },
  wednesday: { code: "WE", offsetFromMonday: 2 },
  thursday: { code: "TH", offsetFromMonday: 3 },
  friday: { code: "FR", offsetFromMonday: 4 },
  saturday: { code: "SA", offsetFromMonday: 5 },
  sunday: { code: "SU", offsetFromMonday: 6 },
};

/**
 * Escapes characters for iCalendar RFC 5545 standard.
 */
export function escapeIcs(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export interface IcsScheduleItem {
  id?: string;
  day_of_week: string;
  start_time: string;
  duration: number;
}

/** One-off exception to the weekly template (moved lesson / substitute teacher) */
export interface IcsOverrideItem {
  course_id: string;
  course_name: string;
  course_type?: string | null;
  room_name?: string | null;
  lesson_date: string; // original date YYYY-MM-DD
  original_start_time: string; // HH:MM
  new_date?: string | null;
  new_start_time?: string | null;
  new_duration?: number | string | null;
  new_teacher_id?: string | null;
  original_teacher_id?: string | null;
  template_teacher_id?: string | null;
  template_duration?: number | string | null;
}

export interface IcsCourseItem {
  id: string;
  name: string;
  course_type?: "group" | "individual" | string | null;
  description?: string | null;
  room_name?: string | null;
  schedules?: IcsScheduleItem[];
  students?: string[]; // student names
}

/**
 * Generates an RFC 5545 compliant .ics calendar string with weekly recurring events
 * and standard Europe/Berlin VTIMEZONE.
 */
export function generateIcsFeed({
  teacherName,
  organizationName,
  courses,
  teacherId,
  overrides = [],
}: {
  teacherName: string;
  organizationName?: string;
  courses: IcsCourseItem[];
  teacherId?: string;
  overrides?: IcsOverrideItem[];
}): string {
  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  // Calculate Monday of 2 weeks ago to establish a clean base anchor for recurring events.
  // In RFC 5545, weekly RRULE DTSTART MUST match the day of the week!
  const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const baseMonday = new Date(now);
  baseMonday.setDate(now.getDate() - diffToMonday - 14);
  baseMonday.setHours(0, 0, 0, 0);

  const calName = `Stundenplan - ${teacherName || "Lehrkraft"}`;
  const calDesc = `Unterrichtsplan für ${teacherName || "Lehrkraft"}${organizationName ? ` an der ${organizationName}` : ""}`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sprachschule ERP//Calendar 1.0//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calName)}`,
    `X-WR-CALDESC:${escapeIcs(calDesc)}`,
    "X-WR-TIMEZONE:Europe/Berlin",
    // Refresh hints for subscribing clients (honored by Apple Calendar / Outlook; Google ignores them)
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    // Timezone definition for Europe/Berlin
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Berlin",
    "X-LIC-LOCATION:Europe/Berlin",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  // Excluded template occurrences (lesson moved away or handed to a substitute)
  const compact = (t: string) => {
    const [h = "00", m = "00"] = (t || "00:00").split(":");
    return `${h.padStart(2, "0")}${m.padStart(2, "0").slice(0, 2)}`;
  };
  const exdateMap = new Map<string, string[]>();
  if (teacherId) {
    overrides.forEach((o) => {
      const wasMine = (o.template_teacher_id || o.original_teacher_id) === teacherId;
      const movedAway = Boolean(o.new_date || o.new_start_time) || (o.new_teacher_id && o.new_teacher_id !== teacherId);
      if (!wasMine || !movedAway) return;
      const [oy, om, od] = o.lesson_date.split("-");
      const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
        new Date(Date.UTC(parseInt(oy, 10), parseInt(om, 10) - 1, parseInt(od, 10))).getUTCDay()
      ];
      const key = `${o.course_id}|${weekday}|${compact(o.original_start_time)}`;
      const list = exdateMap.get(key) || [];
      list.push(`${oy}${om}${od}T${compact(o.original_start_time)}00`);
      exdateMap.set(key, list);
    });
  }

  for (const course of courses) {
    const schedules = course.schedules || [];
    for (let i = 0; i < schedules.length; i++) {
      const sched = schedules[i];
      const rawDay = (sched.day_of_week || "").trim().toLowerCase();
      const dayInfo = DAY_MAP[rawDay] || { code: "MO", offsetFromMonday: 0 };

      // Calculate anchor date matching the specific weekday
      const anchorDate = new Date(baseMonday);
      anchorDate.setDate(baseMonday.getDate() + dayInfo.offsetFromMonday);

      const y = anchorDate.getFullYear();
      const m = String(anchorDate.getMonth() + 1).padStart(2, "0");
      const d = String(anchorDate.getDate()).padStart(2, "0");
      const dateStr = `${y}${m}${d}`;

      const [startH = "09", startM = "00"] = (sched.start_time || "09:00").split(":");
      const sH = startH.padStart(2, "0");
      const sM = startM.padStart(2, "0");
      const startTimeClean = `${sH}${sM}00`;

      const duration = Number(sched.duration) || 1.5;
      const endTimeStr = calculateEndTime(`${sH}:${sM}`, duration);
      const [endH = "10", endM = "30"] = endTimeStr.split(":");
      const endTimeClean = `${endH.padStart(2, "0")}${endM.padStart(2, "0")}00`;

      const typeLabel = course.course_type === "individual" ? "1:1 Einzelunterricht" : "Gruppenkurs";
      const roomLabel = course.room_name ? course.room_name : "Nicht zugewiesen";
      const studentsList = course.students && course.students.length > 0 
        ? course.students.join(", ") 
        : "Keine Schüler zugewiesen";

      let descriptionText = `Kurs: ${course.name}\nTyp: ${typeLabel}\nRaum: ${roomLabel}\nTeilnehmer: ${studentsList}`;
      if (course.description) {
        descriptionText += `\nBeschreibung: ${course.description}`;
      }

      const uid = `course-${course.id}-sched-${sched.id || i}@sprachschule-erp`;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`SUMMARY:${escapeIcs(course.name)}`);
      lines.push(`DESCRIPTION:${escapeIcs(descriptionText)}`);
      if (course.room_name) {
        lines.push(`LOCATION:${escapeIcs(course.room_name)}`);
      }
      lines.push(`DTSTART;TZID=Europe/Berlin:${dateStr}T${startTimeClean}`);
      lines.push(`DTEND;TZID=Europe/Berlin:${dateStr}T${endTimeClean}`);
      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${dayInfo.code}`);
      const exKey = `${course.id}|${rawDay}|${compact(sched.start_time)}`;
      (exdateMap.get(exKey) || []).forEach((ex) => lines.push(`EXDATE;TZID=Europe/Berlin:${ex}`));
      lines.push("STATUS:CONFIRMED");
      lines.push("TRANSP:OPAQUE");
      lines.push("END:VEVENT");
    }
  }

  // Single events for moved lessons / lessons taken over as substitute
  if (teacherId) {
    overrides.forEach((o) => {
      const effectiveTeacher = o.new_teacher_id || o.template_teacher_id || o.original_teacher_id;
      if (effectiveTeacher !== teacherId) return;
      const isChanged = Boolean(o.new_date || o.new_start_time || o.new_duration || o.new_teacher_id);
      if (!isChanged) return;

      const date = (o.new_date || o.lesson_date).replace(/-/g, "");
      const start = compact(o.new_start_time || o.original_start_time);
      const duration = Number(o.new_duration) || Number(o.template_duration) || 1.5;
      const endClean = calculateEndTime(`${start.slice(0, 2)}:${start.slice(2)}`, duration).split(":");
      const isSubstitute = Boolean(o.new_teacher_id && o.new_teacher_id === teacherId && o.template_teacher_id !== teacherId);
      const label = isSubstitute ? "Vertretung" : "Verschoben";
      const roomLabel = o.room_name ? o.room_name : "Nicht zugewiesen";

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:override-${o.course_id}-${o.lesson_date}-${start}@sprachschule-erp`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`SUMMARY:${escapeIcs(`${o.course_name} (${label})`)}`);
      lines.push(`DESCRIPTION:${escapeIcs(`Kurs: ${o.course_name}\n${label}\nRaum: ${roomLabel}`)}`);
      if (o.room_name) lines.push(`LOCATION:${escapeIcs(o.room_name)}`);
      lines.push(`DTSTART;TZID=Europe/Berlin:${date}T${start}00`);
      lines.push(`DTEND;TZID=Europe/Berlin:${date}T${(endClean[0] || "10").padStart(2, "0")}${(endClean[1] || "00").padStart(2, "0")}00`);
      lines.push("STATUS:CONFIRMED");
      lines.push("TRANSP:OPAQUE");
      lines.push("END:VEVENT");
    });
  }

  lines.push("END:VCALENDAR");

  // RFC 5545 requires CRLF line endings
  return lines.join("\r\n");
}
