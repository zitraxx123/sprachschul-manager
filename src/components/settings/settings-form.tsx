"use client";

import { useActionState, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { updateOrganizationSettings, OrgActionState } from "@/actions/organizations";
import { Organization } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { 
  Building2, 
  CalendarClock, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  HelpCircle,
  UploadCloud,
  Trash2,
  GraduationCap
} from "lucide-react";

interface SettingsFormProps {
  organization: Organization;
}

export function SettingsForm({ organization }: SettingsFormProps) {
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");

  const [previewUrl, setPreviewUrl] = useState<string | null>(organization.logo_url || null);
  const [isLogoRemoved, setIsLogoRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, isPending] = useActionState<OrgActionState | null, FormData>(
    async (prev, formData) => {
      const res = await updateOrganizationSettings(prev, formData);
      if (res?.success) {
        toast.success(tSettings("settingsSavedSuccess"));
      } else if (res?.error) {
        toast.error(res.error);
      }
      return res;
    },
    null
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(tSettings("imageTooLarge"));
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setIsLogoRemoved(false);
    }
  }

  function handleRemoveLogo() {
    setPreviewUrl(null);
    setIsLogoRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const defaultHours = organization.late_cancellation_hours ?? 24;
  const defaultPercent = organization.late_cancellation_pay_percent ?? 50;

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
          <AlertCircle strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      {state?.success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center space-x-2 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
          <CheckCircle2 strokeWidth={1.5} className="w-4 h-4 shrink-0" />
          <span>{tSettings("settingsSavedSuccess")}</span>
        </div>
      )}

      {/* 1. Schulprofil (School Profile & White-Label Logo) */}
      <Card>
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Building2 strokeWidth={1.5} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {tSettings("schoolProfileTitle")}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tSettings("schoolProfileDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* School Name */}
          <div className="space-y-2 max-w-md">
            <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tSettings("schoolNameLabel")}
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={organization.name}
              required
              disabled={isPending}
              className="h-10 text-sm"
            />
          </div>

          {/* School Logo (White-Label) */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {tSettings("schoolLogoLabel")}
              </Label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {tSettings("logoHelp")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Logo Preview Box */}
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                {previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewUrl}
                    alt={organization.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-1">
                    <GraduationCap strokeWidth={1.5} className="w-8 h-8 mb-1 text-slate-300 dark:text-slate-600" />
                    <span className="text-[9px] font-medium text-center leading-tight">
                      {tSettings("noLogoYet")}
                    </span>
                  </div>
                )}
              </div>

              {/* Upload & Remove Controls */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="logo"
                  name="logo"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  disabled={isPending}
                  className="hidden"
                />
                <input
                  type="hidden"
                  name="remove_logo"
                  value={isLogoRemoved ? "true" : "false"}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                    className="space-x-2 h-9 text-xs"
                  >
                    <UploadCloud strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>{previewUrl ? tSettings("changeLogo") : tSettings("uploadLogo")}</span>
                  </Button>

                  {previewUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={isPending}
                      className="h-9 px-2.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 strokeWidth={1.5} className="w-4 h-4 mr-1" />
                      <span>{tSettings("removeLogo")}</span>
                    </Button>
                  )}
                </div>

                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                  PNG, JPG, WebP, SVG • max. 5 MB
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Cancellation Rules (Stornierungsregeln) Card */}
      <Card className="border-blue-200/80 dark:border-slate-800">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <CalendarClock strokeWidth={1.5} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {tSettings("cancellationRulesTitle")}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tSettings("cancellationRulesDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Field 1: Kostenfreie Stornierung bis (Stunden) vorher */}
            <div className="space-y-2">
              <Label 
                htmlFor="late_cancellation_hours" 
                className="text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                {tSettings("freeCancellationHoursLabel")}
              </Label>
              <div className="relative">
                <Input
                  id="late_cancellation_hours"
                  name="late_cancellation_hours"
                  type="number"
                  min="0"
                  max="168"
                  defaultValue={defaultHours}
                  required
                  disabled={isPending}
                  className="h-10 text-sm pr-12 font-mono"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {tSettings("hoursUnit")}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {tSettings("freeCancellationHoursHelp")}
              </p>
            </div>

            {/* Field 2: Honorar bei später Absage (%) */}
            <div className="space-y-2">
              <Label 
                htmlFor="late_cancellation_pay_percent" 
                className="text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                {tSettings("lateCancellationFeePercentLabel")}
              </Label>
              <div className="relative">
                <Input
                  id="late_cancellation_pay_percent"
                  name="late_cancellation_pay_percent"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={defaultPercent}
                  required
                  disabled={isPending}
                  className="h-10 text-sm pr-10 font-mono"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {tSettings("lateCancellationFeePercentHelp")}
              </p>
            </div>
          </div>

          {/* Business rule info explanation box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start space-x-3 text-xs text-slate-600 dark:text-slate-300">
            <HelpCircle strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {tSettings("cancellationRulesTitle")}
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                <li>
                  {tSettings("freeCancellationHoursHelp")}
                </li>
                <li>
                  {tSettings("lateCancellationFeePercentHelp")}
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white space-x-2 px-6 h-10 shadow-sm"
        >
          {isPending ? (
            <>
              <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" />
              <span>{tCommon("saving")}</span>
            </>
          ) : (
            <>
              <Save strokeWidth={1.5} className="w-4 h-4" />
              <span>{tSettings("saveChanges")}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
