"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Layers, 
  Users, 
  GraduationCap, 
  BookOpen, 
  UserX, 
  User, 
  LogOut,
  DoorOpen,
  HelpCircle,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/actions/auth";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useTranslations } from "next-intl";

interface MobileNavProps {
  organizationName: string;
  logoUrl?: string | null;
  userEmail: string;
  userName?: string;
  isTeacher?: boolean;
}

interface NavItemConfig {
  key: "dashboard" | "courses" | "students" | "teachers" | "lessons" | "absences" | "rooms" | "settings" | "help" | "myPortal";
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const adminNavItems: NavItemConfig[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "courses", href: "/courses", icon: Layers },
  { key: "students", href: "/students", icon: Users },
  { key: "teachers", href: "/teachers", icon: GraduationCap },
  { key: "lessons", href: "/lessons", icon: BookOpen },
  { key: "absences", href: "/absences", icon: UserX },
  { key: "rooms", href: "/rooms", icon: DoorOpen },
  { key: "settings", href: "/settings", icon: Settings },
  { key: "help", href: "/help", icon: HelpCircle },
];

const teacherNavItems: NavItemConfig[] = [
  { key: "myPortal", href: "/my-portal", icon: User },
  { key: "absences", href: "/absences", icon: UserX },
  { key: "help", href: "/help", icon: HelpCircle },
];

export function MobileNav({
  organizationName,
  logoUrl,
  userEmail,
  userName,
  isTeacher = false,
}: MobileNavProps) {
  const t = useTranslations("nav");
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const navItems = isTeacher ? teacherNavItems : adminNavItems;

  return (
    <div className="md:hidden">
      {/* Burger Button Trigger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-9 w-9 text-slate-700 dark:text-slate-200 hover:text-slate-900"
        aria-label="Menü öffnen"
      >
        <Menu strokeWidth={1.5} className="w-5 h-5" />
      </Button>

      {/* Slide-out Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white dark:bg-slate-900 h-full shadow-md flex flex-col z-10 animate-in slide-in-from-left duration-200 border-r border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <Logo size="sm" showText={false} logoUrl={logoUrl} />
                <div className="min-w-0 truncate">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                    {organizationName}
                  </h3>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {isTeacher ? t("roleTeacher") : t("roleAdmin")}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X strokeWidth={1.5} className="w-4 h-4" />
              </Button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.98] select-none touch-manipulation",
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold"
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

            {/* Footer with Language Switcher, User info & Logout */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 pb-safe space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sprache / Language:</span>
                <LanguageSwitcher variant="default" showGlobe={false} />
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 px-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {userName || userEmail}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {isTeacher ? t("roleTeacher") : t("roleAdmin")}
                </p>
              </div>

              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30/40 active:scale-95 transition-all select-none touch-manipulation cursor-pointer"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                  <span>{t("logout")}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
