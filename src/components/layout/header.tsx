import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  organizationName: string;
}

export function Header({ organizationName }: HeaderProps) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center space-x-2.5">
        <Building2 className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-800">{organizationName}</span>
        <Badge variant="success" className="text-[11px] font-normal">
          Aktiv
        </Badge>
      </div>

      <div className="flex items-center space-x-4">
        <span className="text-xs text-slate-400">
          Deutschland (DSGVO-konform)
        </span>
      </div>
    </header>
  );
}
