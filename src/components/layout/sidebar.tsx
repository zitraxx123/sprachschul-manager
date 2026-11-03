"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  GraduationCap, 
  LogOut,
  User,
  Layers,
  UserX,
  DoorOpen,
  HelpCircle,
  Settings,
  Receipt,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/actions/auth";
import { Logo } from "@/components/ui/logo";
import { useTranslations } from "next-intl";

interface SidebarProps {
  organizationName: string;
  logoUrl?: string | null;
  userEmail: string;
  userName?: string;
  isTeacher?: boolean;
  isAssistant?: boolean;
}

interface NavItemConfig {
  key: "dashboard" | "courses" | "students" | "invoices" | "teachers" | "lessons" | "absences" | "rooms" | "settings" | "auditLog" | "help" | "myPortal";
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const adminNavItems: NavItemConfig[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "courses", href: "/courses", icon: Layers },
  { key: "students", href: "/students", icon: Users },
  { key: "invoices", href: "/invoices", icon: Receipt },
  { key: "teachers", href: "/teachers", icon: GraduationCap },
  { key: "lessons", href: "/lessons", icon: BookOpen },
  { key: "absences", href: "/absences", icon: UserX },
  { key: "rooms", href: "/rooms", icon: DoorOpen },
  { key: "settings", href: "/settings", icon: Settings },
  { key: "auditLog", href: "/audit-log", icon: History },
  { key: "help", href: "/help", icon: HelpCircle },
];

const teacherNavItems: NavItemConfig[] = [
  { key: "myPortal", href: "/my-portal", icon: User },
  { key: "absences", href: "/absences", icon: UserX },
  { key: "help", href: "/help", icon: HelpCircle },
];

const assistantNavItems: NavItemConfig[] = [
  { key: "courses", href: "/courses", icon: Layers },
  { key: "students", href: "/students", icon: Users },
  { key: "absences", href: "/absences", icon: UserX },
  { key: "rooms", href: "/rooms", icon: DoorOpen },
  { key: "help", href: "/help", icon: HelpCircle },
];

export function Sidebar({ organizationName, logoUrl, userEmail, userName, isTeacher, isAssistant }: SidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const navItems = isTeacher ? teacherNavItems : isAssistant ? assistantNavItems : adminNavItems;

  return (
    <aside className="hidden md:flex w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col h-screen sticky top-0 shrink-0 print:hidden transition-colors">
      {/* Brand / Organization Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-3">
        <Logo size="sm" showText={false} logoUrl={logoUrl} />
        <div className="overflow-hidden min-w-0">
          <h2 className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm leading-tight">
            {organizationName || "Sprachschule"}
          </h2>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block truncate">
            {isTeacher ? t("roleTeacher") : isAssistant ? t("roleAssistant") : t("roleAdmin")}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <Icon
                className={cn("w-5 h-5 shrink-0", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500")}
                strokeWidth={1.5}
              />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="mb-3 px-1">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
            {userName || userEmail}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {isTeacher ? t("roleTeacher") : isAssistant ? t("roleAssistant") : t("roleAdmin")}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            <span>{t("logout")}</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
