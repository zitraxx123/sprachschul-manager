"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";
import { calculateEndTime } from "@/lib/utils";
import { Room } from "@/types/database";

export type RoomActionState = {
  error?: string;
  success?: boolean;
};

export type OccupiedRoomInfo = {
  roomId: string;
  roomName: string;
  conflictCourseName: string;
  conflictDay: string;
  conflictTime: string;
};

export type RoomAvailabilityResponse = {
  success: boolean;
  availableRooms: Room[];
  occupiedRooms: OccupiedRoomInfo[];
  allRooms: Room[];
  error?: string;
};

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function hasTimeOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  // Новое_начало < Существующее_окончание И Новое_окончание > Существующее_начало
  return startA < endB && endA > startB;
}

/**
 * Server Action: Get free/occupied rooms for a given day, time, and duration
 */
export async function getAvailableRooms(params: {
  day_of_week?: string;
  start_time?: string;
  duration?: number;
  excludeCourseId?: string;
}): Promise<RoomAvailabilityResponse> {
  try {
    const organization = await getActiveOrganization();
    if (!organization) {
      return {
        success: false,
        availableRooms: [],
        occupiedRooms: [],
        allRooms: [],
        error: "Keine Organisation gefunden.",
      };
    }

    const supabase = await createClient();

    // 1. Fetch all rooms
    const { data: allRoomsData } = await supabase
      .from("rooms")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true });

    const allRooms: Room[] = (allRoomsData as Room[]) || [];

    // If day or start time is missing, all rooms are available
    if (!params.day_of_week || !params.start_time) {
      return {
        success: true,
        availableRooms: allRooms,
        occupiedRooms: [],
        allRooms,
      };
    }

    const newStart = timeToMinutes(params.start_time);
    const durationHours = params.duration && params.duration > 0 ? params.duration : 1.0;
    const newEnd = newStart + Math.round(durationHours * 60);

    // 2. Fetch all courses with schedules that have a room assigned
    const { data: coursesWithSchedules } = await supabase
      .from("courses")
      .select("id, name, room_id, course_schedules(id, day_of_week, start_time, duration)")
      .eq("organization_id", organization.id)
      .not("room_id", "is", null);

    const occupiedRoomMap = new Map<string, OccupiedRoomInfo>();

    for (const c of coursesWithSchedules || []) {
      if (params.excludeCourseId && c.id === params.excludeCourseId) {
        continue;
      }
      if (!c.room_id) continue;

      const schedules = (c.course_schedules || []) as Array<{
        id: string;
        day_of_week: string;
        start_time: string;
        duration: number;
      }>;

      for (const s of schedules) {
        if (!s.day_of_week || !s.start_time) continue;

        if (s.day_of_week.trim().toLowerCase() === params.day_of_week.trim().toLowerCase()) {
          const existStart = timeToMinutes(s.start_time);
          const existDuration = s.duration && s.duration > 0 ? s.duration : 1.0;
          const existEnd = existStart + Math.round(existDuration * 60);

          if (hasTimeOverlap(newStart, newEnd, existStart, existEnd)) {
            const roomObj = allRooms.find((r) => r.id === c.room_id);
            occupiedRoomMap.set(c.room_id, {
              roomId: c.room_id,
              roomName: roomObj?.name || "Unbekannter Raum",
              conflictCourseName: c.name,
              conflictDay: s.day_of_week,
              conflictTime: `${s.start_time} - ${calculateEndTime(s.start_time, existDuration)}`,
            });
            break;
          }
        }
      }
    }

    const availableRooms = allRooms.filter((r) => !occupiedRoomMap.has(r.id));
    const occupiedRooms = Array.from(occupiedRoomMap.values());

    return {
      success: true,
      availableRooms,
      occupiedRooms,
      allRooms,
    };
  } catch (err: unknown) {
    return {
      success: false,
      availableRooms: [],
      occupiedRooms: [],
      allRooms: [],
      error: err instanceof Error ? err.message : "Fehler beim Prüfen der Raumverfügbarkeit.",
    };
  }
}

/**
 * Server Action: Check room availability for multiple schedule slots (e.g. Mo + Mi in a course)
 */
export async function getAvailableRoomsForSchedules(params: {
  schedules: Array<{
    day_of_week: string;
    start_time: string;
    duration: number;
  }>;
  excludeCourseId?: string;
}): Promise<RoomAvailabilityResponse> {
  try {
    const organization = await getActiveOrganization();
    if (!organization) {
      return {
        success: false,
        availableRooms: [],
        occupiedRooms: [],
        allRooms: [],
        error: "Keine Organisation gefunden.",
      };
    }

    const supabase = await createClient();

    const { data: allRoomsData } = await supabase
      .from("rooms")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true });

    const allRooms: Room[] = (allRoomsData as Room[]) || [];

    if (!params.schedules || params.schedules.length === 0) {
      return {
        success: true,
        availableRooms: allRooms,
        occupiedRooms: [],
        allRooms,
      };
    }

    const { data: coursesWithSchedules } = await supabase
      .from("courses")
      .select("id, name, room_id, course_schedules(id, day_of_week, start_time, duration)")
      .eq("organization_id", organization.id)
      .not("room_id", "is", null);

    const occupiedRoomMap = new Map<string, OccupiedRoomInfo>();

    for (const newSched of params.schedules) {
      if (!newSched.day_of_week || !newSched.start_time) continue;

      const newStart = timeToMinutes(newSched.start_time);
      const newDuration = newSched.duration && newSched.duration > 0 ? newSched.duration : 1.0;
      const newEnd = newStart + Math.round(newDuration * 60);

      for (const c of coursesWithSchedules || []) {
        if (params.excludeCourseId && c.id === params.excludeCourseId) {
          continue;
        }
        if (!c.room_id) continue;

        const existSchedules = (c.course_schedules || []) as Array<{
          id: string;
          day_of_week: string;
          start_time: string;
          duration: number;
        }>;

        for (const existS of existSchedules) {
          if (!existS.day_of_week || !existS.start_time) continue;

          if (existS.day_of_week.trim().toLowerCase() === newSched.day_of_week.trim().toLowerCase()) {
            const existStart = timeToMinutes(existS.start_time);
            const existDuration = existS.duration && existS.duration > 0 ? existS.duration : 1.0;
            const existEnd = existStart + Math.round(existDuration * 60);

            if (hasTimeOverlap(newStart, newEnd, existStart, existEnd)) {
              const roomObj = allRooms.find((r) => r.id === c.room_id);
              occupiedRoomMap.set(c.room_id, {
                roomId: c.room_id,
                roomName: roomObj?.name || "Unbekannter Raum",
                conflictCourseName: c.name,
                conflictDay: existS.day_of_week,
                conflictTime: `${existS.start_time} - ${calculateEndTime(existS.start_time, existDuration)}`,
              });
              break;
            }
          }
        }
      }
    }

    const availableRooms = allRooms.filter((r) => !occupiedRoomMap.has(r.id));
    const occupiedRooms = Array.from(occupiedRoomMap.values());

    return {
      success: true,
      availableRooms,
      occupiedRooms,
      allRooms,
    };
  } catch (err: unknown) {
    return {
      success: false,
      availableRooms: [],
      occupiedRooms: [],
      allRooms: [],
      error: err instanceof Error ? err.message : "Fehler beim Prüfen der Raumverfügbarkeit.",
    };
  }
}

export async function createRoom(
  prevState: RoomActionState | null,
  formData: FormData
): Promise<RoomActionState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Bitte geben Sie einen Raumnamen ein (z. B. Raum 1, Raum 2 oder Online)." };
  }

  const organization = await getActiveOrganization();
  if (!organization) return { error: "Keine aktive Sprachschule gefunden." };

  const supabase = await createClient();
  const { error } = await supabase.from("rooms").insert({
    organization_id: organization.id,
    name,
  });

  if (error) {
    return { error: `Fehler beim Erstellen des Raumes: ${error.message}` };
  }

  revalidatePath("/rooms");
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  revalidatePath("/my-portal");
  return { success: true };
}

export async function updateRoom(
  prevState: RoomActionState | null,
  formData: FormData
): Promise<RoomActionState> {
  const id = (formData.get("id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  if (!id || !name) {
    return { error: "Raum-ID und Name sind erforderlich." };
  }

  const organization = await getActiveOrganization();
  if (!organization) return { error: "Keine aktive Sprachschule gefunden." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("rooms")
    .update({ name })
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) {
    return { error: `Fehler beim Aktualisieren des Raumes: ${error.message}` };
  }

  revalidatePath("/rooms");
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  revalidatePath("/my-portal");
  return { success: true };
}

export async function deleteRoom(id: string): Promise<RoomActionState> {
  if (!id) return { error: "Ungültige Raum-ID." };

  const organization = await getActiveOrganization();
  if (!organization) return { error: "Keine aktive Sprachschule gefunden." };

  const supabase = await createClient();

  // First unassign room from any courses that reference it (redundancy in case FK has SET NULL)
  await supabase
    .from("courses")
    .update({ room_id: null })
    .eq("room_id", id)
    .eq("organization_id", organization.id);

  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) {
    return { error: `Fehler beim Löschen des Raumes: ${error.message}` };
  }

  revalidatePath("/rooms");
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  revalidatePath("/my-portal");
  return { success: true };
}
