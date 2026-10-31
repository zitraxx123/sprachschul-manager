"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Layers, 
  Users, 
  GraduationCap, 
  UserX,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  isTeacher?: boolean;
}

const adminTabs = [
  { title: "Übersicht", href: "/dashboard", icon: LayoutDashboard },
  { title: "Kurse", href: "/courses", icon: Layers },
  { title: "Schüler", href: "/students", icon: Users },
  { title: "Lehrer", href: "/teachers", icon: GraduationCap },
  { title: "Fehlzeiten", href: "/absences", icon: UserX },
];

const teacherTabs = [
  { title: "Wochenplan", href: "/my-portal", icon: Calendar },
  { title: "Fehlzeiten", href: "/absences", icon: UserX },
];

export function BottomNav({ isTeacher = false }: BottomNavProps) {
  const pathname = usePathname();
  const tabs = isTeacher ? teacherTabs : adminTabs;

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 pb-safe select-none shadow-[0_-4px_20px_rgba(0,0,0,0.04)] print:hidden transition-colors"
    >
      <div className="flex items-center justify-around h-14 max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/dashboard" && pathname.startsWith(`${tab.href}/`));
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center h-full py-1 px-1 transition-all duration-150 ease-out active:scale-95 touch-manipulation group",
                isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              <div 
                className={cn(
                  "p-1 rounded-xl transition-all duration-150",
                  isActive ? "bg-blue-50/80 dark:bg-blue-950/60 scale-105" : "group-active:scale-95"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.2px] text-blue-600 dark:text-blue-400" : "stroke-[1.8px]")} />
              </div>
              <span 
                className={cn(
                  "text-[10px] tracking-tight leading-tight mt-0.5",
                  isActive ? "font-bold text-blue-600 dark:text-blue-400" : "font-medium text-slate-500 dark:text-slate-400"
                )}
              >
                {tab.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
