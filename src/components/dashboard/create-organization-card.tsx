"use client";

import { useActionState } from "react";
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

  return (
    <div className="max-w-xl mx-auto py-12">
      <Card className="border-blue-200 bg-white shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Building2 className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Sprachschule anlegen
          </CardTitle>
          <CardDescription className="text-slate-500 max-w-md mx-auto">
            Sie haben aktuell noch keine Schule eingerichtet. Geben Sie den Namen Ihrer Sprachschule
            ein, um das System zu starten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state?.error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2.5 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700">
                Name der Sprachschule
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="z. B. Sprachschule Berlin Mitte"
                defaultValue="Meine Sprachschule"
                required
                disabled={isPending}
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold space-x-2" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Wird erstellt...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>Schule erstellen & starten</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
