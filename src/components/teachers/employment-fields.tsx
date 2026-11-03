"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, IdCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmploymentFieldsProps {
  idPrefix: string;
  defaultType?: string | null;
  defaultTaxId?: string | null;
  disabled?: boolean;
}

/** Employment type + tax ID fields shared by the add / edit teacher dialogs (two grid cells). */
export function EmploymentFields({ idPrefix, defaultType, defaultTaxId, disabled }: EmploymentFieldsProps) {
  const t = useTranslations("teachers");

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_employment`} className="flex items-center space-x-2 text-xs font-semibold">
          <BadgeCheck strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
          <span>{t("employmentType")}</span>
        </Label>
        <select
          id={`${idPrefix}_employment`}
          name="employment_type"
          defaultValue={defaultType || "honorar"}
          disabled={disabled}
          className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:[color-scheme:dark]"
        >
          <option value="honorar">{t("employmentHonorar")}</option>
          <option value="minijob">{t("employmentMinijob")}</option>
          <option value="teilzeit">{t("employmentTeilzeit")}</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_tax_id`} className="flex items-center space-x-2 text-xs font-semibold">
          <IdCard strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
          <span>{t("taxId")}</span>
        </Label>
        <Input
          id={`${idPrefix}_tax_id`}
          name="tax_id"
          defaultValue={defaultTaxId || ""}
          inputMode="numeric"
          maxLength={20}
          disabled={disabled}
          className="font-mono"
        />
      </div>
    </>
  );
}
