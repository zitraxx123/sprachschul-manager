"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Teacher } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cake, Phone, Mail, Sparkles, Calendar } from "lucide-react";

interface UpcomingBirthdaysProps {
  teachers: Teacher[];
}

interface BirthdayItem {
  teacher: Teacher;
  daysUntil: number;
  dateStr: string;
  turningAge: number | null;
  isToday: boolean;
  isTomorrow: boolean;
}

export function UpcomingBirthdays({ teachers }: UpcomingBirthdaysProps) {
  const tDashboard = useTranslations("dashboard");
  const locale = useLocale();
  const jsLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "de-DE";

  const upcomingList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    const items: BirthdayItem[] = [];

    teachers.forEach((t) => {
      if (!t.birthday) return;

      const parts = t.birthday.split("-");
      if (parts.length < 3) return;

      const birthYear = parseInt(parts[0], 10);
      const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed
      const birthDay = parseInt(parts[2], 10);

      // Birthday in the current year
      let nextBday = new Date(currentYear, birthMonth, birthDay);
      nextBday.setHours(0, 0, 0, 0);

      // Calculate day difference
      const msPerDay = 1000 * 60 * 60 * 24;
      let diffDays = Math.round((nextBday.getTime() - today.getTime()) / msPerDay);

      // If already passed this year, check next year
      if (diffDays < 0) {
        nextBday = new Date(currentYear + 1, birthMonth, birthDay);
        nextBday.setHours(0, 0, 0, 0);
        diffDays = Math.round((nextBday.getTime() - today.getTime()) / msPerDay);
      }

      // Check if within the next 14 days (0 to 14 inclusive)
      if (diffDays >= 0 && diffDays <= 14) {
        const turningAge = !isNaN(birthYear) ? nextBday.getFullYear() - birthYear : null;
        const formattedDate = nextBday.toLocaleDateString(jsLocale, {
          day: "2-digit",
          month: "long",
        });

        items.push({
          teacher: t,
          daysUntil: diffDays,
          dateStr: formattedDate,
          turningAge,
          isToday: diffDays === 0,
          isTomorrow: diffDays === 1,
        });
      }
    });

    // Sort ascending (closest first)
    return items.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [teachers, jsLocale]);

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Cake strokeWidth={1.5} className="w-4 h-4" />
            </div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {tDashboard("upcomingBirthdays")}
            </CardTitle>
          </div>
          <CardDescription className="mt-1 text-slate-500 dark:text-slate-400 text-xs">
            {tDashboard("upcomingBirthdaysDesc")}
          </CardDescription>
        </div>

        {upcomingList.length > 0 && (
          <Badge className="bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-bold text-xs space-x-1">
            <Sparkles strokeWidth={1.5} className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{tDashboard("upcomingCount", { count: upcomingList.length })}</span>
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {upcomingList.length === 0 ? (
          <div className="py-3 text-center text-slate-400 dark:text-slate-500 text-xs flex items-center justify-center space-x-2">
            <Calendar strokeWidth={1.5} className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            <span className="font-medium text-slate-500 dark:text-slate-400">{tDashboard("noBirthdaysIn14Days")}</span>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcomingList.map((item) => (
              <li
                key={item.teacher.id}
                className="py-3 first:pt-0 last:pb-0 flex items-center gap-3"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                    item.isToday
                      ? "bg-amber-600 text-white"
                      : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                  }`}
                >
                  {item.isToday ? (
                    <Cake strokeWidth={1.5} className="w-4 h-4" aria-hidden />
                  ) : (
                    item.teacher.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                    {item.teacher.name}
                    {item.turningAge && (
                      <span className="ml-1.5 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        {tDashboard("turningAge", { age: item.turningAge })}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.dateStr}
                    {" · "}
                    <span
                      className={
                        item.isToday
                          ? "font-semibold text-amber-700 dark:text-amber-400"
                          : "text-slate-600 dark:text-slate-300"
                      }
                    >
                      {item.isToday
                        ? tDashboard("todayBirthdayBadge")
                        : item.isTomorrow
                        ? tDashboard("tomorrowBadge")
                        : tDashboard("inDaysBadge", { days: item.daysUntil })}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {item.teacher.phone && (
                    <a
                      href={`tel:${item.teacher.phone}`}
                      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden"
                      title={`${tDashboard("callTeacher")}: ${item.teacher.phone}`}
                      aria-label={`${tDashboard("callTeacher")}: ${item.teacher.name}`}
                    >
                      <Phone strokeWidth={1.5} className="w-4 h-4" />
                    </a>
                  )}
                  {item.teacher.email && (
                    <a
                      href={`mailto:${item.teacher.email}?subject=${encodeURIComponent(tDashboard("birthdayMailSubject"))}`}
                      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden"
                      title={`${tDashboard("emailTeacher")}: ${item.teacher.email}`}
                      aria-label={`${tDashboard("emailTeacher")}: ${item.teacher.name}`}
                    >
                      <Mail strokeWidth={1.5} className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
