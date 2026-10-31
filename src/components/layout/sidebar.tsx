"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  GraduationCap, 
  LogOut,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/actions/auth";

interface SidebarProps {
  organizationName: string;
  userEmail: string;
  userName?: string;
  isTeacher?: boolean;
}

const adminNavItems = [
  {
    title: "Übersicht",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Lehrkräfte",
    href: "/teachers",
    icon: Users,
  },
  {
    title: "Unterrichtsstunden",
    href: "/lessons",
    icon: BookOpen,
  },
];

const teacherNavItems = [
  {
    title: "Mein Portal",
    href: "/my-portal",
    icon: User,
  },
];

export function Sidebar({ organizationName, userEmail, userName, isTeacher }: SidebarProps) {
  const pathname = usePathname();
  const navItems = isTeacher ? teacherNavItems : adminNavItems;

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand / Organization Header */}
      <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="overflow-hidden">
          <h2 className="font-bold text-slate-900 truncate text-sm leading-tight">
            {organizationName || "Sprachschule"}
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {isTeacher ? "Dozenten-Portal" : "Schulleitung"}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="mb-3 px-2">
          <p className="text-xs font-semibold text-slate-700 truncate">
            {userName || userEmail}
          </p>
          <p className="text-[11px] text-slate-400">
            {isTeacher ? "Lehrkraft (Dozent)" : "Schulleitung"}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Abmelden</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
