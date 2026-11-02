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
          <div className="space-y-2">
            {upcomingList.map((item) => (
              <div
                key={item.teacher.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all ${
                  item.isToday
                    ? "bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-white dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900 border-amber-300 dark:border-amber-800 shadow-sm ring-1 ring-amber-200 dark:ring-amber-950"
                    : item.isTomorrow
                    ? "bg-amber-50/40 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                    : "bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {/* Teacher Info */}
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                      item.isToday
                        ? "bg-amber-600 text-white"
                        : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    {item.isToday ? "🎂" : item.teacher.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                        {item.teacher.name}
                      </span>
                      {item.turningAge && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {tDashboard("turningAge", { age: item.turningAge })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2 mt-0.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{item.dateStr}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge & Quick Contact Actions */}
                <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div>
                    {item.isToday ? (
                      <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-bold text-xs px-2.5 py-1 shadow-sm animate-pulse">
                        {tDashboard("todayBirthdayBadge")}
                      </Badge>
                    ) : item.isTomorrow ? (
                      <Badge className="bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800 font-semibold text-xs">
                        {tDashboard("tomorrowBadge")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-white dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-xs">
                        {tDashboard("inDaysBadge", { days: item.daysUntil })}
                      </Badge>
                    )}
                  </div>

                  {/* Contact Links */}
                  <div className="flex items-center space-x-2">
                    {item.teacher.phone && (
                      <a
                        href={`tel:${item.teacher.phone}`}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 touch-manipulation"
                        title={`Tel: ${item.teacher.phone}`}
                        aria-label="Telefon"
                      >
                        <Phone strokeWidth={1.5} className="w-4 h-4" />
                      </a>
                    )}
                    {item.teacher.email && (
                      <a
                        href={`mailto:${item.teacher.email}?subject=Happy%20Birthday!`}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 touch-manipulation"
                        title={`E-Mail: ${item.teacher.email}`}
                        aria-label="E-Mail"
                      >
                        <Mail strokeWidth={1.5} className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
