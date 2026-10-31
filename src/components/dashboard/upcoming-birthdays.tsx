"use client";

import { useMemo } from "react";
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
        const formattedDate = nextBday.toLocaleDateString("de-DE", {
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
  }, [teachers]);

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden bg-white dark:bg-slate-900">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Cake className="w-4 h-4" />
            </div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Baldige Geburtstage
            </CardTitle>
          </div>
          <CardDescription className="mt-1 text-slate-500 dark:text-slate-400 text-xs">
            Lehrkräfte mit Geburtstag in den nächsten 14 Tagen
          </CardDescription>
        </div>

        {upcomingList.length > 0 && (
          <Badge className="bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-bold text-xs space-x-1">
            <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>{upcomingList.length} anstehend</span>
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {upcomingList.length === 0 ? (
          <div className="py-3 text-center text-slate-400 dark:text-slate-500 text-xs flex items-center justify-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            <span className="font-medium text-slate-500 dark:text-slate-400">Keine Geburtstage in den nächsten 14 Tagen</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingList.map((item) => (
              <div
                key={item.teacher.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all ${
                  item.isToday
                    ? "bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-white dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900 border-amber-300 dark:border-amber-800 shadow-xs ring-1 ring-amber-200 dark:ring-amber-950"
                    : item.isTomorrow
                    ? "bg-amber-50/40 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                    : "bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {/* Teacher Info */}
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                      item.isToday
                        ? "bg-amber-500 text-white"
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
                          (wird {item.turningAge})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2 mt-0.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{item.dateStr}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge & Quick Contact Actions */}
                <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div>
                    {item.isToday ? (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-2.5 py-1 shadow-xs animate-pulse">
                        🎉 Heute Geburtstag!
                      </Badge>
                    ) : item.isTomorrow ? (
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-semibold text-xs">
                        Morgen
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-white dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-xs">
                        In {item.daysUntil} Tagen
                      </Badge>
                    )}
                  </div>

                  {/* Contact Links */}
                  <div className="flex items-center space-x-1.5">
                    {item.teacher.phone && (
                      <a
                        href={`tel:${item.teacher.phone}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 touch-manipulation"
                        title={`Anrufen: ${item.teacher.phone}`}
                        aria-label="Telefon"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    {item.teacher.email && (
                      <a
                        href={`mailto:${item.teacher.email}?subject=Herzlichen%20Glückwunsch%20zum%20Geburtstag!`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 touch-manipulation"
                        title={`Gratulieren per E-Mail: ${item.teacher.email}`}
                        aria-label="E-Mail"
                      >
                        <Mail className="w-4 h-4" />
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
