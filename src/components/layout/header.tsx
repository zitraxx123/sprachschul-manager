import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { getTranslations } from "next-intl/server";

interface HeaderProps {
  organizationName: string;
  logoUrl?: string | null;
  userEmail?: string;
  userName?: string;
  isTeacher?: boolean;
}

export async function Header({
  organizationName,
  logoUrl,
  userEmail = "",
  userName = "",
  isTeacher = false,
}: HeaderProps) {
  const t = await getTranslations("common");

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 print:hidden transition-colors">
      <div className="flex items-center space-x-2 sm:space-x-2">
        <MobileNav
          organizationName={organizationName}
          logoUrl={logoUrl}
          userEmail={userEmail}
          userName={userName}
          isTeacher={isTeacher}
        />

        <div className="flex items-center space-x-2">
          <Building2 strokeWidth={1.5} className="w-4 h-4 text-slate-400 dark:text-slate-500 hidden sm:inline-block" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[180px] sm:max-w-none">
            {organizationName}
          </span>
          <Badge variant="success" className="text-[10px] sm:text-[11px] font-normal">
            {t("active")}
          </Badge>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 text-xs text-slate-400 dark:text-slate-500">
        <span className="hidden md:inline">
          {t("germanyGdpr")}
        </span>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
