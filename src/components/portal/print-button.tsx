"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <Button
      onClick={() => window.print()}
      variant="outline"
      className="space-x-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-sm print:hidden"
    >
      <Printer strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      <span className="font-medium">PDF herunterladen / Drucken</span>
    </Button>
  );
}
