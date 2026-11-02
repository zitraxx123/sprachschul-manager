import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createClient,
  getActiveOrganization,
  getCurrentTeacher,
  getCurrentMembership,
} from "@/lib/supabase/server";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { AddRoomDialog } from "@/components/rooms/add-room-dialog";
import { EditRoomDialog } from "@/components/rooms/edit-room-dialog";
import { DeleteRoomButton } from "@/components/rooms/delete-room-button";
import { RoomAvailabilityFinder } from "@/components/rooms/room-availability-finder";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DoorOpen, Layers, ArrowRight } from "lucide-react";
import { Room } from "@/types/database";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Räume & Unterrichtsorte • Sprachschul-Manager",
};

export default async function RoomsPage() {
  const [teacher, membership, organization, tRooms, tCommon] = await Promise.all([
    getCurrentTeacher(),
    getCurrentMembership(),
    getActiveOrganization(),
    getTranslations("rooms"),
    getTranslations("common"),
  ]);

  if (teacher && membership?.role === "teacher") {
    redirect("/my-portal");
  }

  if (!organization) {
    return <CreateOrganizationCard />;
  }

  const supabase = await createClient();

  // Parallel fetch: Rooms and Courses
  const [roomsResult, coursesResult] = await Promise.all([
    supabase
      .from("rooms")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true })
      .then((res) => (res.error ? { data: [] } : res)),
    supabase
      .from("courses")
      .select("id, name, room_id")
      .eq("organization_id", organization.id)
      .then((res) => (res.error ? { data: [] } : res)),
  ]);

  const rooms: Room[] = (roomsResult.data as Room[]) || [];
  const courses = (coursesResult.data || []) as Array<{ id: string; name: string; room_id: string | null }>;

  // Map courses per room
  const coursesByRoom = new Map<string, string[]>();
  courses.forEach((c) => {
    if (c.room_id) {
      const list = coursesByRoom.get(c.room_id) || [];
      list.push(c.name);
      coursesByRoom.set(c.room_id, list);
    }
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {tRooms("title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {tRooms("subtitle")}
          </p>
        </div>

        <AddRoomDialog />
      </div>

      {/* Tool: Freie Räume finden (Raumplaner) */}
      <RoomAvailabilityFinder />

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-base font-semibold">
              {tRooms("allRoomsTitle", { count: rooms.length })}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {tRooms("allRoomsDesc")}
            </CardDescription>
          </div>

          <Link href="/courses">
            <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 space-x-1 text-xs">
              <span>{tRooms("toCourses")}</span>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0 sm:p-6">
          {rooms.length === 0 ? (
            <EmptyState
              icon={DoorOpen}
              title={tRooms("emptyTitle")}
              description={tRooms("emptyDesc")}
            >
              <AddRoomDialog />
            </EmptyState>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tRooms("roomCol")}</TableHead>
                      <TableHead>{tRooms("assignedCoursesCol")}</TableHead>
                      <TableHead className="text-right">{tCommon("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => {
                      const assignedCourses = coursesByRoom.get(room.id) || [];
                      const isOnline = room.name.toLowerCase().includes("online");

                      return (
                        <TableRow key={room.id}>
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isOnline
                                    ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
                                    : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                                }`}
                              >
                                <DoorOpen strokeWidth={1.5} className="w-4 h-4" />
                              </div>
                              <span>{room.name}</span>
                            </div>
                          </TableCell>

                          <TableCell>
                            {assignedCourses.length === 0 ? (
                              <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                                {tRooms("noCoursesAssigned")}
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {assignedCourses.map((cName, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-xs py-0.5 space-x-1"
                                  >
                                    <Layers strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                                    <span>{cName}</span>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <EditRoomDialog room={room} />
                              <DeleteRoomButton roomId={room.id} roomName={room.name} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {rooms.map((room) => {
                  const assignedCourses = coursesByRoom.get(room.id) || [];
                  const isOnline = room.name.toLowerCase().includes("online");

                  return (
                    <div key={room.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isOnline
                                ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
                                : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            <DoorOpen strokeWidth={1.5} className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{room.name}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <EditRoomDialog room={room} />
                          <DeleteRoomButton roomId={room.id} roomName={room.name} />
                        </div>
                      </div>

                      {assignedCourses.length > 0 && (
                        <div className="pl-11 flex flex-wrap gap-1">
                          {assignedCourses.map((cName, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[11px] bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 py-0"
                            >
                              {cName}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
