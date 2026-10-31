"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";
import {
  TeacherImportRow,
  CourseImportRow,
  StudentImportRow,
} from "@/lib/excel-import";

export interface ImportLogMessage {
  type: "success" | "info" | "warning" | "error";
  message: string;
  time: string;
}

export interface ImportResultStats {
  teachersCreated: number;
  teachersExisting: number;
  coursesCreated: number;
  roomsCreated: number;
  studentsCreated: number;
  errorsCount: number;
}

export interface ImportActionResult {
  success: boolean;
  error?: string;
  stats: ImportResultStats;
  logs: ImportLogMessage[];
}

function getLogTime(): string {
  const d = new Date();
  return d.toTimeString().split(" ")[0];
}

/**
 * Universal Server Action: Smart multi-sheet Excel import or single CSV fallback
 */
export async function importSchoolData(payload: {
  teachers: TeacherImportRow[];
  courses: CourseImportRow[];
  students: StudentImportRow[];
}): Promise<ImportActionResult> {
  const logs: ImportLogMessage[] = [];
  const stats: ImportResultStats = {
    teachersCreated: 0,
    teachersExisting: 0,
    coursesCreated: 0,
    roomsCreated: 0,
    studentsCreated: 0,
    errorsCount: 0,
  };

  try {
    const organization = await getActiveOrganization();
    if (!organization) {
      return {
        success: false,
        error: "Keine aktive Sprachschule gefunden. Bitte erneut einloggen.",
        stats,
        logs: [
          {
            type: "error",
            message: "Authentifizierungsfehler: Keine aktive Organisation ermittelt.",
            time: getLogTime(),
          },
        ],
      };
    }

    const supabase = await createClient();
    logs.push({
      type: "info",
      message: `Starte Import für "${organization.name}"...`,
      time: getLogTime(),
    });

    // ==========================================
    // SCHRITT 1: LEHRER ERSTELLEN / ZUWEISEN
    // ==========================================
    const { data: existingTeachers } = await supabase
      .from("teachers")
      .select("id, name, email")
      .eq("organization_id", organization.id);

    const teacherEmailMap = new Map<string, string>();
    const teacherNameMap = new Map<string, string>();

    (existingTeachers || []).forEach((t) => {
      if (t.email) teacherEmailMap.set(t.email.trim().toLowerCase(), t.id);
      if (t.name) teacherNameMap.set(t.name.trim().toLowerCase(), t.id);
    });

    if (payload.teachers.length > 0) {
      logs.push({
        type: "info",
        message: `Verarbeite ${payload.teachers.length} Dozent(en) aus Blatt "Lehrer"...`,
        time: getLogTime(),
      });

      for (const tRow of payload.teachers) {
        const fullName = `${tRow.firstName} ${tRow.lastName}`.trim() || tRow.firstName || tRow.lastName;
        if (!fullName) continue;

        const email = tRow.email ? tRow.email.trim().toLowerCase() : null;
        const phone = tRow.phone ? tRow.phone.trim() : null;
        const hourlyRate = tRow.hourlyRate || 35;

        // Check if teacher already exists by email or name
        const existingId = (email && teacherEmailMap.get(email)) || teacherNameMap.get(fullName.toLowerCase());

        if (existingId) {
          stats.teachersExisting++;
          if (email) teacherEmailMap.set(email, existingId);
          teacherNameMap.set(fullName.toLowerCase(), existingId);
          logs.push({
            type: "info",
            message: `Lehrkraft "${fullName}" bereits vorhanden (ID verknüpft).`,
            time: getLogTime(),
          });
        } else {
          const { data: newTeacher, error: tErr } = await supabase
            .from("teachers")
            .insert({
              organization_id: organization.id,
              name: fullName,
              email: email || null,
              phone: phone || null,
              hourly_rate: hourlyRate,
            })
            .select("id, name, email")
            .single();

          if (tErr || !newTeacher) {
            stats.errorsCount++;
            logs.push({
              type: "error",
              message: `Fehler beim Erstellen von Lehrer "${fullName}": ${tErr?.message || "Unbekannt"}`,
              time: getLogTime(),
            });
          } else {
            stats.teachersCreated++;
            if (email) teacherEmailMap.set(email, newTeacher.id);
            teacherNameMap.set(fullName.toLowerCase(), newTeacher.id);
            logs.push({
              type: "success",
              message: `Lehrkraft "${fullName}" neu angelegt (Basissatz: ${hourlyRate} €/Std.).`,
              time: getLogTime(),
            });
          }
        }
      }
    }

    // ==========================================
    // SCHRITT 2: RÄUME UND KURSE ERSTELLEN
    // ==========================================
    // 2a. Existing rooms
    const { data: existingRooms } = await supabase
      .from("rooms")
      .select("id, name")
      .eq("organization_id", organization.id);

    const roomMap = new Map<string, string>();
    (existingRooms || []).forEach((r) => {
      if (r.name) roomMap.set(r.name.trim().toLowerCase(), r.id);
    });

    // 2b. Existing courses
    const { data: existingCourses } = await supabase
      .from("courses")
      .select("id, name")
      .eq("organization_id", organization.id);

    const courseMap = new Map<string, string>();
    (existingCourses || []).forEach((c) => {
      if (c.name) courseMap.set(c.name.trim().toLowerCase(), c.id);
    });

    if (payload.courses.length > 0) {
      logs.push({
        type: "info",
        message: `Verarbeite ${payload.courses.length} Kurs(e) aus Blatt "Kurse"...`,
        time: getLogTime(),
      });

      for (const cRow of payload.courses) {
        const courseName = cRow.courseName.trim();
        if (!courseName) continue;

        // Auto-create room if not exists
        let roomId: string | null = null;
        if (cRow.roomName && cRow.roomName.trim().length > 0) {
          const cleanRoom = cRow.roomName.trim();
          const lowerRoom = cleanRoom.toLowerCase();

          if (roomMap.has(lowerRoom)) {
            roomId = roomMap.get(lowerRoom)!;
          } else {
            // Requirement: "Если кабинет (Raum) в базе не существует, система должна автоматически создать его в таблице rooms"
            const { data: newRoom, error: rErr } = await supabase
              .from("rooms")
              .insert({
                organization_id: organization.id,
                name: cleanRoom,
              })
              .select("id, name")
              .single();

            if (rErr || !newRoom) {
              logs.push({
                type: "warning",
                message: `Raum "${cleanRoom}" konnte nicht automatisch erstellt werden: ${rErr?.message || "Fehler"}. Kurs wird ohne Raum erstellt.`,
                time: getLogTime(),
              });
            } else {
              roomId = newRoom.id;
              roomMap.set(lowerRoom, newRoom.id);
              stats.roomsCreated++;
              logs.push({
                type: "info",
                message: `Raum "${cleanRoom}" existierte noch nicht -> automatisch neu angelegt.`,
                time: getLogTime(),
              });
            }
          }
        }

        // Match teacher by email
        let teacherId: string | null = null;
        if (cRow.teacherEmail) {
          const lowerEmail = cRow.teacherEmail.trim().toLowerCase();
          teacherId = teacherEmailMap.get(lowerEmail) || null;
          if (!teacherId) {
            logs.push({
              type: "warning",
              message: `Kurs "${courseName}": Dozent mit E-Mail "${cRow.teacherEmail}" nicht gefunden. Kurs wird ohne Dozenten angelegt.`,
              time: getLogTime(),
            });
          }
        }

        // Create or find course
        let courseId: string | null = courseMap.get(courseName.toLowerCase()) || null;

        if (!courseId) {
          const { data: newCourse, error: cErr } = await supabase
            .from("courses")
            .insert({
              organization_id: organization.id,
              name: courseName,
              teacher_id: teacherId,
              room_id: roomId,
              course_type: "group",
            })
            .select("id, name")
            .single();

          if (cErr || !newCourse) {
            stats.errorsCount++;
            logs.push({
              type: "error",
              message: `Fehler beim Anlegen von Kurs "${courseName}": ${cErr?.message || "Unbekannt"}`,
              time: getLogTime(),
            });
            continue;
          } else {
            courseId = newCourse.id;
            courseMap.set(courseName.toLowerCase(), newCourse.id);
            stats.coursesCreated++;
            logs.push({
              type: "success",
              message: `Kurs "${courseName}" erfolgreich angelegt.`,
              time: getLogTime(),
            });
          }
        } else {
          logs.push({
            type: "info",
            message: `Kurs "${courseName}" existiert bereits -> wird verwendet.`,
            time: getLogTime(),
          });
        }

        // Add schedule (Stundenplan) if day or time is provided
        if (courseId && (cRow.dayOfWeek || cRow.startTime)) {
          const dayOfWeek = cRow.dayOfWeek || "Montag";
          const startTime = cRow.startTime || "18:00";
          const duration = cRow.duration || 1.5;

          const { error: sErr } = await supabase.from("course_schedules").insert({
            course_id: courseId,
            organization_id: organization.id,
            day_of_week: dayOfWeek,
            start_time: startTime,
            duration: duration,
          });

          if (sErr) {
            logs.push({
              type: "warning",
              message: `Stundenplan für "${courseName}" (${dayOfWeek} ${startTime}): ${sErr.message}`,
              time: getLogTime(),
            });
          } else {
            logs.push({
              type: "info",
              message: `Unterrichtszeit für "${courseName}": ${dayOfWeek}, ${startTime} Uhr (${duration} Std.).`,
              time: getLogTime(),
            });
          }
        }
      }
    }

    // ==========================================
    // SCHRITT 3: SCHÜLER ERSTELLEN & VERKNÜPFEN
    // ==========================================
    if (payload.students.length > 0) {
      logs.push({
        type: "info",
        message: `Verarbeite ${payload.students.length} Schüler aus Blatt "Schueler"...`,
        time: getLogTime(),
      });

      for (const sRow of payload.students) {
        const firstName = sRow.firstName.trim();
        const lastName = sRow.lastName.trim();
        if (!firstName && !lastName) continue;

        const parentName = sRow.parentName?.trim() || null;
        const parentPhone = sRow.parentPhone?.trim() || null;
        const courseName = sRow.courseName?.trim() || null;
        const email = sRow.email?.trim().toLowerCase() || null;
        const phone = sRow.phone?.trim() || null;

        // Auto-create course if student specifies a course name that doesn't exist yet
        let courseId: string | null = null;
        if (courseName) {
          const lowerCName = courseName.toLowerCase();
          if (courseMap.has(lowerCName)) {
            courseId = courseMap.get(lowerCName)!;
          } else {
            // Auto-create course for student if sheet 2 didn't define it
            const { data: autoCourse, error: acErr } = await supabase
              .from("courses")
              .insert({
                organization_id: organization.id,
                name: courseName,
                course_type: "group",
              })
              .select("id, name")
              .single();

            if (!acErr && autoCourse) {
              courseId = autoCourse.id;
              courseMap.set(lowerCName, autoCourse.id);
              stats.coursesCreated++;
              logs.push({
                type: "info",
                message: `Kurs "${courseName}" wurde für Schüler automatisch angelegt.`,
                time: getLogTime(),
              });
            }
          }
        }

        // Insert student
        const { data: newStudent, error: stErr } = await supabase
          .from("students")
          .insert({
            organization_id: organization.id,
            first_name: firstName || lastName,
            last_name: firstName ? lastName : "",
            email: email,
            phone: phone,
            parent_name: parentName,
            parent_phone: parentPhone,
            course_name: courseName,
          })
          .select("id")
          .single();

        if (stErr || !newStudent) {
          stats.errorsCount++;
          logs.push({
            type: "error",
            message: `Fehler beim Anlegen von Schüler "${firstName} ${lastName}": ${stErr?.message || "Fehler"}`,
            time: getLogTime(),
          });
          continue;
        }

        stats.studentsCreated++;

        // Link student to course
        if (courseId) {
          const { error: scErr } = await supabase.from("student_courses").insert({
            organization_id: organization.id,
            student_id: newStudent.id,
            course_id: courseId,
          });

          if (scErr) {
            logs.push({
              type: "warning",
              message: `Kurszuweisung für Schüler "${firstName} ${lastName}" fehlgeschlagen: ${scErr.message}`,
              time: getLogTime(),
            });
          } else {
            logs.push({
              type: "success",
              message: `Schüler "${firstName} ${lastName}" angelegt und Kurs "${courseName}" zugewiesen.`,
              time: getLogTime(),
            });
          }
        } else {
          logs.push({
            type: "success",
            message: `Schüler "${firstName} ${lastName}" erfolgreich ohne Kurszuweisung angelegt.`,
            time: getLogTime(),
          });
        }
      }
    }

    logs.push({
      type: "success",
      message: `Import abgeschlossen! Lehrer: ${stats.teachersCreated}, Kurse: ${stats.coursesCreated}, Räume: ${stats.roomsCreated}, Schüler: ${stats.studentsCreated}, Fehler: ${stats.errorsCount}`,
      time: getLogTime(),
    });

    // Revalidate all affected application pages
    revalidatePath("/dashboard");
    revalidatePath("/students");
    revalidatePath("/courses");
    revalidatePath("/teachers");
    revalidatePath("/rooms");
    revalidatePath("/lessons");
    revalidatePath("/my-portal");

    return {
      success: true,
      stats,
      logs,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unerwarteter Serverfehler beim Importieren.";
    logs.push({
      type: "error",
      message: `Abbruch durch Ausnahmefehler: ${errorMsg}`,
      time: getLogTime(),
    });
    return {
      success: false,
      error: errorMsg,
      stats,
      logs,
    };
  }
}
