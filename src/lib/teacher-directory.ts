import type { SupabaseClient } from "@supabase/supabase-js";

export type DirectoryTeacher = { id: string; organization_id: string; name: string; email: string | null };

/**
 * Teachers WITHOUT hourly rate / tax data (view teachers_directory). Used for the assistant role,
 * which has no access to the teachers table itself.
 */
export async function getTeacherDirectory(supabase: SupabaseClient, organizationId: string): Promise<DirectoryTeacher[]> {
  const { data } = await supabase
    .from("teachers_directory")
    .select("id, organization_id, name, email")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });
  return (data || []) as DirectoryTeacher[];
}

/**
 * Embedded `teachers(*)` joins come back as null for the assistant (RLS). Walk the result tree and
 * fill in the directory entry wherever a row has `teacher_id` but no teacher object.
 */
export function attachTeachers<T>(data: T, directory: DirectoryTeacher[]): T {
  const byId = new Map(directory.map((t) => [t.id, t]));
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (typeof obj.teacher_id === "string" && "teachers" in obj && !obj.teachers) {
      obj.teachers = byId.get(obj.teacher_id) ?? null;
    }
    Object.values(obj).forEach(walk);
  };
  walk(data);
  return data;
}
