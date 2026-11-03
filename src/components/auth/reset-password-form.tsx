"use client";

import { useActionState } from "react";
import { updatePassword, AuthState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const [state, action, isPending] = useActionState<AuthState | null, FormData>(
    updatePassword,
    null
  );

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm mb-3">
          <KeyRound strokeWidth={1.5} className="w-6 h-6" />
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
            {t("resetTitle")}
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            {t("resetDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state?.error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-sm text-red-700 dark:text-red-300">
              <AlertCircle strokeWidth={1.5} className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{t(state.error)}</span>
            </div>
          )}

          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                <Lock strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                <span>{t("newPassword")}</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                <Lock strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                <span>{t("confirmPassword")}</span>
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 strokeWidth={1.5} className="w-4 h-4 mr-2 animate-spin" />
                  {t("resetSaving")}
                </>
              ) : (
                t("resetButton")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
