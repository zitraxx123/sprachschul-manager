"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createOrganization, OrgActionState } from "@/actions/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus, Loader2, AlertCircle } from "lucide-react";

export function CreateOrganizationCard() {
  const [state, formAction, isPending] = useActionState<OrgActionState | null, FormData>(
    createOrganization,
    null
  );
  const tDashboard = useTranslations("dashboard");

  return (
    <div className="max-w-xl mx-auto py-12">
      <Card className="border-blue-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="text-center pb-4">
          <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Building2 strokeWidth={1.5} className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {tDashboard("createOrgTitle")}
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {tDashboard("createOrgDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state?.error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-sm text-red-700 dark:text-red-300">
              <AlertCircle strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {tDashboard("createOrgPlaceholder")}
              </Label>
              <Input
                id="name"
                name="name"
                placeholder={tDashboard("createOrgPlaceholder")}
                defaultValue={tDashboard("defaultOrgName")}
                required
                disabled={isPending}
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold space-x-2" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" />
                  <span>{tDashboard("creatingOrg")}</span>
                </>
              ) : (
                <>
                  <Plus strokeWidth={1.5} className="w-5 h-5" />
                  <span>{tDashboard("createOrgButton")}</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
