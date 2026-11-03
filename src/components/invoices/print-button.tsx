"use client";

import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  const t = useTranslations("invoices");
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="h-10 bg-blue-600 hover:bg-blue-700 text-white space-x-2 print:hidden"
    >
      <Printer strokeWidth={1.5} className="w-4 h-4" />
      <span>{t("print")}</span>
    </Button>
  );
}
