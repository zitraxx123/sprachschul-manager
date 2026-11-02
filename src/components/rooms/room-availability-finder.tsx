"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { getAvailableRooms, RoomAvailabilityResponse } from "@/actions/rooms";
import { calculateEndTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Search,
  DoorOpen,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const DAYS_OF_WEEK = [
  { value: "Montag", key: "monday" },
  { value: "Dienstag", key: "tuesday" },
  { value: "Mittwoch", key: "wednesday" },
  { value: "Donnerstag", key: "thursday" },
  { value: "Freitag", key: "friday" },
  { value: "Samstag", key: "saturday" },
  { value: "Sonntag", key: "sunday" },
] as const;

export function RoomAvailabilityFinder() {
  const [dayOfWeek, setDayOfWeek] = useState<string>("Montag");
  const [startTime, setStartTime] = useState<string>("18:00");
  const [duration, setDuration] = useState<number>(1.5);

  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchParams, setSearchParams] = useState<{
    day: string;
    start: string;
    duration: number;
    end: string;
  } | null>(null);

  const [result, setResult] = useState<RoomAvailabilityResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const tRooms = useTranslations("rooms");
  const tSchedule = useTranslations("schedule");
  const tCommon = useTranslations("common");

  function getDayLabel(val?: string) {
    if (!val) return "";
    const found = DAYS_OF_WEEK.find((d) => d.value === val);
    return found ? tSchedule(found.key) : val;
  }

  function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();

    startTransition(async () => {
      const res = await getAvailableRooms({
        day_of_week: dayOfWeek,
        start_time: startTime,
        duration: duration,
      });

      setResult(res);
      setHasSearched(true);
      setSearchParams({
        day: dayOfWeek,
        start: startTime,
        duration: duration,
        end: calculateEndTime(startTime, duration),
      });
    });
  }

  return (
    <Card className="border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm overflow-hidden">
      <CardHeader className="pb-4 border-b border-blue-100/80 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles strokeWidth={1.5} className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{tRooms("finderTitle")}</span>
                <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                  {tRooms("finderBadge")}
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tRooms("finderDesc")}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          {/* Day of week */}
          <div className="space-y-2 sm:col-span-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
              <Calendar strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
              <span>{tRooms("dayOfWeek")}</span>
            </Label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  {tSchedule(d.key)}
                </option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div className="space-y-2 sm:col-span-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
              <Clock strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
              <span>{tRooms("startTime")}</span>
            </Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-10 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
              required
            />
          </div>

          {/* Duration */}
          <div className="space-y-2 sm:col-span-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
              <Clock strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
              <span>{tRooms("duration")}</span>
            </Label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
              className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="0.75" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tSchedule("duration45")}</option>
              <option value="1" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tSchedule("duration60")}</option>
              <option value="1.5" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tSchedule("duration90")}</option>
              <option value="2" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tSchedule("duration120")}</option>
              <option value="2.5" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tSchedule("duration150")}</option>
              <option value="3" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tSchedule("duration180")}</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="sm:col-span-1">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm flex items-center justify-center space-x-2"
            >
              {isPending ? (
                <>
                  <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" />
                  <span>{tRooms("checking")}</span>
                </>
              ) : (
                <>
                  <Search strokeWidth={1.5} className="w-4 h-4" />
                  <span>{tRooms("search")}</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Results Area */}
        {hasSearched && result && (
          <div className="pt-2 space-y-4 animate-in fade-in-50 duration-200">
            {/* Search query tag */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                <Clock strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  {tRooms("timeRange")}{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {getDayLabel(searchParams?.day)}, {searchParams?.start} – {searchParams?.end}
                  </strong>{" "}
                  ({searchParams?.duration} {tCommon("hours")})
                </span>
              </div>

              <div className="flex items-center space-x-2 font-medium">
                <Badge variant="success" className="text-xs">
                  {tRooms("freeRoomsCount", { count: result.availableRooms.length })}
                </Badge>
                {result.occupiedRooms.length > 0 && (
                  <Badge variant="outline" className="text-xs border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40">
                    {tRooms("occupiedRoomsCount", { count: result.occupiedRooms.length })}
                  </Badge>
                )}
              </div>
            </div>

            {/* Free Rooms List */}
            {result.availableRooms.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 rounded-xl space-y-2">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                  <AlertCircle strokeWidth={1.5} className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
                  {tRooms("noRoomsAvailable")}
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300 max-w-md mx-auto">
                  {tRooms("noRoomsAvailableDesc", {
                    day: getDayLabel(searchParams?.day),
                    start: searchParams?.start || "",
                    end: searchParams?.end || ""
                  })}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 strokeWidth={1.5} className="w-4 h-4 text-emerald-500" />
                  <span>{tRooms("availableRooms", { count: result.availableRooms.length })}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {result.availableRooms.map((room) => {
                    const isOnline = room.name.toLowerCase().includes("online");
                    return (
                      <div
                        key={room.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isOnline
                                ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
                                : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            <DoorOpen strokeWidth={1.5} className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {room.name}
                            </p>
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              {tRooms("completelyFree")}
                            </span>
                          </div>
                        </div>

                        <Link href="/courses">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/60 space-x-1"
                          >
                            <span>{tRooms("book")}</span>
                            <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Occupied Rooms Details */}
            {result.occupiedRooms.length > 0 && (
              <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
                <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <AlertCircle strokeWidth={1.5} className="w-4 h-4 text-amber-600" />
                  <span>{tRooms("occupiedRooms", { count: result.occupiedRooms.length })}</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.occupiedRooms.map((occ) => (
                    <div
                      key={occ.roomId}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                    >
                      <div className="flex items-center space-x-2">
                        <DoorOpen strokeWidth={1.5} className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {occ.roomName}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 mx-1.5">•</span>
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            {occ.conflictCourseName}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 shrink-0">
                        {occ.conflictTime}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
